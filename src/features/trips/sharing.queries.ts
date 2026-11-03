import { useQuery } from '@tanstack/react-query';

import { useTripStore } from './trips.store';
import {
  fetchTripJoinCode,
  getPaymentReminderHistory,
  getTripInvites,
} from './sharing';

export function useTripJoinCode(tripId: string) {
  const setJoinCode = useTripStore((state) => state.setJoinCode);
  return useQuery({
    queryKey: ['trip-join-code', tripId],
    queryFn: async () => {
      const code = await fetchTripJoinCode(tripId);
      if (code) setJoinCode(tripId, code);
      return code;
    },
    enabled: Boolean(tripId),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useTripInvites(tripId: string) {
  return useQuery({
    queryKey: ['trip-invites', tripId],
    queryFn: () => getTripInvites(tripId),
    enabled: Boolean(tripId),
    staleTime: 30_000,
  });
}

export function useReminderHistory(tripId: string, userId: string) {
  return useQuery({
    queryKey: ['trip-reminders', tripId, userId],
    queryFn: () => getPaymentReminderHistory(tripId, userId),
    enabled: Boolean(tripId) && Boolean(userId),
    staleTime: 30_000,
  });
}
