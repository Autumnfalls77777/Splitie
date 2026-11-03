import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BellRing, ChevronRight, Sparkles } from 'lucide-react-native';

import { LogoMark } from '@/components/brand/Logo';
import { DonutChart } from '@/components/charts/DonutChart';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useSettingsStore } from '@/features/settings/settings.store';
import { formatMoney } from '@/lib/money';
import { hapticSelect, hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';

const SLIDES = [
  {
    kicker: 'Trips with friends',
    title: 'Money stuff, minus the awkward.',
    body: 'Log what everyone spends on the trip. Splitie works out exactly who owes whom, down to the last rupee.',
  },
  {
    kicker: 'Your own money',
    title: 'See where it all actually went.',
    body: 'Track daily spends like chai, groceries and rent. Get a clear monthly picture with charts that make sense.',
  },
  {
    kicker: 'Gentle reminders',
    title: 'Nudges, not nagging.',
    body: 'Set a reminder and Splitie pings the right person at the right time. No more “hey, remember…” messages.',
  },
];

function ReceiptIllustration() {
  const theme = useTheme();
  const rows = [
    { name: 'Rohan', color: '#F3A26F', amount: '₹2,400' },
    { name: 'Neha', color: '#8FC9F5', amount: '₹970' },
    { name: 'Kabir', color: '#C8B4F5', amount: '₹480' },
  ];
  return (
    <View style={[styles.receipt, { backgroundColor: theme.colors.white, borderColor: theme.colors.ink }]}>
      <View style={styles.receiptHeader}>
        <View>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10, color: theme.colors.ink }}>Trip split</Text>
          <Text style={{ fontFamily: theme.fonts.display, fontSize: 24, letterSpacing: -0.6 }}>Goa Squad</Text>
        </View>
        <Sparkles size={30} color={theme.colors.limeDeep} />
      </View>
      <View style={[styles.dashed, { borderColor: theme.colors.lineStrong }]} />
      {rows.map((row) => (
        <View key={row.name} style={styles.receiptRow}>
          <Avatar name={row.name} color={row.color} size={26} />
          <Text style={{ flex: 1, fontFamily: theme.fonts.semibold, fontSize: 12.5, color: theme.colors.ink }}>{row.name}</Text>
          <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12.5, color: theme.colors.ink }}>{row.amount}</Text>
        </View>
      ))}
      <View style={[styles.dashed, { borderColor: theme.colors.lineStrong }]} />
      <View style={styles.receiptRow}>
        <Text style={{ flex: 1, fontFamily: theme.fonts.semibold, fontSize: 11.5, color: theme.colors.ink }}>
          Total spent
        </Text>
        <Text style={{ fontFamily: theme.fonts.display, fontSize: 20 }}>₹42,790</Text>
      </View>
      <View style={[styles.balancePill, { backgroundColor: theme.colors.lime }]}>
        <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11.5, color: theme.colors.onLime }}>
          You are owed ₹6,477
        </Text>
      </View>
    </View>
  );
}

function DonutIllustration() {
  const theme = useTheme();
  const segments = [
    { value: 42, color: theme.colors.clay },
    { value: 24, color: theme.colors.sky },
    { value: 18, color: theme.colors.limeDeep },
    { value: 16, color: theme.colors.lilac },
  ];
  return (
    <View style={[styles.donutCard, { backgroundColor: theme.colors.white, borderColor: theme.colors.ink }]}>
      <View style={styles.donutRow}>
        <DonutChart segments={segments} size={132} strokeWidth={16}>
          <Text style={{ fontFamily: theme.fonts.display, fontSize: 22, letterSpacing: -0.6 }}>₹42k</Text>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 9.5, color: theme.colors.inkSubtle }}>this month</Text>
        </DonutChart>
        <View style={{ flex: 1, gap: 10 }}>
          {[
            { label: 'Food', value: '42%', color: theme.colors.clay },
            { label: 'Rent', value: '24%', color: theme.colors.sky },
            { label: 'Fun', value: '18%', color: theme.colors.limeDeep },
            { label: 'Other', value: '16%', color: theme.colors.lilac },
          ].map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color }} />
              <Text style={{ flex: 1, fontFamily: theme.fonts.semibold, fontSize: 11 }}>{item.label}</Text>
              <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11 }}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.dashed, { borderColor: theme.colors.lineStrong, marginTop: 18 }]} />
      <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.inkMuted, marginTop: 12 }}>
        Food was your biggest category this month.
      </Text>
    </View>
  );
}

