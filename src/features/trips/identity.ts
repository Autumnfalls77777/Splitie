import type { Member } from '@/types/models';

/**
 * A member is "you" when their linked auth user id matches. The `isYou` flag is
 * only reliable for the local trip creator before the first sync; once the row
 * comes back from the cloud, user_id is the source of truth.
 */
export function isYouMember(member: Member, youId: string): boolean {
  if (!youId) return false;
  if (member.userId) return member.userId === youId;
  return member.id === youId || member.isYou === true;
}

export function findYouMember(members: Member[], youId: string): Member | undefined {
  return members.find((member) => isYouMember(member, youId));
}
