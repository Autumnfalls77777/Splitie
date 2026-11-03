import type { Member } from '@/types/models';

export type ClaimMember = {
  id: string;
  displayName: string;
  color: string;
};

/** The picker can only offer rows that no auth user has claimed yet. */
export function unclaimedMembers(members: Member[]): Member[] {
  return members.filter((member) => !member.userId && !member.isYou);
}

/**
 * Client-side mirror of the server claim precedence:
 * 1. a verified email match wins,
 * 2. otherwise an explicitly chosen unclaimed row,
 * 3. otherwise a brand-new member row.
 */
export function resolveClaimMemberId(
  members: Member[],
  verifiedEmail: string | null | undefined,
  chosenMemberId: string | null | undefined,
): string | null {
  const email = verifiedEmail?.trim().toLowerCase();
  if (email) {
    const match = members.find(
      (member) =>
        !member.userId &&
        Boolean(member.email) &&
        member.email!.trim().toLowerCase() === email,
    );
    if (match) return match.id;
  }

  if (!chosenMemberId) return null;
  const chosen = members.find((member) => member.id === chosenMemberId && !member.userId);
  return chosen?.id ?? null;
}
