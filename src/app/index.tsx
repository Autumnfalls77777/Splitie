import { Redirect } from 'expo-router';

import { useAuthStore } from '@/features/auth/auth.store';
import { useSettingsStore } from '@/features/settings/settings.store';

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const hasOnboarded = useSettingsStore((state) => state.hasOnboarded);

  if (!hasOnboarded) return <Redirect href="/onboarding" />;
  if (!user) return <Redirect href="/welcome" />;
  return <Redirect href="/(tabs)" />;
}
