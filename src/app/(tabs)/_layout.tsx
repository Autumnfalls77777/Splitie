import { Redirect, Tabs } from 'expo-router';

import { AddSheet } from '@/components/layout/AddSheet';
import { TabBar } from '@/components/layout/TabBar';
import { useAuthStore } from '@/features/auth/auth.store';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);

  if (!user) return <Redirect href="/welcome" />;

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <TabBar
            state={props.state as never}
            navigateToTab={props.navigateToTab}
            emitter={props.emitter as never}
          />
        )}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="trips" options={{ title: 'Trips' }} />
        <Tabs.Screen name="personal" options={{ title: 'Personal' }} />
        <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      </Tabs>
      <AddSheet />
    </>
  );
}
