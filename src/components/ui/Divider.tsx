import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

type DividerProps = {
  dashed?: boolean;
  color?: string;
  vertical?: boolean;
  inset?: number;
};

export function Divider({ dashed = false, color, vertical = false, inset = 0 }: DividerProps) {
  const theme = useTheme();
  if (vertical) {
    return (
      <View
        style={{
          width: StyleSheet.hairlineWidth,
          alignSelf: 'stretch',
          backgroundColor: color ?? theme.colors.line,
          marginVertical: inset,
        }}
      />
    );
  }
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: dashed ? 'transparent' : (color ?? theme.colors.line),
        borderBottomWidth: dashed ? 1 : 0,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: color ?? theme.colors.lineStrong,
        marginHorizontal: inset,
      }}
    />
  );
}
