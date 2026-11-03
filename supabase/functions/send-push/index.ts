// Splitie push delivery
//
// Deploy with: supabase functions deploy send-push
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// Supabase. Do not create them as project secrets and never ship the service
// role key in the app.
//
// Trust trade-off: the app computes the suggested transfer amounts. This
// function validates that each amount is a positive integer no larger than the
// trip's total expenses, and that both people are trip members. It does not
// recompute the settle-up graph, so a member could nudge another member for a
// smaller amount than they actually owe. That is documented in the README.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const COOLDOWN_MS = 6 * 60 * 60 * 1000;
const INVITE_NOTIFY_COOLDOWN_MS = 10 * 60 * 1000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AdminClient = ReturnType<typeof createClient>;
type Caller = { id: string; email?: string };

type RecipientInput = {
  user_id?: string;
  amount_paise?: number;
};

type RequestBody = {
  type?: string;
  trip_id?: string;
  recipients?: RecipientInput[];
  invite_id?: string;
};

type Skipped = {
  user_id: string;
  reason: string;
};

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: 'default';
  channelId: 'settlements';
  priority: 'high';
};

type PushTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function formatMoney(paise: number, currency: string): string {
  const amount = paise / 100;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

async function sendPush(admin: AdminClient, messages: ExpoMessage[]): Promise<number> {
  if (messages.length === 0) return 0;

  let sent = 0;
  const invalidTokens: string[] = [];

  for (const batch of chunk(messages, 100)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      console.error('expo push request failed', response.status, await response.text());
      continue;
    }

    const payload = (await response.json()) as { data?: PushTicket | PushTicket[] };
    const tickets = Array.isArray(payload.data)
      ? payload.data
      : payload.data
        ? [payload.data]
        : [];

    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        sent += 1;
        return;
      }
      if (ticket.details?.error === 'DeviceNotRegistered') {
        const token = batch[index]?.to;
        if (token) invalidTokens.push(token);
      }
    });
  }

  if (invalidTokens.length > 0) {
    await admin.from('push_tokens').delete().in('token', invalidTokens);
  }

  return sent;
}

