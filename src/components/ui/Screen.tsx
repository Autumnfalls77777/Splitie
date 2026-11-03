import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  topInset?: boolean;
  bottomInset?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ScrollViewProps['refreshControl'];
  footer?: ReactNode;
  background?: string;
  contentBottom?: number;
};

export function Screen({
  children,
  scroll = true,
  padded = true,
  topInset = true,
  bottomInset = false,
  style,
  contentContainerStyle,
  refreshControl,
  footer,
  background,
  contentBottom,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const paddingTop = topInset ? insets.top : 0;
  const paddingBottom = contentBottom ?? (bottomInset ? insets.bottom : 0) + 108;

  const content = (
    <View
      style={[
        styles.content,
        padded && { paddingHorizontal: theme.spacing.xl },
        { paddingTop: paddingTop + 8, paddingBottom },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: background ?? theme.colors.bg }, style]}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.scrollContent}>{content}</View>
      )}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flexGrow: 1 },
});
