import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

type ProgressBarProps = {
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
};

export function ProgressBar({
  progress,
  height = 8,
  color,
  trackColor,
  style,
  rounded = true,
}: ProgressBarProps) {
  const theme = useTheme();
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(Math.max(0, Math.min(1.5, progress)), {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.min(1, value.value) * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: rounded ? height / 2 : 0,
          backgroundColor: trackColor ?? theme.colors.surfaceAlt,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            borderRadius: rounded ? height / 2 : 0,
            backgroundColor: color ?? theme.colors.lime,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});
