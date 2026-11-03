import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';

import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';

type IconButtonProps = {
  icon: LucideIcon;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  variant?: 'surface' | 'ghost' | 'lime' | 'ink';
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
};

export function IconButton({
  icon: Icon,
  onPress,
  size = 42,
  iconSize = 20,
  variant = 'surface',
  accessibilityLabel,
  disabled,
  style,
  color,
}: IconButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const background = {
    surface: theme.colors.surface,
    ghost: 'transparent',
    lime: theme.colors.lime,
    ink: theme.colors.ink,
  }[variant];

  const iconColor =
    color ??
    (variant === 'lime'
      ? theme.colors.onLime
      : variant === 'ink'
        ? theme.colors.inkInverse
        : theme.colors.ink);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        hapticTap();
        onPress?.();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      style={style}
    >
      <Animated.View
        style={[
          styles.base,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: background,
            borderWidth: variant === 'surface' ? 1 : 0,
            borderColor: theme.colors.line,
            opacity: disabled ? 0.4 : 1,
          },
          animatedStyle,
        ]}
      >
        <Icon size={iconSize} color={iconColor} strokeWidth={2.2} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
