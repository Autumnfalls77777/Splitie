import { useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const theme = useTheme();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-160, measuredWidth + 40]) }],
  }));

  return (
    <View
      onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
      style={[
        styles.base,
        { width, height, borderRadius: radius, backgroundColor: theme.colors.skeleton },
        style,
      ]}
    >
      {measuredWidth > 0 ? (
        <Animated.View style={[styles.shimmer, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', theme.colors.skeletonHighlight, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradient}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function SkeletonCircle({ size = 44, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return <Skeleton width={size} height={size} radius={size / 2} style={style} />;
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 140 },
  gradient: { flex: 1 },
});
