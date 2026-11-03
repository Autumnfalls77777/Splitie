import { useCallback, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';

import { Text } from './Text';
import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';

type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Custom leading artwork, such as a brand mark. Rendered before the label. */
  iconElement?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  accessibilityLabel?: string;
};

const HEIGHTS: Record<ButtonSize, number> = { sm: 40, md: 50, lg: 58 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconElement,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  haptic = true,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    if (haptic) hapticTap();
    onPress?.();
  }, [haptic, isDisabled, onPress]);

  const palette = {
    primary: {
      background: theme.colors.lime,
      text: theme.colors.onLime,
      border: 'transparent',
    },
    dark: {
      background: theme.colors.ink,
      text: theme.colors.inkInverse,
      border: 'transparent',
    },
    secondary: {
      background: theme.colors.surface,
      text: theme.colors.ink,
      border: theme.colors.line,
    },
    ghost: {
      background: 'transparent',
      text: theme.colors.ink,
      border: 'transparent',
    },
    danger: {
      background: theme.colors.negativeSoft,
      text: theme.colors.negative,
      border: 'transparent',
    },
  }[variant];

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={isDisabled}
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.965, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
      }}
      style={[fullWidth && styles.fullWidth, style]}
    >
      <Animated.View
        style={[
          styles.base,
          {
            height: HEIGHTS[size],
            backgroundColor: palette.background,
            borderColor: palette.border,
            borderWidth: variant === 'secondary' ? 1 : 0,
            paddingHorizontal: size === 'sm' ? 14 : size === 'lg' ? 24 : 18,
            opacity: isDisabled ? 0.45 : 1,
            borderRadius: theme.radius.pill,
          },
          variant === 'primary' && !isDisabled ? theme.shadows.card : null,
          animatedStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.text} size="small" />
        ) : (
          <View style={styles.content}>
            {iconElement ??
              (Icon && iconPosition === 'left' ? (
                <Icon size={iconSize} color={palette.text} strokeWidth={2.4} />
              ) : null)}
            <Text
              style={{
                fontFamily: theme.fonts.bold,
                fontSize: size === 'sm' ? 13.5 : size === 'lg' ? 16.5 : 15,
                letterSpacing: -0.2,
                color: palette.text,
              }}
            >
              {label}
            </Text>
            {Icon && iconPosition === 'right' ? (
              <Icon size={iconSize} color={palette.text} strokeWidth={2.4} />
            ) : null}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
