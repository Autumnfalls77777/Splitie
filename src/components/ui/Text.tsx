import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';
import type { typography } from '@/theme/tokens';

type TextVariant = keyof typeof typography;

type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
  opacity?: number;
};

export function Text({
  variant = 'body',
  color,
  align,
  weight,
  opacity,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        theme.typography[variant],
        { color: color ?? theme.colors.ink, textAlign: align, opacity },
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    />
  );
}
