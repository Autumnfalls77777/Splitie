import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Plus, X } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { COVERS, EMOJIS } from '@/data/categories';
import { useAuthStore } from '@/features/auth/auth.store';
import { useSettingsStore } from '@/features/settings/settings.store';
import { useUIStore } from '@/features/settings/ui.store';
import { useTripStore } from '@/features/trips/trips.store';
import { addDaysISO, todayISO } from '@/lib/date';
import { parseAmount } from '@/lib/money';
import { hapticSelect, hapticSuccess } from '@/lib/haptics';
import { useTheme } from '@/theme';
import type { TripCover } from '@/types/models';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Give the trip a name.'),
    destination: z.string().trim().min(2, 'Where are you going?'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a start date.'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick an end date.'),
    budget: z.string().optional(),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: 'The trip cannot end before it starts.',
    path: ['endDate'],
  })
  .refine((values) => !values.budget || parseAmount(values.budget) > 0, {
    message: 'Enter a budget above zero, or leave it blank.',
    path: ['budget'],
  });

type FormValues = z.infer<typeof schema>;

export default function NewTripScreen() {
  const theme = useTheme();
  const router = useRouter();
  const posthog = usePostHog();
  const user = useAuthStore((state) => state.user);
  const addTrip = useTripStore((state) => state.addTrip);
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);
  const showToast = useUIStore((state) => state.showToast);

  const [emoji, setEmoji] = useState('🏝️');
  const [cover, setCover] = useState<TripCover>('lime');
  const [members, setMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      destination: '',
      startDate: todayISO(),
      endDate: addDaysISO(todayISO(), 3),
      budget: '',
    },
  });

  if (!user) return <Redirect href="/welcome" />;

  const name = watch('name');
  const destination = watch('destination');
  const selectedCover = COVERS[cover];

  const addMember = () => {
    const value = memberInput.trim();
    if (value.length < 2) {
      showToast('Add a name with at least 2 characters', { kind: 'error' });
      return;
    }
    if (members.some((member) => member.toLowerCase() === value.toLowerCase())) {
      showToast('That person is already on the trip', { kind: 'error' });
      return;
    }
    if (members.length >= 12) {
      showToast('A trip can have up to 13 people', { kind: 'error' });
      return;
    }
    hapticSelect();
    setMembers((current) => [...current, value]);
    setMemberInput('');
  };

  const onSubmit = handleSubmit((values) => {
    const budgetPaise = values.budget ? parseAmount(values.budget) : undefined;
    const trip = addTrip({
      name: values.name,
      destination: values.destination,
      emoji,
      cover,
      startDate: values.startDate,
      endDate: values.endDate,
      budgetPaise,
      memberNames: members,
      you: user,
    });
    posthog?.capture('trip_created', {
      cover,
      has_budget: Boolean(budgetPaise),
      member_count: trip.members.length,
    });
    completeOnboarding();
    hapticSuccess();
    showToast('Trip created', { description: `${trip.members.length} people ready to split.` });
    router.replace(`/trip/${trip.id}`);
  });

  return (
    <FormScreen
      title="New trip"
      subtitle="Set the scene. Add the maths later."
      footer={
        <Button
          label="Create trip"
          variant="dark"
          size="lg"
          fullWidth
          icon={ArrowRight}
          iconPosition="right"
          loading={isSubmitting}
          onPress={onSubmit}
        />
      }
    >
      <LinearGradient
        colors={selectedCover.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.preview}
      >
        <View style={styles.previewTop}>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: selectedCover.ink, opacity: 0.6 }}>
            Your next trip
          </Text>
          <Text style={{ fontSize: 34 }}>{emoji}</Text>
        </View>
        <View>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: theme.fonts.display,
              fontSize: 25,
              letterSpacing: -0.7,
              color: selectedCover.ink,
            }}
          >
            {name.trim() || 'Somewhere good'}
          </Text>
          <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 11.5, color: selectedCover.ink, opacity: 0.65 }}>
            {destination.trim() || 'Pick a destination below'}
          </Text>
        </View>
      </LinearGradient>

      <Text style={styles.label}>Trip cover</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingVertical: 2 }}>
        {(Object.keys(COVERS) as TripCover[]).map((key) => {
          const option = COVERS[key];
          const selected = cover === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${option.label} cover`}
              onPress={() => {
                hapticSelect();
                setCover(key);
              }}
              style={{ alignItems: 'center', gap: 5 }}
            >
              <LinearGradient
                colors={option.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.coverSwatch,
                  {
                    borderColor: selected ? theme.colors.ink : 'transparent',
                    borderWidth: selected ? 2 : 0,
                  },
                ]}
              >
                <Text style={{ fontSize: 20 }}>{option.emoji}</Text>
              </LinearGradient>
              <Text
                style={{
                  fontFamily: selected ? theme.fonts.bold : theme.fonts.medium,
                  fontSize: 10,
                  color: selected ? theme.colors.ink : theme.colors.inkSubtle,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.label}>Trip icon</Text>
      <View style={styles.emojiGrid}>
        {EMOJIS.map((option) => {
          const selected = emoji === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`Use ${option}`}
              onPress={() => {
                hapticSelect();
                setEmoji(option);
              }}
              style={[
                styles.emojiCell,
                {
                  backgroundColor: selected ? theme.colors.lime : theme.colors.surface,
                  borderColor: selected ? theme.colors.lime : theme.colors.line,
                },
              ]}
            >
              <Text style={{ fontSize: 21 }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 15, marginTop: 20 }}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              label="Trip name"
              placeholder="Goa Squad"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
            />
          )}
        />
        <Controller
          control={control}
          name="destination"
          render={({ field, fieldState }) => (
            <Input
              label="Destination"
              placeholder="Goa, India"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
            />
          )}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="startDate"
              render={({ field, fieldState }) => (
                <DateField
                  label="Starts"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="endDate"
              render={({ field, fieldState }) => (
                <DateField
                  label="Ends"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="budget"
          render={({ field, fieldState }) => (
            <Input
              label="Trip budget (optional)"
              placeholder="45000"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="decimal-pad"
              prefix="₹"
              hint="We will show a quiet progress bar, not send alerts."
            />
          )}
        />
      </View>

      <Text style={styles.label}>Who is coming?</Text>
      <View style={styles.memberRow}>
        <Input
          value={memberInput}
          onChangeText={setMemberInput}
          placeholder="Add a friend's name"
          containerStyle={{ flex: 1 }}
          onSubmitEditing={addMember}
          returnKeyType="done"
          autoCapitalize="words"
        />
        <IconButton
          icon={Plus}
          variant="lime"
          accessibilityLabel="Add this person to the trip"
          onPress={addMember}
        />
      </View>

      <View style={{ gap: 8, marginTop: 12 }}>
        <View style={[styles.memberChip, { backgroundColor: theme.colors.limeSoft }]}>
          <Avatar name={user.name} color={theme.colors.lime} size={26} />
          <Text style={{ flex: 1, fontFamily: theme.fonts.semibold, fontSize: 12.5 }}>{user.name} (you)</Text>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle }}>Included</Text>
        </View>
        {members.map((member, index) => (
          <View key={`${member}-${index}`} style={[styles.memberChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line }]}>
            <Avatar name={member} color={['#F3A26F', '#8FC9F5', '#C8B4F5', '#F2A7C3', '#7FD8C2'][index % 5]} size={26} />
            <Text style={{ flex: 1, fontFamily: theme.fonts.semibold, fontSize: 12.5 }}>{member}</Text>
            <Pressable
              accessibilityLabel={`Remove ${member}`}
              hitSlop={8}
              onPress={() => setMembers((current) => current.filter((_, itemIndex) => itemIndex !== index))}
            >
              <X size={16} color={theme.colors.inkSubtle} />
            </Pressable>
          </View>
        ))}
        {members.length === 0 ? (
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle, marginLeft: 3 }}>
            Just you for now. You can add people later.
          </Text>
        ) : null}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  preview: { borderRadius: 24, padding: 18, height: 132, justifyContent: 'space-between', marginBottom: 22 },
  previewTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  label: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12.5,
    marginTop: 18,
    marginBottom: 9,
    marginLeft: 4,
  },
  coverSwatch: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiCell: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 9, borderWidth: 1, borderColor: 'transparent' },
});
