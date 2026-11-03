import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { LogoMark } from './Logo';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

type SplashOverlayProps = {
  onFinish: () => void;
};

export function SplashOverlay({ onFinish }: SplashOverlayProps) {
  const theme = useTheme();
  const overlayOpacity = useSharedValue(1);
  const markScale = useSharedValue(0.82);
  const markOpacity = useSharedValue(0);
  const wordmarkY = useSharedValue(14);
  const wordmarkOpacity = useSharedValue(0);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    markScale.value = withTiming(1, { duration: 720, easing: Easing.out(Easing.back(1.2)) });
    wordmarkOpacity.value = withDelay(260, withTiming(1, { duration: 420 }));
    wordmarkY.value = withDelay(260, withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }));

    const timeout = setTimeout(() => {
      overlayOpacity.value = withTiming(0, { duration: 420, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      });
    }, 1350);

    return () => clearTimeout(timeout);
  }, [markOpacity, markScale, overlayOpacity, wordmarkOpacity, wordmarkY, onFinish]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: theme.colors.lime }, overlayStyle]}
    >
      <View style={styles.center}>
        <Animated.View style={markStyle}>
          <LogoMark size={108} color={theme.colors.onLime} softColor="#3C4A26" />
        </Animated.View>
        <Animated.View style={[styles.wordmark, wordmarkStyle]}>
          <Text
            style={{
              fontFamily: theme.fonts.displayXBold,
              fontSize: 46,
              lineHeight: 52,
              letterSpacing: -2.4,
              color: theme.colors.onLime,
            }}
          >
            splitie
          </Text>
          <View style={[styles.dot, { backgroundColor: theme.colors.onLime }]} />
        </Animated.View>
        <Animated.Text
          style={[
            {
              fontFamily: theme.fonts.medium,
              fontSize: 13,
              color: theme.colors.onLime,
              opacity: 0.62,
              marginTop: 4,
            },
            wordmarkStyle,
          ]}
        >
          Split the bill. Keep the memories.
        </Animated.Text>
      </View>
      <View style={styles.footer}>
        <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 10, letterSpacing: 2, color: theme.colors.onLime, opacity: 0.45 }}>
          MADE FOR GOOD TRIPS
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  center: { alignItems: 'center' },
  wordmark: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 18 },
  dot: { width: 7, height: 7, borderRadius: 4, marginBottom: 8, marginLeft: 3 },
  footer: { position: 'absolute', bottom: 48 },
});
