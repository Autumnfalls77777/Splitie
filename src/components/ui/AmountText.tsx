import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme';

type AmountTextProps = {
  children: string;
  tone?: 'default' | 'positive' | 'negative' | 'muted' | 'inverse';
  variant?: 'numeric' | 'numericSmall' | 'numericTiny' | 'bodyMedium';
  align?: 'left' | 'right' | 'center';
  strikethrough?: boolean;
};

export function AmountText({
  children,
  tone = 'default',
  variant = 'numericSmall',
  align = 'left',
  strikethrough = false,
}: AmountTextProps) {
  const theme = useTheme();
  const color = {
    default: theme.colors.ink,
    positive: theme.colors.positive,
    negative: theme.colors.negative,
    muted: theme.colors.inkMuted,
    inverse: theme.colors.inkInverse,
  }[tone];

  return (
    <View>
      <Text
        variant={variant}
        style={[
          { color, textAlign: align, fontVariant: ['tabular-nums'] },
          strikethrough ? styles.strike : null,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strike: { textDecorationLine: 'line-through' },
});
