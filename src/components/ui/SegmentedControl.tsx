import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from './Text';
import { hapticSelect } from '@/lib/haptics';
import { useTheme } from '@/theme';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: 'lime' | 'surface';
  style?: StyleProp<ViewStyle>;
  height?: number;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'lime',
  style,
  height = 44,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const segmentWidth = width > 0 ? (width - 8) / options.length : 0;
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withSpring(index * segmentWidth, { damping: 20, stiffness: 220 });
  }, [index, segmentWidth, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.container,
        {
          height,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.pill,
        },
        style,
      ]}
    >
      {width > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: segmentWidth,
              height: height - 8,
              borderRadius: theme.radius.pill,
              backgroundColor: tone === 'lime' ? theme.colors.lime : theme.colors.surface,
            },
            indicatorStyle,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              hapticSelect();
              onChange(option.value);
            }}
            style={styles.segment}
          >
            <Text
              style={{
                fontFamily: selected ? theme.fonts.bold : theme.fonts.semibold,
                fontSize: 13,
                color: selected
                  ? tone === 'lime'
                    ? theme.colors.onLime
                    : theme.colors.ink
                  : theme.colors.inkMuted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 4, position: 'relative' },
  indicator: { position: 'absolute', left: 4, top: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
