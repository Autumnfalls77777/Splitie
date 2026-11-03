import { forwardRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Text } from './Text';
import { useTheme } from '@/theme';

type InputProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  prefix?: string;
  suffix?: string;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps['style'];
};

export const Input = forwardRef<TextInputInstance, InputProps>(function Input(
  { label, hint, error, icon: Icon, prefix, suffix, right, containerStyle, inputStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.colors.negative : focused ? theme.colors.ink : theme.colors.line;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text
          style={{
            fontFamily: theme.fonts.semibold,
            fontSize: 12.5,
            color: theme.colors.inkMuted,
            marginBottom: 7,
            marginLeft: 4,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surface,
            borderColor,
            borderRadius: theme.radius.lg,
            minHeight: rest.multiline ? 100 : 52,
          },
        ]}
      >
        {Icon ? <Icon size={18} color={theme.colors.inkSubtle} strokeWidth={2} /> : null}
        {prefix ? (
          <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 15, color: theme.colors.inkSubtle }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.inkSubtle}
          selectionColor={theme.colors.limeDeep}
          {...rest}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            {
              color: theme.colors.ink,
              fontFamily: theme.fonts.medium,
              fontSize: 15,
              textAlignVertical: rest.multiline ? 'top' : 'center',
              paddingTop: rest.multiline ? 14 : 0,
            },
            inputStyle,
          ]}
        />
        {suffix ? (
          <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 14, color: theme.colors.inkSubtle }}>
            {suffix}
          </Text>
        ) : null}
        {right}
      </View>
      {error ? (
        <Text
          style={{
            fontFamily: theme.fonts.medium,
            fontSize: 11.5,
            color: theme.colors.negative,
            marginTop: 6,
            marginLeft: 4,
          }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={{
            fontFamily: theme.fonts.medium,
            fontSize: 11.5,
            color: theme.colors.inkSubtle,
            marginTop: 6,
            marginLeft: 4,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    paddingHorizontal: 15,
  },
  input: { flex: 1, paddingVertical: 0 },
});
