import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { initials } from '@/lib/id';
import { readableInk } from '@/lib/color';
import { useTheme } from '@/theme';

type AvatarProps = {
  name: string;
  color: string;
  size?: number;
  ring?: boolean;
  ringColor?: string;
  fontSize?: number;
};

export function Avatar({ name, color, size = 38, ring = false, ringColor, fontSize }: AvatarProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: ring ? 2 : 0,
          borderColor: ringColor ?? theme.colors.surface,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: theme.fonts.bold,
          fontSize: fontSize ?? size * 0.36,
          lineHeight: size * 0.44,
          color: readableInk(color),
          letterSpacing: -0.2,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

type AvatarStackProps = {
  members: { id: string; name: string; color: string }[];
  size?: number;
  max?: number;
  ringColor?: string;
};

export function AvatarStack({ members, size = 30, max = 4, ringColor }: AvatarStackProps) {
  const theme = useTheme();
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <View style={styles.stack}>
      {visible.map((member, index) => (
        <View
          key={member.id}
          style={[
            styles.stackItem,
            {
              marginLeft: index === 0 ? 0 : -size * 0.28,
              zIndex: visible.length - index,
            },
          ]}
        >
          <Avatar
            name={member.name}
            color={member.color}
            size={size}
            ring
            ringColor={ringColor ?? theme.colors.surface}
            fontSize={size * 0.34}
          />
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={[
            styles.stackItem,
            styles.overflow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -size * 0.28,
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: ringColor ?? theme.colors.surface,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: theme.fonts.bold,
              fontSize: size * 0.3,
              color: theme.colors.inkMuted,
            }}
          >
            +{overflow}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  stack: { flexDirection: 'row', alignItems: 'center' },
  stackItem: {},
  overflow: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
