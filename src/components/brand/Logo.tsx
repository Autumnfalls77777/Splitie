import { StyleSheet, View } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

type LogoMarkProps = {
  size?: number;
  color?: string;
  softColor?: string;
  background?: string;
  radius?: number;
};

/** Splitie's split-coin mark. */
export function LogoMark({
  size = 40,
  color,
  softColor,
  background = 'transparent',
  radius = 0,
}: LogoMarkProps) {
  const theme = useTheme();
  const ink = color ?? theme.colors.ink;
  const soft = softColor ?? ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      {background !== 'transparent' ? (
        <Rect width={1024} height={1024} rx={radius} fill={background} />
      ) : null}
      <G transform="rotate(-22 512 512)">
        <Path d="M192 512 A320 320 0 0 1 832 512 Z" fill={ink} />
        <G transform="translate(0 42)">
          <Path d="M192 512 A320 320 0 0 0 832 512 Z" fill={soft} />
        </G>
      </G>
    </Svg>
  );
}

type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  tone?: 'ink' | 'lime' | 'auto';
  background?: string;
};

export function Logo({ size = 44, showWordmark = true, tone = 'auto', background }: LogoProps) {
  const theme = useTheme();
  const isLime = tone === 'lime';
  const ink = isLime ? theme.colors.onLime : theme.colors.ink;
  const soft = isLime ? theme.colors.onLime : theme.colors.inkMuted;

  return (
    <View style={styles.row}>
      <LogoMark
        size={size}
        color={ink}
        softColor={soft}
        background={background}
        radius={size * 0.28}
      />
      {showWordmark ? (
        <View style={styles.wordmark}>
          <Text
            style={{
              fontFamily: theme.fonts.displayXBold,
              fontSize: size * 0.62,
              lineHeight: size * 0.7,
              letterSpacing: -1.4,
              color: ink,
            }}
          >
            splitie
          </Text>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: isLime ? theme.colors.onLime : theme.colors.limeDeep,
                width: size * 0.13,
                height: size * 0.13,
                borderRadius: size,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { flexDirection: 'row', alignItems: 'flex-end' },
  dot: { marginBottom: 6, marginLeft: 3 },
});
