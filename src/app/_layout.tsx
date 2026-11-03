import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts as useBricolage,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts as useManrope,
} from '@expo-google-fonts/manrope';

import { SplashOverlay } from '@/components/brand/SplashOverlay';
import { Toast } from '@/components/feedback/Toast';
import { initializeAuth } from '@/features/auth/auth-bootstrap';
import { SyncGate } from '@/features/sync/sync-provider';
import { posthog } from '@/lib/posthog';
import { QueryProvider, useHydration } from '@/lib/query';
import { Sentry } from '@/lib/sentry';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedStatusBar() {
  const theme = useTheme();
  return <StatusBar style={theme.isDark ? 'light' : 'dark'} />;
}

function RootNavigator() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="trip/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="trip/[id]/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="trip/[id]/add-expense" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="trip/[id]/settle" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="personal/add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="auth-callback" options={{ animation: 'fade' }} />
    </Stack>
  );
}

function ScreenTracker() {
  const pathname = usePathname();

  useEffect(() => {
    posthog?.screen(pathname);
    Sentry.addBreadcrumb({ category: 'navigation', message: pathname, level: 'info' });
  }, [pathname]);

  return null;
}

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <>
      <ScreenTracker />
      <ThemedStatusBar />
      <RootNavigator />
      <SyncGate />
      <Toast />
      {showSplash ? <SplashOverlay onFinish={() => setShowSplash(false)} /> : null}
    </>
  );
}

function RootLayout() {
  const [authReady, setAuthReady] = useState(false);
  const [bricolageLoaded, bricolageError] = useBricolage({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  const [manropeLoaded, manropeError] = useManrope({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const hydrated = useHydration();

  useEffect(() => {
    initializeAuth()
      .catch(() => {})
      .finally(() => setAuthReady(true));
  }, []);

  const ready =
    (bricolageLoaded || bricolageError) &&
    (manropeLoaded || manropeError) &&
    hydrated &&
    authReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#C9F25B' }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryProvider>
          {posthog ? (
            <PostHogProvider client={posthog}>
              <AppShell />
            </PostHogProvider>
          ) : (
            <AppShell />
          )}
        </QueryProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
