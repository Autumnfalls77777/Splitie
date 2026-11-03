import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Text } from '@/components/ui/Text';
import {
  EmailConfirmationRequiredError,
  useAuthStore,
} from '@/features/auth/auth.store';
import { useSettingsStore } from '@/features/settings/settings.store';
import { hapticSuccess } from '@/lib/haptics';
import { useTheme } from '@/theme';

const schema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(6, 'Use at least 6 characters.'),
});

type FormValues = z.infer<typeof schema>;

export default function SignUpScreen() {
  const theme = useTheme();
  const router = useRouter();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const signUp = useAuthStore((state) => state.signUp);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setInfoMessage(null);
    try {
      await signUp(values.name, values.email, values.password);
      posthog?.capture('account_created', { auth_provider: 'password' });
      completeOnboarding();
      hapticSuccess();
      router.replace('/(tabs)');
    } catch (error) {
      if (error instanceof EmailConfirmationRequiredError) {
        setInfoMessage(error.message);
        return;
      }
      setServerError(error instanceof Error ? error.message : 'Could not create your account.');
    }
  });

  const handleGoogle = async () => {
    setServerError(null);
    setInfoMessage(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      posthog?.capture('account_created', { auth_provider: 'google' });
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
          paddingBottom: insets.bottom + 20,
          flexGrow: 1,
        }}
      >
        <Header onBack={() => router.back()} />

        <Text
          style={{
            fontFamily: theme.fonts.displayXBold,
            fontSize: 33,
            lineHeight: 36,
            letterSpacing: -1.3,
            marginTop: 14,
          }}
        >
          Make trips less{'\n'}maths-y.
        </Text>
        <Text
          variant="bodySmall"
          color={theme.colors.inkMuted}
          style={{ marginTop: 8, maxWidth: 320 }}
        >
          One account for every split, every trip, and every “I will pay you later”.
        </Text>

        <View style={{ gap: 10, marginTop: 20 }}>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Input
                label="Your name"
                placeholder="Aarav Mehta"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoCapitalize="words"
                textContentType="name"
              />
            )}
          />
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
                hint="Use 6 or more characters."
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

        {infoMessage ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: theme.colors.limeSoft,
                borderWidth: 1,
                borderColor: theme.colors.lime,
              },
            ]}
          >
            <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 12.5, color: theme.colors.ink }}>
              {infoMessage}
            </Text>
          </View>
        ) : null}

        <Button
          label="Create my account"
          variant="dark"
          size="lg"
          fullWidth
          icon={ArrowRight}
          iconPosition="right"
          loading={isSubmitting}
          style={{ marginTop: 16 }}
          onPress={onSubmit}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />
          <Text variant="caption" color={theme.colors.inkSubtle}>
            or
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />
        </View>

        <Button
          label="Continue with Google"
          variant="secondary"
          size="lg"
          fullWidth
          iconElement={<GoogleIcon size={19} />}
          loading={googleLoading}
          disabled={isSubmitting}
          onPress={handleGoogle}
        />

        <View style={styles.footer}>
          <Text variant="bodySmall" color={theme.colors.inkMuted}>
            Already splitting?{' '}
          </Text>
          <Pressable onPress={() => router.replace('/sign-in')} hitSlop={8}>
            <Text style={{ fontFamily: theme.fonts.bold, fontSize: 13.5, color: theme.colors.limeDeep }}>
              Sign in
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
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', paddingTop: 24 },
});