async function handlePaymentReminder(
  admin: AdminClient,
  caller: Caller,
  body: RequestBody,
): Promise<Response> {
  const tripId = text(body.trip_id);
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];

  if (!tripId) return json(400, { error: 'trip_id_required' });
  if (recipients.length === 0) return json(400, { error: 'recipients_required' });
  if (recipients.length > 50) return json(400, { error: 'too_many_recipients' });

  const { data: callerMember, error: callerError } = await admin
    .from('trip_members')
    .select('id, display_name')
    .eq('trip_id', tripId)
    .eq('user_id', caller.id)
    .maybeSingle();
  if (callerError) return json(500, { error: 'lookup_failed' });
  if (!callerMember) return json(403, { error: 'not_member' });

  const { data: trip, error: tripError } = await admin
    .from('trips')
    .select('id, name, currency')
    .eq('id', tripId)
    .maybeSingle();
  if (tripError) return json(500, { error: 'lookup_failed' });
  if (!trip) return json(404, { error: 'trip_not_found' });

  const { data: expenseRows, error: expenseError } = await admin
    .from('expenses')
    .select('amount_paise')
    .eq('trip_id', tripId);
  if (expenseError) return json(500, { error: 'lookup_failed' });

  const totalPaise = (expenseRows ?? []).reduce(
    (total, row) => total + Number(row.amount_paise ?? 0),
    0,
  );

  // Validate everything before writing any reminder rows.
  const normalized = new Map<string, number>();
  for (const recipient of recipients) {
    const userId = text(recipient.user_id);
    const amountPaise = Number(recipient.amount_paise);

    if (!UUID_RE.test(userId)) return json(400, { error: 'invalid_recipient' });
    if (
      !Number.isInteger(amountPaise) ||
      amountPaise <= 0 ||
      amountPaise > totalPaise
    ) {
      return json(400, { error: 'invalid_amount' });
    }

    normalized.set(userId, amountPaise);
  }

  const recipientIds = [...normalized.keys()];
  const { data: memberRows, error: memberError } = await admin
    .from('trip_members')
    .select('id, user_id, display_name')
    .eq('trip_id', tripId)
    .in('user_id', recipientIds);
  if (memberError) return json(500, { error: 'lookup_failed' });

  const memberByUser = new Map(
    (memberRows ?? []).map((row) => [row.user_id as string, row]),
  );

  const since = new Date(Date.now() - COOLDOWN_MS).toISOString();
  const { data: recentRows, error: recentError } = await admin
    .from('payment_reminders')
    .select('recipient_id')
    .eq('trip_id', tripId)
    .eq('sender_id', caller.id)
    .gte('created_at', since);
  if (recentError) return json(500, { error: 'lookup_failed' });

  const recent = new Set((recentRows ?? []).map((row) => row.recipient_id as string));
  const skipped: Skipped[] = [];
  const eligible: Array<{
    userId: string;
    amountPaise: number;
    recipientName: string;
  }> = [];

  for (const [userId, amountPaise] of normalized) {
    if (userId === caller.id) {
      skipped.push({ user_id: userId, reason: 'self' });
      continue;
    }

    const member = memberByUser.get(userId);
    if (!member) {
      skipped.push({ user_id: userId, reason: 'not_member' });
      continue;
    }
    if (recent.has(userId)) {
      skipped.push({ user_id: userId, reason: 'cooldown' });
      continue;
    }

    eligible.push({
      userId,
      amountPaise,
      recipientName: text(member.display_name) || 'there',
    });
  }

  if (eligible.length === 0) {
    return json(200, { ok: true, sent: 0, skipped });
  }

  const { data: tokenRows, error: tokenError } = await admin
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', eligible.map((item) => item.userId));
  if (tokenError) return json(500, { error: 'token_lookup_failed' });

  const tokensByUser = new Map<string, string[]>();
  for (const row of tokenRows ?? []) {
    const userId = row.user_id as string;
    const token = text(row.token);
    if (!token) continue;
    const tokens = tokensByUser.get(userId) ?? [];
    tokens.push(token);
    tokensByUser.set(userId, tokens);
  }

  const senderName = text(callerMember.display_name) || 'Someone';
  const tripName = text(trip.name) || 'your trip';
  const currency = text(trip.currency) || 'INR';

  const toSend: ExpoMessage[] = [];

  for (const item of eligible) {
    const tokens = tokensByUser.get(item.userId) ?? [];
    if (tokens.length === 0) {
      skipped.push({ user_id: item.userId, reason: 'no_push_token' });
      continue;
    }

    const { error: insertError } = await admin.from('payment_reminders').insert({
      trip_id: tripId,
      sender_id: caller.id,
      recipient_id: item.userId,
      amount_paise: item.amountPaise,
    });
    if (insertError) {
      if (String(insertError.message).includes('reminder_cooldown')) {
        skipped.push({ user_id: item.userId, reason: 'cooldown' });
      } else {
        console.error('reminder insert failed', insertError);
        skipped.push({ user_id: item.userId, reason: 'error' });
      }
      continue;
    }

    for (const token of tokens) {
      toSend.push({
        to: token,
        title: `Payment reminder from ${senderName}`,
        body: `Hey ${item.recipientName}, you owe ${senderName} ${formatMoney(item.amountPaise, currency)} for ${tripName}. Pay up and settle in Splitie.`,
        data: { type: 'payment_reminder', tripId },
        sound: 'default',
        channelId: 'settlements',
        priority: 'high',
      });
    }
  }

  const sent = await sendPush(admin, toSend);
  return json(200, { ok: true, sent, skipped });
}

