import { Pressable, StyleSheet, View } from 'react-native';
import { Check, UserPlus } from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import type { ClaimMember } from '@/features/trips/sharing';
import { hapticSelect } from '@/lib/haptics';
import { useTheme } from '@/theme';

type ClaimPickerProps = {
  members: ClaimMember[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const NEW_VALUE = 'new';

export function ClaimPicker({ members, value, onChange, disabled = false }: ClaimPickerProps) {
  const theme = useTheme();

  const rowStyle = (selected: boolean) => [
    styles.row,
    {
      borderColor: selected ? theme.colors.ink : theme.colors.line,
      backgroundColor: selected ? theme.colors.surfaceAlt : theme.colors.surface,
      opacity: disabled ? 0.55 : 1,
    },
  ];

  const check = (selected: boolean) => (
    <View
      style={[
        styles.check,
        {
          borderColor: selected ? theme.colors.lime : theme.colors.lineStrong,
          backgroundColor: selected ? theme.colors.lime : 'transparent',
        },
      ]}
    >
      {selected ? <Check size={13} color={theme.colors.onLime} strokeWidth={3} /> : null}
    </View>
  );

  return (
    <View style={{ gap: 8 }}>
      <View>
        <Text variant="h3">Which one are you?</Text>
        <Text variant="bodySmall" color={theme.colors.inkMuted} style={{ marginTop: 2 }}>
          Pick your name so the group sees the right person. If your Google email
          matches a name, we link it automatically.
        </Text>
      </View>

      {members.map((member) => {
        const selected = value === member.id;
        return (
          <Pressable
            key={member.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => {
              hapticSelect();
              onChange(member.id);
            }}
            style={rowStyle(selected)}
          >
            <Avatar name={member.displayName} color={member.color} size={34} />
            <Text style={{ flex: 1, fontFamily: theme.fonts.semibold, fontSize: 14 }}>
              {member.displayName}
            </Text>
            {check(selected)}
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: value === NEW_VALUE, disabled }}
        disabled={disabled}
        onPress={() => {
          hapticSelect();
          onChange(NEW_VALUE);
        }}
        style={rowStyle(value === NEW_VALUE)}
      >
        <View
          style={[
            styles.newIcon,
            { backgroundColor: theme.colors.limeSoft, borderColor: theme.colors.limeSoft },
          ]}
        >
          <UserPlus size={17} color={theme.colors.limeDeep} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 14 }}>I&apos;m someone new</Text>
          <Text variant="caption" color={theme.colors.inkMuted}>
            Add me as a new member
          </Text>
        </View>
        {check(value === NEW_VALUE)}
      </Pressable>
    </View>
  );
}

export const NEW_CLAIM_VALUE = NEW_VALUE;

const styles = StyleSheet.create({
  row: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  check: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
