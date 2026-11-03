import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { Text } from './Text';
import { hapticSelect } from '@/lib/haptics';
import { useTheme } from '@/theme';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  disabled?: boolean;
};

export function Checkbox({ checked, onChange, label, subtitle, right, disabled }: CheckboxProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        hapticSelect();
        onChange(!checked);
      }}
      style={({ pressed }) => [styles.base, { opacity: pressed ? 0.75 : disabled ? 0.5 : 1 }]}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? theme.colors.lime : 'transparent',
            borderColor: checked ? theme.colors.lime : theme.colors.lineStrong,
          },
        ]}
      >
        {checked ? <Check size={13} color={theme.colors.onLime} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 14 }}>{label}</Text>
        {subtitle ? (
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle, marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
