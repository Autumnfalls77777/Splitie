import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type CardVariant = 'surface' | 'lime' | 'ink' | 'outline' | 'sunken';

type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radius?: number;
  shadow?: boolean;
  accessibilityLabel?: string;
};

export function Card({
  children,
  variant = 'surface',
  onPress,
  style,
  padding,
  radius,
  shadow = false,
  accessibilityLabel,
}: CardProps) {
  const theme = useTheme();

  const palette = {
    surface: { background: theme.colors.surface, border: theme.colors.line },
    lime: { background: theme.colors.lime, border: 'transparent' },
    ink: { background: theme.colors.ink, border: 'transparent' },
    outline: { background: 'transparent', border: theme.colors.line },
    sunken: { background: theme.colors.surfaceAlt, border: 'transparent' },
  }[variant];

  const content = (
    <View
      style={[
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: radius ?? theme.radius.xl,
          padding: padding ?? theme.spacing.xl,
        },
        shadow ? theme.shadows.card : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
