import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { ClaimPicker, NEW_CLAIM_VALUE } from '@/components/trips/ClaimPicker';
import { useAuthStore } from '@/features/auth/auth.store';
import { useInviteStore } from '@/features/invites/invites.store';
import { useTripStore } from '@/features/trips/trips.store';
import { respondToInvite } from '@/features/trips/sharing';
import { syncNow } from '@/features/sync/sync';
import { formatDateRange } from '@/lib/date';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { useUIStore } from '@/features/settings/ui.store';
import { useTheme } from '@/theme';

export function InviteSheet() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);
  const invites = useInviteStore((state) => state.invites);
  const activeInviteId = useInviteStore((state) => state.activeInviteId);
  const loading = useInviteStore((state) => state.loading);
  const dismiss = useInviteStore((state) => state.dismiss);
  const close = useInviteStore((state) => state.close);

  const [claimChoice, setClaimChoice] = useState(NEW_CLAIM_VALUE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = activeInviteId
    ? invites.find((invite) => invite.inviteId === activeInviteId)
    : undefined;

  const finish = (inviteId: string) => {
    dismiss(inviteId);
    close();
  };

  const accept = async () => {
    if (!active) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await respondToInvite(
        active.inviteId,
        true,
        claimChoice === NEW_CLAIM_VALUE ? null : claimChoice,
      );
      hapticSuccess();
      finish(active.inviteId);
      showToast(`You joined ${result.tripName}`);

      const user = useAuthStore.getState().user;
      if (user) await syncNow(user.id);
      await queryClient.invalidateQueries();

      if (useTripStore.getState().trips.some((trip) => trip.id === result.tripId)) {
        router.push(`/trip/${result.tripId}`);
      } else {
        showToast('Invite accepted. Your trip will appear after the next sync.', {
          kind: 'info',
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not accept that invite.');
      hapticError();
    } finally {
      setSubmitting(false);
    }
  };

  const decline = async () => {
    if (!active) return;
    setSubmitting(true);
    setError(null);
    try {
      await respondToInvite(active.inviteId, false, null);
      finish(active.inviteId);
      showToast('Invite declined', { kind: 'info' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not decline that invite.');
      hapticError();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      visible={Boolean(activeInviteId)}
      onClose={close}
      title="Trip invite"
      subtitle={active ? `From ${active.hostName}` : undefined}
      footer={
        active ? (
          <View style={{ gap: 8 }}>
            <Button
              label="Accept invite"
              icon={Check}
              onPress={accept}
              loading={submitting}
              fullWidth
            />
            <Button
              label="Not now"
              variant="ghost"
              size="sm"
              icon={X}
              onPress={decline}
              disabled={submitting}
              fullWidth
            />
          </View>
        ) : undefined
      }
    >
      {active ? (
        <View style={{ gap: 14 }}>
          <Card variant="sunken" padding={14}>
            <Text variant="h2">{active.tripName}</Text>
            <Text variant="bodySmall" color={theme.colors.inkMuted} style={{ marginTop: 3 }}>
              {formatDateRange(active.startDate, active.endDate)} · {active.memberCount}{' '}
              {active.memberCount === 1 ? 'member' : 'members'}
            </Text>
          </Card>

          <ClaimPicker
            members={active.unclaimedMembers}
            value={claimChoice}
            onChange={setClaimChoice}
            disabled={submitting}
          />

          {error ? (
            <Text variant="bodySmall" color={theme.colors.negative}>
              {error}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 26, gap: 10 }}>
          <ActivityIndicator color={theme.colors.ink} />
          <Text variant="bodySmall" color={theme.colors.inkMuted}>
            {loading ? 'Loading your invite…' : 'This invite is no longer available.'}
          </Text>
        </View>
      )}
    </Sheet>
  );
}
