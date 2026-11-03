import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowLeft, Hash, LogIn } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { ClaimPicker, NEW_CLAIM_VALUE } from '@/components/trips/ClaimPicker';
import {
  friendlySharingError,
  joinTripByCode,
  previewTripByCode,
  type JoinResult,
  type TripPreview,
} from '@/features/trips/sharing';
import { isValidJoinCode, normalizeJoinCode } from '@/lib/join-code';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { useTheme } from '@/theme';

type JoinTripSheetProps = {
  visible: boolean;
  onClose: () => void;
  onJoined: (result: JoinResult) => void | Promise<void>;
};

export function JoinTripSheet({ visible, onClose, onJoined }: JoinTripSheetProps) {
  const theme = useTheme();
  const [step, setStep] = useState<'code' | 'claim'>('code');
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<TripPreview | null>(null);
  const [claimChoice, setClaimChoice] = useState(NEW_CLAIM_VALUE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findTrip = async () => {
    if (!isValidJoinCode(code)) {
      setError('Enter the 6-letter code. It never contains I or O.');
      hapticError();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await previewTripByCode(code);
      setPreview(result);
      setClaimChoice(NEW_CLAIM_VALUE);
      setStep('claim');
      hapticSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : friendlySharingError(undefined));
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  const openExisting = async () => {
    if (!preview) return;
    await onJoined({
      tripId: preview.tripId,
      tripName: preview.tripName,
      hostName: preview.hostName,
      alreadyMember: true,
    });
  };

  const join = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const result = await joinTripByCode(
        code,
        claimChoice === NEW_CLAIM_VALUE ? null : claimChoice,
      );
      hapticSuccess();
      await onJoined(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : friendlySharingError(undefined));
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={step === 'code' ? 'Join a trip' : (preview?.tripName ?? 'Join a trip')}
      subtitle={
        step === 'code'
          ? 'Ask the host for the 6-letter code on their trip screen.'
          : 'Choose the name the group already knows you by.'
      }
      footer={
        step === 'code' ? (
          <Button
            label="Find trip"
            icon={Hash}
            onPress={findTrip}
            loading={loading}
            disabled={!isValidJoinCode(code)}
            fullWidth
          />
        ) : preview?.alreadyMember ? (
          <Button label="Open trip" icon={LogIn} onPress={openExisting} fullWidth />
        ) : (
          <View style={{ gap: 8 }}>
            <Button label="Join trip" onPress={join} loading={loading} fullWidth />
            <Button
              label="Back to code"
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              onPress={() => {
                setStep('code');
                setError(null);
              }}
              fullWidth
            />
          </View>
        )
      }
    >
      {step === 'code' ? (
        <View style={{ gap: 14 }}>
          <Input
            label="Trip code"
            value={code}
            onChangeText={(text) => {
              setCode(normalizeJoinCode(text));
              setError(null);
            }}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={6}
            icon={Hash}
            error={error ?? undefined}
            inputStyle={styles.codeInput}
            hint="6 letters. Codes never contain I or O."
            returnKeyType="go"
            onSubmitEditing={() => void findTrip()}
          />
          <View
            style={[
              styles.note,
              { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.line },
            ]}
          >
            <Text variant="caption" color={theme.colors.inkMuted}>
              The code is not a password. Anyone with the code joins straight away and can
              see this trip&apos;s expenses. The host can reset it at any time.
            </Text>
          </View>
        </View>
      ) : preview ? (
        <View style={{ gap: 14 }}>
          <Card variant="sunken" padding={14}>
            <Text variant="h2">{preview.tripName}</Text>
            <Text variant="bodySmall" color={theme.colors.inkMuted} style={{ marginTop: 3 }}>
              Hosted by {preview.hostName} · {preview.memberCount}{' '}
              {preview.memberCount === 1 ? 'member' : 'members'}
            </Text>
          </Card>

          {preview.alreadyMember ? (
            <Text variant="body" color={theme.colors.inkMuted}>
              You are already part of this trip. Open it to see the latest expenses.
            </Text>
          ) : (
            <ClaimPicker
              members={preview.unclaimedMembers}
              value={claimChoice}
              onChange={setClaimChoice}
              disabled={loading}
            />
          )}

          {error ? (
            <Text variant="bodySmall" color={theme.colors.negative}>
              {error}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  codeInput: {
    letterSpacing: 7,
    fontSize: 22,
    textAlign: 'center',
  },
  note: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
});
