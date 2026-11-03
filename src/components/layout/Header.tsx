import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

type HeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  left?: ReactNode;
  hideBack?: boolean;
  large?: boolean;
  transparent?: boolean;
};

export function Header({
  title,
  subtitle,
  onBack,
  right,
  left,
  hideBack = false,
  large = false,
  transparent = false,
}: HeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.base, transparent && { backgroundColor: 'transparent' }]}>
      <View style={styles.left}>
        {!hideBack ? (
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel="Go back"
            onPress={() => {
              if (onBack) onBack();
              else if (router.canGoBack()) router.back();
              else router.replace('/(tabs)');
            }}
          />
        ) : null}
        {left}
      </View>
      <View style={styles.titleWrap}>
        {title ? (
          <Text
            variant={large ? 'h1' : 'h3'}
            numberOfLines={1}
            style={{ textAlign: 'center' }}
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            variant="caption"
            color={theme.colors.inkSubtle}
            numberOfLines={1}
            style={{ textAlign: 'center', marginTop: 1 }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    gap: 12,
  },
  left: { minWidth: 44, alignItems: 'flex-start' },
  right: { minWidth: 44, alignItems: 'flex-end' },
  titleWrap: { flex: 1, alignItems: 'center' },
});