function NotificationIllustration() {
  const theme = useTheme();
  return (
    <View style={styles.notificationWrap}>
      <View style={[styles.noteCard, { backgroundColor: theme.colors.white, borderColor: theme.colors.ink, transform: [{ rotate: '-3deg' }] }]}>
        <View style={[styles.noteIcon, { backgroundColor: theme.colors.limeSoft }]}>
          <BellRing size={18} color={theme.colors.limeDeep} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12 }}>Ishita still owes you ₹6,108</Text>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle, marginTop: 2 }}>
            Goa Squad · due in 2 days
          </Text>
        </View>
      </View>
      <View style={[styles.noteCard, styles.noteCardSecond, { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink }]}>
        <View style={[styles.noteIcon, { backgroundColor: 'rgba(201,242,91,0.16)' }]}>
          <Sparkles size={18} color={theme.colors.lime} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12, color: theme.colors.inkInverse }}>
            Nice. Bangalore Weekend is all settled.
          </Text>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkInverse, opacity: 0.6, marginTop: 2 }}>
            Three friends, zero awkwardness.
          </Text>
        </View>
      </View>
      <View style={[styles.noteCard, styles.noteCardThird, { backgroundColor: theme.colors.white, borderColor: theme.colors.ink, transform: [{ rotate: '2deg' }] }]}>
        <View style={[styles.noteIcon, { backgroundColor: theme.colors.amberSoft }]}>
          <BellRing size={18} color={theme.colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12 }}>Goa Squad is 95% through its budget</Text>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle, marginTop: 2 }}>
            Keep the last two days light.
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);

  const finish = () => {
    completeOnboarding();
    router.replace('/welcome');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      hapticTap();
      scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.lime, paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <LogoMark size={34} color={theme.colors.onLime} softColor="#3C4A26" />
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12.5, color: theme.colors.onLime, opacity: 0.6 }}>
            Skip
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          if (nextIndex !== index) {
            hapticSelect();
            setIndex(nextIndex);
          }
        }}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, slideIndex) => (
          <View key={slide.title} style={{ width, paddingHorizontal: 24, paddingTop: 20 }}>
            <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12, color: theme.colors.onLime, opacity: 0.55 }}>
              {slide.kicker}
            </Text>
            <Text
              style={{
                fontFamily: theme.fonts.displayXBold,
                fontSize: 38,
                lineHeight: 41,
                letterSpacing: -1.5,
                color: theme.colors.onLime,
                marginTop: 8,
              }}
            >
              {slide.title}
            </Text>
            <Text
              style={{
                fontFamily: theme.fonts.medium,
                fontSize: 14.5,
                lineHeight: 22,
                color: theme.colors.onLime,
                opacity: 0.68,
                marginTop: 12,
                maxWidth: 330,
              }}
            >
              {slide.body}
            </Text>
            <View style={styles.illustration}>
              {slideIndex === 0 ? <ReceiptIllustration /> : null}
              {slideIndex === 1 ? <DonutIllustration /> : null}
              {slideIndex === 2 ? <NotificationIllustration /> : null}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18) + 10 }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, dotIndex) => (
            <View
              key={slide.title}
              style={{
                width: dotIndex === index ? 24 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.colors.onLime,
                opacity: dotIndex === index ? 1 : 0.25,
              }}
            />
          ))}
        </View>
        <Button
          label={index === SLIDES.length - 1 ? 'Start splitting' : 'Next'}
          onPress={next}
          variant="dark"
          size="lg"
          fullWidth
          icon={index === SLIDES.length - 1 ? Sparkles : ChevronRight}
          iconPosition="right"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  illustration: { flex: 1, justifyContent: 'center', paddingBottom: 8 },
  receipt: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    marginTop: 26,
    transform: [{ rotate: '-1.5deg' }],
    shadowColor: '#4F6B16',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dashed: { borderBottomWidth: 1, borderStyle: 'dashed', marginVertical: 12 },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5 },
  balancePill: { marginTop: 10, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  donutCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    marginTop: 26,
    transform: [{ rotate: '1deg' }],
    shadowColor: '#4F6B16',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  notificationWrap: { marginTop: 26, gap: 12, paddingHorizontal: 4 },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 13,
    shadowColor: '#4F6B16',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  noteCardSecond: { marginLeft: 24 },
  noteCardThird: { marginRight: 18 },
  noteIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 16 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
});
