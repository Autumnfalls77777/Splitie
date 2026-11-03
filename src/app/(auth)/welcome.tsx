import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Sparkles } from 'lucide-react-native';

import { Logo } from '@/components/brand/Logo';
import { Avatar, AvatarStack } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { legalRoute } from '@/features/legal/consent';
import { onboardingColors } from '@/features/onboarding/palette';
import { useTheme } from '@/theme';

export default function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.lime }]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 8,
        }}
        bounces={false}
      >
        <View style={styles.topBar}>
          <Logo size={38} tone="lime" />
        </View>

        <View style={styles.hero}>
          <Text
            style={{
              fontFamily: theme.fonts.displayXBold,
              fontSize: 40,
              lineHeight: 42,
              letterSpacing: -1.8,
              color: theme.colors.onLime,
            }}
          >
            Good trips.{'\n'}Zero awkward maths.
          </Text>
          <Text
            style={{
              fontFamily: theme.fonts.medium,
              fontSize: 14.5,
              lineHeight: 22,
              color: theme.colors.onLime,
              opacity: 0.66,
              marginTop: 8,
              maxWidth: 320,
            }}
          >
            Split trip costs with friends, track your own spending, and get gentle reminders when it is time to pay up.
          </Text>

          <View style={styles.previewWrap}>
            <LinearGradient
              colors={['#FFFFFF', '#F7F9EC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.previewCard, { borderColor: onboardingColors.ink }]}
            >
              <View style={styles.previewTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.emojiWrap, { backgroundColor: onboardingColors.limeSoft }]}>
                    <Sparkles size={24} color={onboardingColors.limeDeep} />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontFamily: theme.fonts.display,
                        fontSize: 20,
                        letterSpacing: -0.5,
                        color: onboardingColors.ink,
                      }}
                    >
                      Goa Squad
                    </Text>
                    <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: onboardingColors.inkMuted }}>
                      5 friends · 4 days in
                    </Text>
                  </View>
                </View>
                <AvatarStack
                  members={[
                    { id: '1', name: 'Aarav Mehta', color: '#C9F25B' },
                    { id: '2', name: 'Rohan Kapoor', color: '#F3A26F' },
                    { id: '3', name: 'Neha Iyer', color: '#8FC9F5' },
                    { id: '4', name: 'Kabir Shah', color: '#C8B4F5' },
                    { id: '5', name: 'Ishita Rao', color: '#F2A7C3' },
                  ]}
                  size={27}
                  max={4}
                  ringColor="#FFFFFF"
                />
              </View>
              <View style={[styles.dashed, { borderColor: onboardingColors.lineStrong }]} />
              <View style={styles.previewBottom}>
                <View>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10, color: onboardingColors.inkMuted }}>
                    Total spent
                  </Text>
                  <Text
                    style={{
                      fontFamily: theme.fonts.display,
                      fontSize: 26,
                      letterSpacing: -0.9,
                      color: onboardingColors.ink,
                    }}
                  >
                    ₹42,790
                  </Text>
                </View>
                <View style={[styles.owedPill, { backgroundColor: onboardingColors.ink }]}>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11, color: onboardingColors.white }}>
                    You are owed ₹6,477
                  </Text>
                </View>
              </View>
            </LinearGradient>

            <View
              style={[
                styles.floatingNote,
                { backgroundColor: onboardingColors.ink, borderColor: onboardingColors.ink },
              ]}
            >
              <Avatar name="Ishita Rao" color="#F2A7C3" size={26} />
              <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 10.5, color: onboardingColors.white }}>
                Ishita paid you ₹2,000
              </Text>
              <Sparkles size={14} color={onboardingColors.lime} />
            </View>
          </View>
        </View>

      </ScrollView>

      <View style={styles.panelWrap}>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.colors.bgElevated,
              paddingBottom: Math.max(insets.bottom, 16) + 10,
            },
          ]}
        >
          <View style={styles.panelHandle} />
          <Text variant="h2" align="center">
            Ready when you are.
          </Text>
          <Text
            variant="bodySmall"
            color={theme.colors.inkMuted}
            align="center"
            style={{ marginTop: 2, marginBottom: 16 }}
          >
            Your first trip is two taps away.
          </Text>
          <Button
            label="Create an account"
            variant="dark"
            size="lg"
            fullWidth
            icon={ArrowRight}
            iconPosition="right"
            onPress={() => router.push('/sign-up')}
          />
          <Button
            label="I already have an account"
            variant="secondary"
            size="lg"
            fullWidth
            style={{ marginTop: 10 }}
            onPress={() => router.push('/sign-in')}
          />
          <Text
            variant="caption"
            color={theme.colors.inkSubtle}
            align="center"
            style={{ marginTop: 12 }}
          >
            By continuing, you agree to the{' '}
            <Text
              accessibilityRole="link"
              accessibilityLabel="Open Terms of Service"
              onPress={() => router.push(legalRoute('terms'))}
              style={{
                fontFamily: theme.fonts.semibold,
                color: theme.colors.ink,
                textDecorationLine: 'underline',
              }}
            >
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              accessibilityRole="link"
              accessibilityLabel="Open Privacy Policy"
              onPress={() => router.push(legalRoute('privacy'))}
              style={{
                fontFamily: theme.fonts.semibold,
                color: theme.colors.ink,
                textDecorationLine: 'underline',
              }}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  hero: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 8 },
  previewWrap: { marginTop: 14, marginBottom: 22 },
  previewCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 14,
    transform: [{ rotate: '-1deg' }],
    shadowColor: '#4F6B16',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  emojiWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dashed: { borderBottomWidth: 1, borderStyle: 'dashed', marginVertical: 11 },
  previewBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  owedPill: { borderRadius: 999, paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  floatingNote: {
    position: 'absolute',
    right: 10,
    bottom: -18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 5,
    paddingRight: 12,
    height: 40,
    transform: [{ rotate: '2deg' }],
    shadowColor: '#14180F',
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  panelWrap: {
    width: '100%',
    alignItems: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  panelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(20,24,15,0.12)',
    alignSelf: 'center',
    marginBottom: 12,
  },
});
