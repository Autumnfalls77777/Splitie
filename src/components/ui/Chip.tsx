import { Pressable, StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Text } from './Text';
import { hapticSelect } from '@/lib/haptics';
import { useTheme } from '@/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  color?: string;
  count?: number;
  size?: 'sm' | 'md';
};

export function Chip({ label, selected = false, onPress, icon: Icon, color, count, size = 'md' }: ChipProps) {
  const theme = useTheme();
  const textColor = selected ? theme.colors.onLime : color ?? theme.colors.inkMuted;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      onPress={() => {
        if (!onPress) return;
        hapticSelect();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: size === 'sm' ? 32 : 38,
          paddingHorizontal: size === 'sm' ? 12 : 15,
          backgroundColor: selected ? theme.colors.lime : theme.colors.surface,
          borderColor: selected ? theme.colors.lime : theme.colors.line,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {Icon ? <Icon size={size === 'sm' ? 13 : 15} color={textColor} strokeWidth={2.2} /> : null}
      <Text
        style={{
          fontFamily: theme.fonts.semibold,
          fontSize: size === 'sm' ? 12 : 13,
          color: textColor,
        }}
      >
        {label}
      </Text>
      {typeof count === 'number' ? (
        <View
          style={[
            styles.count,
            { backgroundColor: selected ? 'rgba(20,24,15,0.12)' : theme.colors.surfaceAlt },
          ]}
        >
          <Text
            style={{
              fontFamily: theme.fonts.bold,
              fontSize: 10,
              color: selected ? theme.colors.onLime : theme.colors.inkMuted,
            }}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  count: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
