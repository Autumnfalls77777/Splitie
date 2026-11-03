import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { useTheme } from '@/theme';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  height?: number | `${number}%` | 'auto';
  scrollable?: boolean;
};

export function Sheet({ visible, onClose, title, subtitle, children, footer, height = 'auto' }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(windowHeight);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = windowHeight;
      backdropOpacity.value = withTiming(1, { duration: 220 });
      requestAnimationFrame(() => {
        translateY.value = withSpring(0, { damping: 24, stiffness: 260, mass: 0.8 });
      });
    } else if (mounted) {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(windowHeight, { duration: 240 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, mounted, windowHeight, translateY, backdropOpacity]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 110 || event.velocityY > 900) {
        backdropOpacity.value = withTiming(0, { duration: 160 });
        translateY.value = withTiming(windowHeight, { duration: 220 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 260 });
      }
    });

  if (!mounted) return null;

  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close sheet" />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
          pointerEvents="box-none"
        >
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                styles.panel,
                {
                  backgroundColor: theme.colors.bgElevated,
                  borderTopLeftRadius: theme.radius.xxl,
                  borderTopRightRadius: theme.radius.xxl,
                  paddingBottom: Math.max(insets.bottom, 16) + 8,
                  maxHeight: windowHeight * 0.92,
                },
                height !== 'auto' ? { height } : null,
                panelStyle,
              ]}
            >
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: theme.colors.lineStrong }]} />
              </View>
              {title ? (
                <View style={styles.header}>
                  <Text variant="h2">{title}</Text>
                  {subtitle ? (
                    <Text variant="bodySmall" color={theme.colors.inkMuted} style={{ marginTop: 3 }}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.body}>{children}</View>
              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  keyboard: { justifyContent: 'flex-end' },
  panel: { paddingHorizontal: 22, overflow: 'hidden' },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 42, height: 5, borderRadius: 3 },
  header: { paddingTop: 12, paddingBottom: 4 },
  body: { paddingTop: 12 },
  footer: { paddingTop: 12 },
});
