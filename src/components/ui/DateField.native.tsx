import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';

import { Text } from './Text';
import { formatDate, fromISODate, toISODate } from '@/lib/date';
import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';

export type DateFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function DateField({ label = 'Date', value, onChange, error }: DateFieldProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setVisible(false);
    if (event.type === 'set' && date) onChange(toISODate(date));
  };

  return (
    <View>
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
      <Pressable
        onPress={() => {
          hapticTap();
          setVisible(true);
        }}
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.negative : theme.colors.line,
            borderRadius: theme.radius.lg,
          },
        ]}
      >
        <CalendarDays size={18} color={theme.colors.inkSubtle} />
        <Text variant="bodyMedium" style={{ flex: 1 }}>
          {formatDate(value, 'long')}
        </Text>
      </Pressable>
      {error ? (
        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.negative, marginTop: 6, marginLeft: 4 }}>
          {error}
        </Text>
      ) : null}
      {visible ? (
        <DateTimePicker
          value={fromISODate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          maximumDate={new Date(2100, 11, 31)}
        />
      ) : null}
      {visible && Platform.OS === 'ios' ? (
        <Pressable
          onPress={() => setVisible(false)}
          style={{ alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12 }}
        >
          <Text style={{ fontFamily: theme.fonts.bold, color: theme.colors.limeDeep }}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
  },
});
