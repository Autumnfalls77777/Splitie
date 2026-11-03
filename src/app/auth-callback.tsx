import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Text } from '@/components/ui/Text';
import { useAuthStore, waitForSession } from '@/features/auth/auth.store';
import { syncConsentToAuthMetadata } from '@/features/legal/sync-consent';
import { useSettingsStore } from '@/features/settings/settings.store';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';

export default function AuthCallbackScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [message, setMessage] = useState('Finishing sign-in...');

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      try {
        if (!supabase) throw new Error('Cloud sign-in is not configured.');

        // React Native exposes a global `window` alias, but it has no
        // `location`. Guard the nested property so the OAuth callback does not
        // crash with "Cannot read property 'href' of undefined".
        const webHref =
          typeof window !== 'undefined' ? window.location?.href : undefined;
        const webParams =
          typeof webHref === 'string' ? new URL(webHref).searchParams : null;
        const error =
          params.error_description ??
          params.error ??
          webParams?.get('error_description') ??
          webParams?.get('error');
        if (error) throw new Error(error);

        let session = (await supabase.auth.getSession()).data.session;
        if (!session) {
          const code = params.code ?? webParams?.get('code') ?? '';
          if (code) {
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);
            session = exchangeData.session;
            if (!session) {
              // The native browser promise can win the code exchange race.
              session = await waitForSession(supabase);
              if (!session) {
                throw exchangeError ?? new Error('Could not finish sign-in.');
              }
            }
          }
        }
        if (!session) session = await waitForSession(supabase);

        if (!session) throw new Error('The sign-in link is missing or expired.');
        if (cancelled) return;

        useAuthStore.getState().restoreSession(session);
        useSettingsStore.getState().completeOnboarding();
        void syncConsentToAuthMetadata();
        setMessage('You are signed in. Taking you home...');
        router.replace('/(tabs)');
      } catch (error) {
        if (cancelled) return;
        const text =
          error instanceof Error ? error.message : 'Could not finish sign-in. Please try again.';
        setMessage(text);
        setTimeout(() => {
          if (!cancelled) router.replace('/sign-in');
        }, 2200);
      }
    };

    void finish();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.error, params.error_description, router]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <ActivityIndicator color={theme.colors.limeDeep} />
      <Text
        variant="bodySmall"
        color={theme.colors.inkMuted}
        align="center"
        style={{ marginTop: 14, maxWidth: 280 }}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});