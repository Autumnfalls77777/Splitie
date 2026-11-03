import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme';

type BadgeTone = 'neutral' | 'lime' | 'positive' | 'negative' | 'warning' | 'info';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
};

export function Badge({ label, tone = 'neutral', dot = false }: BadgeProps) {
  const theme = useTheme();
  const palette = {
    neutral: { bg: theme.colors.surfaceAlt, fg: theme.colors.inkMuted },
    lime: { bg: theme.colors.limeSoft, fg: theme.colors.limeDeep },
    positive: { bg: theme.colors.positiveSoft, fg: theme.colors.positive },
    negative: { bg: theme.colors.negativeSoft, fg: theme.colors.negative },
    warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
    info: { bg: theme.colors.infoSoft, fg: theme.colors.info },
  }[tone];

  return (
    <View style={[styles.base, { backgroundColor: palette.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: palette.fg }]} /> : null}
      <Text style={{ fontFamily: theme.fonts.bold, fontSize: 10.5, color: palette.fg }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    height: 22,
    borderRadius: 11,
    alignSelf: 'flex-start',
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
