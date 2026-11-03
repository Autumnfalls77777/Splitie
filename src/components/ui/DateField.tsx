import { Input } from '@/components/ui/Input';
import { todayISO } from '@/lib/date';

export type DateFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function DateField({ label = 'Date', value, onChange, error }: DateFieldProps) {
  return (
    <Input
      label={label}
      value={value}
      onChangeText={(text) => {
        if (/^\d{0,4}-?\d{0,2}-?\d{0,2}$/.test(text)) onChange(text);
      }}
      onBlur={() => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) onChange(todayISO());
      }}
      placeholder="YYYY-MM-DD"
      hint="Use YYYY-MM-DD"
      error={error}
      keyboardType="numbers-and-punctuation"
      autoCapitalize="none"
    />
  );
}
