import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { legalRoute } from '@/features/legal/consent';
import { useTheme } from '@/theme';

type ConsentCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function ConsentCheckbox({ checked, onChange, disabled = false }: ConsentCheckboxProps) {
  const theme = useTheme();
  const router = useRouter();

  const linkStyle = {
    fontFamily: theme.fonts.bold,
    color: theme.colors.ink,
    textDecorationLine: 'underline' as const,
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
        disabled={disabled}
        hitSlop={10}
        onPress={() => onChange(!checked)}
        style={styles.checkHit}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: checked ? theme.colors.limeDeep : theme.colors.inkMuted,
              backgroundColor: checked ? theme.colors.lime : 'transparent',
            },
          ]}
        >
          {checked ? <Check size={13} color={theme.colors.onLime} strokeWidth={3.2} /> : null}
        </View>
      </Pressable>

      <Text variant="bodySmall" color={theme.colors.inkMuted} style={styles.copy}>
        I agree to the{' '}
        <Text
          accessibilityRole="link"
          accessibilityLabel="Open Terms of Service"
          onPress={() => router.push(legalRoute('terms'))}
          style={linkStyle}
        >
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text
          accessibilityRole="link"
          accessibilityLabel="Open Privacy Policy"
          onPress={() => router.push(legalRoute('privacy'))}
          style={linkStyle}
        >
          Privacy Policy
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 18,
  },
  checkHit: {
    paddingTop: 1,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    lineHeight: 20,
  },
});
