import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { useUIStore, type ToastKind, type ToastMessage } from '@/features/settings/ui.store';
import { useTheme } from '@/theme';

const ICONS = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} as const;

const TITLES: Record<ToastKind, string> = {
  success: 'Done',
  error: 'Something needs attention',
  info: 'Heads up',
};

export function Toast() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useUIStore((state) => state.toast);
  const hide = useUIStore((state) => state.hideToast);
  const [content, setContent] = useState<ToastMessage | null>(toast);
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast) {
      setContent(toast);
      translateY.value = withTiming(0, { duration: 260 });
      opacity.value = withTiming(1, { duration: 220 });
      const timeout = setTimeout(() => {
        hide();
      }, 3000);
      return () => clearTimeout(timeout);
    }
    if (content) {
      opacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(-90, { duration: 200 }, (finished) => {
        if (finished) runOnJS(setContent)(null);
      });
    }
    return undefined;
  }, [toast, content, hide, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!content) return null;

  const Icon = ICONS[content.kind];
  const accent =
    content.kind === 'success'
      ? theme.colors.lime
      : content.kind === 'error'
        ? theme.colors.negative
        : theme.colors.info;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: insets.top + 8 },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={hide}
        style={[
          styles.card,
          { backgroundColor: theme.colors.ink, borderColor: theme.colors.lineStrong },
          theme.shadows.float,
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Icon size={20} color={accent} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: theme.fonts.bold, fontSize: 13, color: theme.colors.inkInverse }}>
            {content.message}
          </Text>
          {content.description ? (
            <Text
              style={{
                fontFamily: theme.fonts.medium,
                fontSize: 11.5,
                color: theme.colors.inkInverse,
                opacity: 0.68,
                marginTop: 2,
              }}
            >
              {content.description}
            </Text>
          ) : null}
        </View>
        <X size={15} color={theme.colors.inkInverse} opacity={0.4} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 2000 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: 1,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
