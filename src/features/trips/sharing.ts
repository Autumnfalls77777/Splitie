import { requireSupabase } from '@/lib/supabase';

export type ClaimMember = {
  id: string;
  displayName: string;
  color: string;
};

type ClaimMemberRow = {
  id: string;
  display_name: string;
  color: string;
};

type PreviewRow = {
  trip_id: string;
  trip_name: string;
  host_name: string;
  member_count: number;
  unclaimed_members: ClaimMemberRow[] | null;
  already_member: boolean;
};

type JoinRow = {
  trip_id: string;
  trip_name: string;
  host_name: string;
  already_member: boolean;
};

type PendingInviteRow = {
  invite_id: string;
  trip_id: string;
  trip_name: string;
  host_name: string;
  member_count: number;
  start_date: string;
  end_date: string;
  created_at: string;
  unclaimed_members: ClaimMemberRow[] | null;
};

type RespondRow = {
  trip_id: string;
  trip_name: string;
};

type TripInviteRow = {
  id: string;
  invited_email: string;
  invited_by: string;
  status: string;
  created_at: string;
};

type PaymentReminderRow = {
  recipient_id: string;
  amount_paise: number;
  created_at: string;
};

export type TripPreview = {
  tripId: string;
  tripName: string;
  hostName: string;
  memberCount: number;
  unclaimedMembers: ClaimMember[];
  alreadyMember: boolean;
};

export type JoinResult = {
  tripId: string;
  tripName: string;
  hostName: string;
  alreadyMember: boolean;
};

export type PendingInvite = {
  inviteId: string;
  tripId: string;
  tripName: string;
  hostName: string;
  memberCount: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  unclaimedMembers: ClaimMember[];
};

export type TripInvite = {
  id: string;
  email: string;
  invitedBy: string;
  status: string;
  createdAt: string;
};

export type PaymentReminderHistoryEntry = {
  recipientUserId: string;
  amountPaise: number;
  createdAt: string;
};

export type ReminderRecipientInput = {
  userId: string;
  amountPaise: number;
};

export type PushSkipped = {
  user_id: string;
  reason: string;
};

export type PushResult = {
  ok: boolean;
  sent: number;
  skipped: PushSkipped[];
  delivered?: boolean;
};

/**
 * Server errors are terse. Map the known ones to copy that does not reveal
 * whether a code, email, or invite exists.
 */
export function friendlySharingError(message: string | undefined): string {
  const text = (message ?? '').toLowerCase();
  if (text.includes('too_many_attempts')) return 'Too many tries. Wait a few minutes and try again.';
  if (text.includes('invalid_code')) return 'That code did not work. Check it and try again.';
  if (text.includes('claim_unavailable')) return 'That name was already claimed. Pick someone else.';
  if (text.includes('rate_limited')) return 'Too many requests. Try again in a little while.';
  if (text.includes('invalid_email')) return 'Enter a valid email address.';
  if (text.includes('invite_unavailable')) return 'That invite is no longer available.';
  if (text.includes('not_member')) return 'You are not a member of this trip.';
  if (text.includes('verified_email')) return 'Sign in with Google to use invites.';
  if (text.includes('host_only')) return 'Only the trip host can do that.';
  if (text.includes('not_authenticated')) return 'Sign in again to continue.';
  return message || 'Something went wrong. Try again.';
}

function fail(error: { message?: string } | null): never {
  throw new Error(friendlySharingError(error?.message));
}

function asRow<T>(data: T[] | T | null): T | null {
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return (data as T | null) ?? null;
}

function mapClaimMembers(rows: ClaimMemberRow[] | null | undefined): ClaimMember[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    color: row.color,
  }));
}

export async function previewTripByCode(code: string): Promise<TripPreview> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('preview_trip_by_code', { p_code: code });
  if (error) fail(error);
  const row = asRow(data as PreviewRow[] | PreviewRow | null);
  if (!row) throw new Error('That code did not work. Check it and try again.');
  return {
    tripId: row.trip_id,
    tripName: row.trip_name,
    hostName: row.host_name,
    memberCount: row.member_count,
    unclaimedMembers: mapClaimMembers(row.unclaimed_members),
    alreadyMember: row.already_member,
  };
}

