import { isYouMember } from '@/features/trips/identity';
import type { Member, SuggestedTransfer } from '@/types/models';

/** The database trigger and edge function enforce the same six-hour window. */
export const PAYMENT_REMINDER_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export type ReminderReason = 'ready' | 'settled' | 'no_account';

export type ReminderCandidate = {
  member: Member;
  amountPaise: number;
  hasAccount: boolean;
  canRemind: boolean;
  reason: ReminderReason;
};

/**
 * Uses the same suggested transfers the Settle screen renders, so the amount in
 * the notification matches what the user sees in the app.
 */
export function owedToMeByMember(
  transfers: SuggestedTransfer[],
  youId: string,
): Map<string, number> {
  const owed = new Map<string, number>();
  for (const transfer of transfers) {
    if (!isYouMember(transfer.to, youId)) continue;
    if (isYouMember(transfer.from, youId)) continue;
    owed.set(transfer.from.id, (owed.get(transfer.from.id) ?? 0) + transfer.amountPaise);
  }
  return owed;
}

export function buildReminderCandidates(
  members: Member[],
  transfers: SuggestedTransfer[],
  youId: string,
): ReminderCandidate[] {
  const owed = owedToMeByMember(transfers, youId);
  return members
    .filter((member) => !isYouMember(member, youId))
    .map((member) => {
      const amountPaise = owed.get(member.id) ?? 0;
      const hasAccount = Boolean(member.userId);
      const reason: ReminderReason = !hasAccount
        ? 'no_account'
        : amountPaise <= 0
          ? 'settled'
          : 'ready';
      return {
        member,
        amountPaise,
        hasAccount,
        canRemind: hasAccount && amountPaise > 0,
        reason,
      };
    });
}

export function canSendPaymentReminder(
  lastSentAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!lastSentAt) return true;
  const sentAt = new Date(lastSentAt).getTime();
  if (!Number.isFinite(sentAt)) return true;
  return now - sentAt >= PAYMENT_REMINDER_COOLDOWN_MS;
}

export function selectDefaultReminderRecipients(
  candidates: ReminderCandidate[],
): ReminderCandidate[] {
  return candidates.filter((candidate) => candidate.canRemind);
}
