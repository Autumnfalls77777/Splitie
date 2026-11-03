import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { InviteSheet } from '@/components/invites/InviteSheet';
import { useAuthStore } from '@/features/auth/auth.store';
import { useInviteStore } from '@/features/invites/invites.store';
import { registerPushToken } from '@/lib/push';

type PushData = {
  type?: string;
  tripId?: string;
  inviteId?: string;
};

/**
 * Owns push registration, notification taps, and the global invite sheet.
 * Invites refresh on launch/sign-in and silently on foreground; the sheet only
 * opens by itself on launch/sign-in when there is something to answer.
 */
export function PushHost() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.user?.id);
  const inviteSession = useInviteStore((state) => state.session);
  const handledResponses = useRef(new Set<string>());

  useEffect(() => {
    if (!userId) {
      useInviteStore.getState().reset();
      return;
    }

    void useInviteStore.getState().refresh({ open: true });
    void registerPushToken();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void useInviteStore.getState().refresh({ open: false });
    });

    return () => subscription.remove();
  }, [userId]);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledResponses.current.has(id)) return;
      handledResponses.current.add(id);

      const data = response.notification.request.content.data as PushData | undefined;
      if (data?.type === 'trip_invite' && data.inviteId) {
        useInviteStore.getState().open(data.inviteId);
        void useInviteStore.getState().refresh({ open: false });
      } else if (data?.type === 'payment_reminder' && data.tripId) {
        router.push(`/trip/${data.tripId}`);
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    // Handles a tap that cold-started the app.
    void Notifications.getLastNotificationResponseAsync()
      .then(handleResponse)
      .catch(() => undefined);

    return () => subscription.remove();
  }, [router]);

  return <InviteSheet key={inviteSession} />;
}