export async function joinTripByCode(
  code: string,
  claimMemberId: string | null,
): Promise<JoinResult> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('join_trip_by_code', {
    p_code: code,
    p_claim_member_id: claimMemberId,
  });
  if (error) fail(error);
  const row = asRow(data as JoinRow[] | JoinRow | null);
  if (!row) throw new Error('Could not join that trip. Try again.');
  return {
    tripId: row.trip_id,
    tripName: row.trip_name,
    hostName: row.host_name,
    alreadyMember: row.already_member,
  };
}

export async function getMyPendingInvites(): Promise<PendingInvite[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_my_pending_invites');
  if (error) fail(error);
  return ((data ?? []) as PendingInviteRow[]).map((row) => ({
    inviteId: row.invite_id,
    tripId: row.trip_id,
    tripName: row.trip_name,
    hostName: row.host_name,
    memberCount: row.member_count,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    unclaimedMembers: mapClaimMembers(row.unclaimed_members),
  }));
}

export async function respondToInvite(
  inviteId: string,
  accept: boolean,
  claimMemberId: string | null,
): Promise<JoinResult> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('respond_to_invite', {
    p_invite_id: inviteId,
    p_accept: accept,
    p_claim_member_id: claimMemberId,
  });
  if (error) fail(error);
  const row = asRow(data as RespondRow[] | RespondRow | null);
  if (!row) throw new Error('That invite is no longer available.');
  return {
    tripId: row.trip_id,
    tripName: row.trip_name,
    hostName: '',
    alreadyMember: false,
  };
}

export async function inviteToTrip(tripId: string, email: string): Promise<string | null> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('invite_to_trip', {
    p_trip_id: tripId,
    p_email: email,
  });
  if (error) fail(error);
  return typeof data === 'string' ? data : null;
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('cancel_invite', { p_invite_id: inviteId });
  if (error) fail(error);
}

export async function regenerateJoinCode(tripId: string): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('regenerate_join_code', { p_trip_id: tripId });
  if (error) fail(error);
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Could not create a new code. Try again.');
  }
  return data;
}

export async function fetchTripJoinCode(tripId: string): Promise<string | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('trips')
    .select('join_code')
    .eq('id', tripId)
    .maybeSingle();
  if (error) fail(error);
  return typeof data?.join_code === 'string' ? data.join_code : null;
}

export async function getTripInvites(tripId: string): Promise<TripInvite[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('trip_invites')
    .select('id, invited_email, invited_by, status, created_at')
    .eq('trip_id', tripId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) fail(error);
  return ((data ?? []) as TripInviteRow[]).map((row) => ({
    id: row.id,
    email: row.invited_email,
    invitedBy: row.invited_by,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getPaymentReminderHistory(
  tripId: string,
  senderId: string,
): Promise<PaymentReminderHistoryEntry[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('payment_reminders')
    .select('recipient_id, amount_paise, created_at')
    .eq('trip_id', tripId)
    .eq('sender_id', senderId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) fail(error);
  return ((data ?? []) as PaymentReminderRow[]).map((row) => ({
    recipientUserId: row.recipient_id,
    amountPaise: Number(row.amount_paise),
    createdAt: row.created_at,
  }));
}

export async function sendPaymentReminderPush(
  tripId: string,
  recipients: ReminderRecipientInput[],
): Promise<PushResult> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('send-push', {
    body: {
      type: 'payment_reminder',
      trip_id: tripId,
      recipients: recipients.map((recipient) => ({
        user_id: recipient.userId,
        amount_paise: recipient.amountPaise,
      })),
    },
  });
  if (error) fail(error);
  return data as PushResult;
}

export async function sendTripInvitePush(inviteId: string): Promise<PushResult> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('send-push', {
    body: { type: 'trip_invite', invite_id: inviteId },
  });
  if (error) fail(error);
  return data as PushResult;
}