async function handleTripInvite(
  admin: AdminClient,
  caller: Caller,
  body: RequestBody,
): Promise<Response> {
  const inviteId = text(body.invite_id);
  if (!UUID_RE.test(inviteId)) return json(400, { error: 'invalid_invite' });

  // Every non-error outcome looks identical to the caller, so the response
  // never reveals whether an account exists for the invited email.
  const quiet = (reason: string): Response => {
    console.log('send-push invite', reason);
    return json(200, { ok: true });
  };

  const { data: invite, error: inviteError } = await admin
    .from('trip_invites')
    .select('id, trip_id, invited_email, invited_by, status, notified_at')
    .eq('id', inviteId)
    .maybeSingle();
  if (inviteError) return json(500, { error: 'lookup_failed' });
  if (!invite || invite.status !== 'pending') {
    return json(404, { error: 'invite_unavailable' });
  }

  const { data: trip, error: tripError } = await admin
    .from('trips')
    .select('id, name, created_by')
    .eq('id', invite.trip_id)
    .maybeSingle();
  if (tripError) return json(500, { error: 'lookup_failed' });
  if (!trip) return json(404, { error: 'trip_not_found' });

  if (invite.invited_by !== caller.id && trip.created_by !== caller.id) {
    return json(403, { error: 'not_allowed' });
  }

  if (invite.notified_at) {
    const lastNotified = new Date(invite.notified_at).getTime();
    if (
      Number.isFinite(lastNotified) &&
      Date.now() - lastNotified < INVITE_NOTIFY_COOLDOWN_MS
    ) {
      return quiet('already_notified');
    }
  }

  const { data: inviteeId, error: inviteeError } = await admin.rpc(
    'find_user_id_by_email',
    { p_email: text(invite.invited_email) },
  );
  if (inviteeError) return json(500, { error: 'lookup_failed' });
  if (!inviteeId) return quiet('no_account');

  const { data: existingMember } = await admin
    .from('trip_members')
    .select('id')
    .eq('trip_id', invite.trip_id)
    .eq('user_id', inviteeId)
    .maybeSingle();
  if (existingMember) return quiet('already_member');

  const { data: hostMember } = await admin
    .from('trip_members')
    .select('display_name')
    .eq('trip_id', invite.trip_id)
    .eq('user_id', trip.created_by)
    .maybeSingle();

  const { data: hostProfile } = await admin
    .from('profiles')
    .select('name')
    .eq('id', trip.created_by)
    .maybeSingle();

  const hostName =
    text(hostMember?.display_name) || text(hostProfile?.name) || 'Someone';
  const tripName = text(trip.name) || 'a trip';

  const { data: tokenRows, error: tokenError } = await admin
    .from('push_tokens')
    .select('token')
    .eq('user_id', inviteeId);
  if (tokenError) return json(500, { error: 'token_lookup_failed' });

  const tokens = (tokenRows ?? [])
    .map((row) => text(row.token))
    .filter((token): token is string => token.length > 0);
  if (tokens.length === 0) return quiet('no_push_token');

  const messages: ExpoMessage[] = tokens.map((token): ExpoMessage => ({
    to: token,
    title: `${hostName} invited you to ${tripName}`,
    body: 'Tap to view and accept.',
    data: { type: 'trip_invite', inviteId },
    sound: 'default',
    channelId: 'settlements',
    priority: 'high',
  }));

  const sent = await sendPush(admin, messages);

  await admin
    .from('trip_invites')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', invite.id);

  console.log('send-push invite sent', sent);
  return json(200, { ok: true });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (request.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(500, { error: 'server_not_configured' });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authorization = request.headers.get('Authorization') ?? '';
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json(401, { error: 'unauthorized' });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json(401, { error: 'unauthorized' });

    const body = (await request.json()) as RequestBody;

    if (body.type === 'payment_reminder') {
      return await handlePaymentReminder(admin, userData.user, body);
    }
    if (body.type === 'trip_invite') {
      return await handleTripInvite(admin, userData.user, body);
    }

    return json(400, { error: 'unknown_type' });
  } catch (error) {
    console.error('send-push failed', error);
    return json(500, { error: 'internal_error' });
  }
});
