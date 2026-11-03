import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({ icon: Icon, title, body, actionLabel, onAction, compact }: EmptyStateProps) {
  const theme = useTheme();
  const size = compact ? 64 : 84;

  return (
    <View style={[styles.base, { paddingVertical: compact ? 24 : 40 }]}>
      <View
        style={[
          styles.iconWrap,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.limeSoft,
          },
        ]}
      >
        <Icon size={compact ? 26 : 34} color={theme.colors.limeDeep} strokeWidth={1.8} />
      </View>
      <Text variant="h2" align="center" style={{ marginTop: 18 }}>
        {title}
      </Text>
      <Text
        variant="body"
        color={theme.colors.inkMuted}
        align="center"
        style={{ marginTop: 6, maxWidth: 280 }}
      >
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="dark"
          size="sm"
          style={{ marginTop: 20 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
});
