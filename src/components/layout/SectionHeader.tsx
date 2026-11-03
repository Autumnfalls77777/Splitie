import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
};

export function SectionHeader({ title, subtitle, actionLabel, onAction, icon: Icon }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.base}>
      <View style={styles.left}>
        {Icon ? <Icon size={17} color={theme.colors.ink} strokeWidth={2.2} /> : null}
        <View>
          <Text variant="h3">{title}</Text>
          {subtitle ? (
            <Text variant="caption" color={theme.colors.inkSubtle} style={{ marginTop: 1 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {actionLabel && onAction ? (
        <Text
          onPress={onAction}
          style={{
            fontFamily: theme.fonts.bold,
            fontSize: 12.5,
            color: theme.colors.limeDeep,
          }}
        >
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
});
