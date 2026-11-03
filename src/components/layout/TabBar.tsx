import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ChartNoAxesColumn,
  House,
  Plane,
  Plus,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { hapticTap } from '@/lib/haptics';
import { useUIStore } from '@/features/settings/ui.store';
import { useTheme } from '@/theme';

const TAB_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Home', icon: House },
  trips: { label: 'Trips', icon: Plane },
  personal: { label: 'Personal', icon: Wallet },
  insights: { label: 'Insights', icon: ChartNoAxesColumn },
};

type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigateToTab: (routeKey: string) => void;
  emitter: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented?: boolean };
  };
};

type TabButtonProps = {
  label: string;
  icon: LucideIcon;
  focused: boolean;
  onPress: () => void;
};

function TabButton({ label, icon: Icon, focused, onPress }: TabButtonProps) {
  const theme = useTheme();
  const focusProgress = useSharedValue(focused ? 1 : 0);
  const hoverProgress = useSharedValue(0);

  useEffect(() => {
    focusProgress.value = withTiming(focused ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [focusProgress, focused]);

  const activePillStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
    transform: [{ scale: 0.82 + focusProgress.value * 0.18 }],
  }));

  const hoverPillStyle = useAnimatedStyle(() => ({
    opacity: hoverProgress.value,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={() => {
        hoverProgress.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
      }}
      onHoverOut={() => {
        hoverProgress.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) });
      }}
      style={styles.tab}
    >
      <View style={styles.iconSlot}>
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { backgroundColor: theme.colors.scrim }, hoverPillStyle]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { backgroundColor: theme.colors.limeSoft }, activePillStyle]}
        />
        <View style={styles.iconLayer}>
          <Icon
            size={21}
            color={focused ? theme.colors.ink : theme.colors.inkSubtle}
            strokeWidth={focused ? 2.5 : 2}
          />
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            fontFamily: theme.fonts.semibold,
            color: focused ? theme.colors.ink : theme.colors.inkSubtle,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TabBar({ state, navigateToTab, emitter }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const openAddSheet = useUIStore((store) => store.openAddSheet);

  const renderTab = (route: { key: string; name: string }, routeIndex: number) => {
    const config = TAB_CONFIG[route.name];
    if (!config) return null;
    const focused = state.index === routeIndex;

    return (
      <TabButton
        key={route.key}
        label={config.label}
        icon={config.icon}
        focused={focused}
        onPress={() => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            hapticTap();
            navigateToTab(route.key);
          }
        }}
      />
    );
  };

  const routes = state.routes.filter((route) => TAB_CONFIG[route.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2, 4);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.colors.tabBar,
            borderColor: theme.colors.tabBarBorder,
          },
          theme.shadows.float,
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            tint={theme.isDark ? 'dark' : 'light'}
            intensity={70}
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.tabBar }]}
          />
        ) : null}
        <View style={styles.row}>
          {left.map((route) => renderTab(route, state.routes.indexOf(route)))}
          <View style={styles.fabSlot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add something"
              onPress={() => {
                hapticTap();
                openAddSheet();
              }}
              style={({ pressed }) => [
                styles.fab,
                {
                  backgroundColor: theme.colors.lime,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
                theme.shadows.hero,
              ]}
            >
              <Plus size={26} color={theme.colors.onLime} strokeWidth={2.6} />
            </Pressable>
          </View>
          {right.map((route) => renderTab(route, state.routes.indexOf(route)))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  bar: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 18,
  },
  iconLayer: {
    position: 'relative',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    zIndex: 1,
    bottom: 2,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.1,
  },
  fabSlot: { width: 66, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
