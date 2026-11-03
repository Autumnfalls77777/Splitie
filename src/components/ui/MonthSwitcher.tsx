import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Text } from './Text';
import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';

type MonthSwitcherProps = {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  disableNext?: boolean;
  onLabelPress?: () => void;
};

export function MonthSwitcher({ label, onPrevious, onNext, disableNext, onLabelPress }: MonthSwitcherProps) {
  const theme = useTheme();
  return (
    <View style={styles.base}>
      <Pressable
        accessibilityLabel="Previous month"
        onPress={() => {
          hapticTap();
          onPrevious();
        }}
        style={[styles.button, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line }]}
      >
        <ChevronLeft size={18} color={theme.colors.ink} />
      </Pressable>
      <Pressable onPress={onLabelPress} style={styles.label}>
        <Text variant="h3" align="center">
          {label}
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Next month"
        disabled={disableNext}
        onPress={() => {
          if (disableNext) return;
          hapticTap();
          onNext();
        }}
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.line,
            opacity: disableNext ? 0.35 : 1,
          },
        ]}
      >
        <ChevronRight size={18} color={theme.colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  button: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, alignItems: 'center' },
});
