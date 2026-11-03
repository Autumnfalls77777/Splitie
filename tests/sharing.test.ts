import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => ({ rpc }),
}));

import { resolveClaimMemberId, unclaimedMembers } from '@/features/trips/claims';
import { findYouMember, isYouMember } from '@/features/trips/identity';
import { joinTripByCode, previewTripByCode } from '@/features/trips/sharing';
import { computeTripSummary, equalSplits, expenseYourShare } from '@/features/trips/split';
import {
  memberToRow,
  rowToMember,
  tripToRow,
  type TripMemberRow,
} from '@/features/sync/mappers';
import {
  JOIN_CODE_ALPHABET,
  generateJoinCode,
  isValidJoinCode,
  normalizeJoinCode,
} from '@/lib/join-code';
import { isValidInviteEmail, normalizeInviteEmail } from '@/lib/invite-email';
import {
  PAYMENT_REMINDER_COOLDOWN_MS,
  buildReminderCandidates,
  canSendPaymentReminder,
  owedToMeByMember,
  selectDefaultReminderRecipients,
} from '@/lib/payment-reminder';
import type { Expense, Member, SuggestedTransfer, Trip } from '@/types/models';

const you: Member = { id: 'u_you', name: 'You', color: '#C9F25B', userId: 'u_you', isYou: true };
const ben: Member = { id: 'mem_ben', name: 'Ben', color: '#FFD166', userId: 'u_ben' };
const chen: Member = { id: 'mem_chen', name: 'Chen', color: '#8ECAE6' };
const dev: Member = { id: 'mem_dev', name: 'Dev', color: '#FF8FAB', userId: 'u_dev' };

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    name: 'Goa',
    destination: 'Goa',
    emoji: '🏖️',
    cover: 'ocean',
    startDate: '2026-03-01',
    endDate: '2026-03-03',
    members: [you, ben, chen],
    createdBy: 'u_you',
    createdAt: '2026-02-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    tripId: 'trip-1',
    title: 'Dinner',
    amountPaise: 1000,
    category: 'food',
    paidBy: 'mem_ben',
    date: '2026-03-01',
    splitType: 'equal',
    splits: equalSplits(1000, ['u_you', 'mem_ben', 'mem_chen']),
    createdAt: '2026-03-01T10:00:00.000Z',
    ...overrides,
  };
}

function transfer(from: Member, to: Member, amountPaise: number): SuggestedTransfer {
  return { from, to, amountPaise };
}

describe('join codes', () => {
  it('normalizes to uppercase letters and drops punctuation and digits', () => {
    expect(normalizeJoinCode(' ab-c12o ')).toBe('ABCO');
    expect(normalizeJoinCode('goa 2026')).toBe('GOA');
  });

  it('accepts only six letters from the server alphabet', () => {
    expect(JOIN_CODE_ALPHABET).not.toContain('I');
    expect(JOIN_CODE_ALPHABET).not.toContain('O');
    expect(isValidJoinCode('ABCDEF')).toBe(true);
    expect(isValidJoinCode('ABCDEI')).toBe(false);
    expect(isValidJoinCode('ABCDE1')).toBe(false);
    expect(isValidJoinCode('ABCDE')).toBe(false);
  });

  it('generates a deterministic six-character code from the alphabet', () => {
    const code = generateJoinCode(() => false, () => 0);
    expect(code).toBe('AAAAAA');
    expect(isValidJoinCode(code)).toBe(true);
  });

  it('retries when a candidate is already taken', () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return calls <= 6 ? 0 : 1 / JOIN_CODE_ALPHABET.length;
    };
    const code = generateJoinCode((candidate) => candidate === 'AAAAAA', random, 2);
    expect(code).toBe('BBBBBB');
  });

  it('gives up after the maximum number of attempts', () => {
    expect(() => generateJoinCode(() => true, () => 0, 3)).toThrow(
      'Could not generate a unique join code.',
    );
  });
});

describe('invite emails', () => {
  it('normalizes case and surrounding whitespace', () => {
    expect(normalizeInviteEmail('  Aarav@Example.COM ')).toBe('aarav@example.com');
  });

  it('accepts normal addresses and rejects malformed ones', () => {
    expect(isValidInviteEmail('aarav@splitie.app')).toBe(true);
    expect(isValidInviteEmail('aarav+trips@splitie.co.in')).toBe(true);
    expect(isValidInviteEmail('aarav@')).toBe(false);
    expect(isValidInviteEmail('aarav splitie@example.com')).toBe(false);
    expect(isValidInviteEmail('')).toBe(false);
    expect(isValidInviteEmail(`${'a'.repeat(250)}@x.com`)).toBe(false);
  });
});

