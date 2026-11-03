import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/features/auth/auth.store';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';

export default function AuthCallbackScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [message, setMessage] = useState('Finishing sign-in…');

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      try {
        if (!supabase) throw new Error('Cloud sign-in is not configured.');

        const webParams =
          typeof window !== 'undefined' ? new URL(window.location.href).searchParams : null;
        const error =
          params.error_description ??
          params.error ??
          webParams?.get('error_description') ??
          webParams?.get('error');
        if (error) throw new Error(error);

        let { data } = await supabase.auth.getSession();
        if (!data.session) {
          const code = params.code ?? webParams?.get('code') ?? '';
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            // Race guard: if exchange failed but a session now exists, treat as success
            if (exchangeError) {
              const again = await supabase.auth.getSession();
              if (!again.data.session) throw exchangeError;
            }
            const refreshed = await supabase.auth.getSession();
            data = refreshed.data;
          }
        }

        if (!data.session) throw new Error('The sign-in link is missing or expired.');
        if (cancelled) return;

        useAuthStore.getState().restoreSession(data.session);
        setMessage('You are signed in. Taking you home…');
        router.replace('/');
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