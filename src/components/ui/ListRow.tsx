import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Text } from './Text';
import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBackground?: string;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  last?: boolean;
  toggle?: ReactNode;
};

export function ListRow({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  iconBackground,
  right,
  onPress,
  destructive = false,
  showChevron = false,
  last = false,
  toggle,
}: ListRowProps) {
  const theme = useTheme();
  const titleColor = destructive ? theme.colors.negative : theme.colors.ink;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={() => {
        if (!onPress) return;
        hapticTap();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed && onPress ? 0.7 : 1 }]}
    >
      <View style={[styles.base, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.line }]}>
        {Icon ? (
          <View
            style={[
              styles.icon,
              {
                backgroundColor: iconBackground ?? theme.colors.surfaceAlt,
                borderRadius: 13,
              },
            ]}
          >
            <Icon size={19} color={iconColor ?? theme.colors.inkMuted} strokeWidth={2} />
          </View>
        ) : null}
        <View style={styles.text}>
          <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 14.5, color: titleColor }}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                fontFamily: theme.fonts.medium,
                fontSize: 12,
                color: theme.colors.inkSubtle,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
        {toggle}
        {showChevron ? <ChevronRight size={17} color={theme.colors.inkSubtle} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    minHeight: 62,
  },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
});