describe('identity', () => {
  it('prefers the linked auth user id over a stale isYou flag', () => {
    const stale: Member = { id: 'mem_stale', name: 'Stale', color: '#fff', isYou: true, userId: 'u_ben' };
    expect(isYouMember(stale, 'u_you')).toBe(false);
    expect(isYouMember(stale, 'u_ben')).toBe(true);
  });

  it('falls back to the creator row id before the first sync', () => {
    const localOwner: Member = {
      id: 'u_you',
      name: 'You',
      color: '#fff',
      userId: 'u_you',
      isYou: true,
    };
    expect(isYouMember(localOwner, 'u_you')).toBe(true);
    expect(isYouMember(localOwner, 'u_ben')).toBe(false);

    const legacyCreator: Member = { id: 'u_legacy', name: 'You', color: '#fff', isYou: true };
    expect(isYouMember(legacyCreator, 'u_legacy')).toBe(true);
  });

  it('findYouMember returns the row linked to the signed-in user', () => {
    const joined: Member = { id: 'mem_joined', name: 'You', color: '#fff', userId: 'u_joined' };
    expect(findYouMember([you, joined], 'u_joined')?.id).toBe('mem_joined');
  });
});

describe('rowToMember', () => {
  const baseRow: TripMemberRow = {
    id: 'mem_joined',
    trip_id: 'trip-1',
    user_id: 'u_joined',
    display_name: 'Asha',
    email: 'asha@example.com',
    color: '#C9F25B',
    is_you: true,
    created_at: '2026-03-01T00:00:00.000Z',
  };

  it('ignores the legacy is_you flag when user_id does not match', () => {
    const member = rowToMember(baseRow, 'u_someone_else');
    expect(member.isYou).toBe(false);
    expect(member.userId).toBe('u_joined');
  });

  it('marks the row as you only when user_id matches', () => {
    expect(rowToMember(baseRow, 'u_joined').isYou).toBe(true);
  });

  it('does not trust is_you on a name-only row', () => {
    const member = rowToMember({ ...baseRow, user_id: null, is_you: true }, 'u_joined');
    expect(member.isYou).toBe(false);
    expect(member.userId).toBeUndefined();
  });
});

describe('claim picker', () => {
  it('offers only rows nobody has claimed', () => {
    const ids = unclaimedMembers([you, ben, chen, dev]).map((member) => member.id);
    expect(ids).toEqual(['mem_chen']);
  });

  it('lets a verified email win over an explicit pick', () => {
    const emailMember: Member = {
      id: 'mem_email',
      name: 'Asha',
      color: '#fff',
      email: 'Asha@Example.com',
    };
    expect(
      resolveClaimMemberId([emailMember, chen], ' ASHA@example.com ', chen.id),
    ).toBe('mem_email');
  });

  it('falls back to the explicit pick when there is no email match', () => {
    expect(resolveClaimMemberId([chen], null, chen.id)).toBe(chen.id);
  });

  it('rejects a pick that is already claimed or does not exist', () => {
    expect(resolveClaimMemberId([ben, chen], null, 'mem_missing')).toBeNull();
    expect(resolveClaimMemberId([ben], null, ben.id)).toBeNull();
  });

  it('ignores a claimed member with a matching email and continues to the pick', () => {
    const claimed: Member = {
      id: 'mem_claimed',
      name: 'Asha',
      color: '#fff',
      email: 'asha@example.com',
      userId: 'u_asha',
    };
    expect(resolveClaimMemberId([claimed, chen], 'asha@example.com', chen.id)).toBe(chen.id);
  });
});

