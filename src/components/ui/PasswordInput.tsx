import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { Input } from './Input';
import { useTheme } from '@/theme';

type PasswordInputProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  hint?: string;
};

export function PasswordInput({
  label = 'Password',
  value,
  onChangeText,
  onBlur,
  error,
  placeholder = 'At least 6 characters',
  hint,
}: PasswordInputProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      error={error}
      hint={hint}
      placeholder={placeholder}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={10}
          onPress={() => setVisible((current) => !current)}
          style={styles.button}
        >
          {visible ? (
            <EyeOff size={18} color={theme.colors.inkSubtle} />
          ) : (
            <Eye size={18} color={theme.colors.inkSubtle} />
          )}
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  button: { padding: 2 },
});
