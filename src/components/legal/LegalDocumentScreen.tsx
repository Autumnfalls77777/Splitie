import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

type LegalDocumentScreenProps = {
  title: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  text: string;
};

export function LegalDocumentScreen({
  title,
  version,
  effectiveDate,
  lastUpdated,
  text,
}: LegalDocumentScreenProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Screen topInset contentBottom={40}>
      <Header title={title} onBack={() => router.back()} />
      <Text
        variant="caption"
        color={theme.colors.inkMuted}
        style={{ marginTop: 16, lineHeight: 18 }}
      >
        Version {version} · Effective {effectiveDate} · Last updated {lastUpdated}
      </Text>
      <View style={[styles.rule, { backgroundColor: theme.colors.line }]} />
      <Text
        selectable
        variant="bodySmall"
        color={theme.colors.ink}
        style={styles.body}
      >
        {text}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rule: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
  },
  body: {
    lineHeight: 22,
  },
});