describe('payment reminders', () => {
  it('sums transfers that end with you and ignores transfers you make', () => {
    const owed = owedToMeByMember(
      [
        transfer(ben, you, 500),
        transfer(chen, you, 300),
        transfer(ben, you, 100),
        transfer(you, chen, 999),
      ],
      'u_you',
    );
    expect(owed.get(ben.id)).toBe(600);
    expect(owed.get(chen.id)).toBe(300);
    expect(owed.get(you.id)).toBeUndefined();
  });

  it('labels members without accounts and settled members', () => {
    const candidates = buildReminderCandidates(
      [you, ben, chen, dev],
      [transfer(ben, you, 500), transfer(chen, you, 300)],
      'u_you',
    );
    expect(candidates.map((candidate) => candidate.member.id)).toEqual([
      ben.id,
      chen.id,
      dev.id,
    ]);
    expect(candidates[0]).toMatchObject({
      amountPaise: 500,
      hasAccount: true,
      canRemind: true,
      reason: 'ready',
    });
    expect(candidates[1]).toMatchObject({
      amountPaise: 300,
      hasAccount: false,
      canRemind: false,
      reason: 'no_account',
    });
    expect(candidates[2]).toMatchObject({
      amountPaise: 0,
      hasAccount: true,
      canRemind: false,
      reason: 'settled',
    });
  });

  it('selects only members that can be reminded', () => {
    const candidates = buildReminderCandidates(
      [you, ben, chen, dev],
      [transfer(ben, you, 500), transfer(chen, you, 300)],
      'u_you',
    );
    expect(selectDefaultReminderRecipients(candidates).map((item) => item.member.id)).toEqual([
      ben.id,
    ]);
  });

  it('enforces the six-hour cooldown', () => {
    const now = Date.parse('2026-03-01T12:00:00.000Z');
    expect(canSendPaymentReminder(null, now)).toBe(true);
    expect(canSendPaymentReminder('not-a-date', now)).toBe(true);
    expect(canSendPaymentReminder(new Date(now).toISOString(), now)).toBe(false);
    expect(
      canSendPaymentReminder(
        new Date(now - PAYMENT_REMINDER_COOLDOWN_MS + 1).toISOString(),
        now,
      ),
    ).toBe(false);
    expect(
      canSendPaymentReminder(
        new Date(now - PAYMENT_REMINDER_COOLDOWN_MS).toISOString(),
        now,
      ),
    ).toBe(true);
  });
});

describe('joined members in summaries', () => {
  it('uses the linked member row, not the creator row, for your totals', () => {
    const joinedYou: Member = {
      id: 'mem_joined',
      name: 'Asha',
      color: '#8ECAE6',
      userId: 'u_joined',
      isYou: true,
    };
    const creator: Member = {
      id: 'u_creator',
      name: 'Host',
      color: '#C9F25B',
      userId: 'u_creator',
      isYou: true,
    };
    const other: Member = { id: 'mem_other', name: 'Other', color: '#FFD166' };

    const trip = makeTrip({
      members: [creator, joinedYou, other],
      createdBy: 'u_creator',
    });
    const expense = makeExpense({
      paidBy: joinedYou.id,
      splits: equalSplits(1000, [creator.id, joinedYou.id, other.id]),
    });

    const summary = computeTripSummary(trip, [expense], [], 'u_joined');
    expect(summary.yourPaidPaise).toBe(1000);
    expect(summary.yourSharePaise).toBe(333);
    expect(summary.yourBalancePaise).toBe(667);
    expect(expenseYourShare(expense, joinedYou.id)).toBe(333);
    expect(findYouMember(trip.members, 'u_joined')?.id).toBe(joinedYou.id);
  });
});

describe('sync mappers', () => {
  it('never writes server-owned trip fields', () => {
    const row = tripToRow(makeTrip({ currency: 'INR', joinCode: 'ABCDEF' }));
    expect(row).not.toHaveProperty('members');
    expect(row).not.toHaveProperty('join_code');
    expect(row).not.toHaveProperty('created_by');
    expect(row.currency).toBe('INR');
  });

  it('never writes user_id on a member row', () => {
    const row = memberToRow(ben, 'trip-1');
    expect(row).not.toHaveProperty('user_id');
    expect(row).not.toHaveProperty('claimed_at');
    expect(row.trip_id).toBe('trip-1');
    expect(row.id).toBe(ben.id);
  });
});

describe('zero-row sharing RPCs', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('rejects a preview when the code returns no rows', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    await expect(previewTripByCode('AAAAAA')).rejects.toThrow(
      'That code did not work. Check it and try again.',
    );
    expect(rpc).toHaveBeenCalledWith('preview_trip_by_code', { p_code: 'AAAAAA' });
  });

  it('rejects a join when the code returns no rows', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    await expect(joinTripByCode('AAAAAA', null)).rejects.toThrow(
      'Could not join that trip. Try again.',
    );
    expect(rpc).toHaveBeenCalledWith('join_trip_by_code', {
      p_code: 'AAAAAA',
      p_claim_member_id: null,
    });
  });
});
