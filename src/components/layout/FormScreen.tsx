import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from './Header';
import { useTheme } from '@/theme';

type FormScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
  onBack?: () => void;
};

/** Shared layout for modal forms: scrollable body, pinned action footer. */
export function FormScreen({ title, subtitle, children, footer, onBack }: FormScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: theme.spacing.xl,
          paddingBottom: 28,
        }}
      >
        <Header title={title} subtitle={subtitle} onBack={onBack} />
        <View style={{ paddingTop: 18 }}>{children}</View>
      </ScrollView>
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.bgElevated,
            borderTopColor: theme.colors.line,
            paddingBottom: Math.max(insets.bottom, 12) + 10,
          },
        ]}
      >
        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12 },
});
