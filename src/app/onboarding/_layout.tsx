import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { onboardingColors } from '@/features/onboarding/palette';

export default function OnboardingLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: onboardingColors.lime },
        }}
      />
    </>
  );
}
