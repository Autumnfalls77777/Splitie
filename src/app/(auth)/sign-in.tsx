import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';

import { ConsentCheckbox } from '@/components/legal/ConsentCheckbox';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Text } from '@/components/ui/Text';
import { LEGAL_VERSION } from '@/content/legal';
import { useAuthStore } from '@/features/auth/auth.store';
import { hasAcceptedCurrentVersion } from '@/features/legal/consent';
import { useConsentStore } from '@/features/legal/consent.store';
import { syncConsentToAuthMetadata } from '@/features/legal/sync-consent';
import { useSettingsStore } from '@/features/settings/settings.store';
import { hapticSuccess } from '@/lib/haptics';
import { useTheme } from '@/theme';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(6, 'Use at least 6 characters.'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((state) => state.signIn);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);
  const acceptedVersion = useConsentStore((state) => state.acceptedVersion);
  const acceptConsent = useConsentStore((state) => state.accept);
  const clearConsent = useConsentStore((state) => state.clear);
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const agreed = hasAcceptedCurrentVersion(acceptedVersion);

  const handleConsentChange = (checked: boolean) => {
    if (checked) {
      acceptConsent(LEGAL_VERSION);
    } else {
      clearConsent();
    }
  };

  const consentRequired = () => {
    setServerError('Please agree to the Terms of Service and Privacy Policy to continue.');
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (!agreed) {
      consentRequired();
      return;
    }
    try {
      await signIn(values.email, values.password);
      await syncConsentToAuthMetadata();
      posthog?.capture('user_signed_in', { auth_provider: 'password' });
      completeOnboarding();
      hapticSuccess();
      router.replace('/(tabs)');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Could not sign you in.');
    }
  });

  const handleGoogle = async () => {
    setServerError(null);
    if (!agreed) {
      consentRequired();
      return;
    }
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      await syncConsentToAuthMetadata();
      posthog?.capture('user_signed_in', { auth_provider: 'google' });
      completeOnboarding();
      hapticSuccess();
      router.replace('/(tabs)');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Could not sign you in with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: theme.spacing.xl,
          paddingBottom: insets.bottom + 28,
          flexGrow: 1,
        }}
      >
        <Header onBack={() => router.back()} />

        <Text
          style={{
            fontFamily: theme.fonts.displayXBold,
            fontSize: 38,
            lineHeight: 41,
            letterSpacing: -1.6,
            marginTop: 22,
          }}
        >
          Welcome back.
        </Text>
        <Text variant="body" color={theme.colors.inkMuted} style={{ marginTop: 8, maxWidth: 310 }}>
          Pick up where the trip left off. Your balances are exactly where you left them.
        </Text>

        <View style={{ gap: 15, marginTop: 28 }}>
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Input
                label="Email"
                placeholder="you@example.com"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <PasswordInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>

        {serverError ? (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.negativeSoft }]}>
            <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 12.5, color: theme.colors.negative }}>
              {serverError}
            </Text>
          </View>
        ) : null}

        <Button
          label="Sign in"
          variant="dark"
          size="lg"
          fullWidth
          icon={ArrowRight}
          iconPosition="right"
          loading={isSubmitting}
          disabled={!agreed}
          style={{ marginTop: 24 }}
          onPress={onSubmit}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />
          <Text variant="caption" color={theme.colors.inkSubtle}>
            or
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />
        </View>

        <ConsentCheckbox checked={agreed} onChange={handleConsentChange} />

        <Button
          label="Continue with Google"
          variant="secondary"
          size="lg"
          fullWidth
          iconElement={<GoogleIcon size={19} />}
          loading={googleLoading}
          disabled={!agreed || isSubmitting}
          style={{ marginTop: 14 }}
          onPress={handleGoogle}
        />

        <View style={styles.footer}>
          <Text variant="bodySmall" color={theme.colors.inkMuted}>
            New around here?{' '}
          </Text>
          <Pressable onPress={() => router.replace('/sign-up')} hitSlop={8}>
            <Text style={{ fontFamily: theme.fonts.bold, fontSize: 13.5, color: theme.colors.limeDeep }}>
              Create an account
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  errorBox: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginTop: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', paddingTop: 28 },
});
