import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Sparkles } from 'lucide-react-native';

import { Logo } from '@/components/brand/Logo';
import { Avatar, AvatarStack } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

export default function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.lime }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 8,
          paddingBottom: 300 + insets.bottom,
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
              fontSize: 44,
              lineHeight: 46,
              letterSpacing: -2,
              color: theme.colors.onLime,
            }}
          >
            Good trips.{'\n'}Zero awkward maths.
          </Text>
          <Text
            style={{
              fontFamily: theme.fonts.medium,
              fontSize: 15,
              lineHeight: 23,
              color: theme.colors.onLime,
              opacity: 0.66,
              marginTop: 12,
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
              style={[styles.previewCard, { borderColor: theme.colors.ink }]}
            >
              <View style={styles.previewTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.emojiWrap, { backgroundColor: theme.colors.limeSoft }]}>
                    <Sparkles size={24} color={theme.colors.limeDeep} />
                  </View>
                  <View>
                    <Text style={{ fontFamily: theme.fonts.display, fontSize: 20, letterSpacing: -0.5 }}>
                      Goa Squad
                    </Text>
                    <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle }}>
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
              <View style={[styles.dashed, { borderColor: theme.colors.lineStrong }]} />
              <View style={styles.previewBottom}>
                <View>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10, color: theme.colors.inkSubtle }}>
                    Total spent
                  </Text>
                  <Text style={{ fontFamily: theme.fonts.display, fontSize: 26, letterSpacing: -0.9 }}>
                    ₹42,790
                  </Text>
                </View>
                <View style={[styles.owedPill, { backgroundColor: theme.colors.ink }]}>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11, color: theme.colors.inkInverse }}>
                    You are owed ₹6,477
                  </Text>
                </View>
              </View>
            </LinearGradient>

            <View style={[styles.floatingNote, { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink }]}>
              <Avatar name="Ishita Rao" color="#F2A7C3" size={26} />
              <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 10.5, color: theme.colors.inkInverse }}>
                Ishita paid you ₹2,000
              </Text>
              <Sparkles size={14} color={theme.colors.lime} />
            </View>
          </View>
        </View>

      </ScrollView>

      <View pointerEvents="box-none" style={styles.panelWrap}>
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
            By continuing you agree to the terms and privacy policy.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  hero: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 24 },
  previewWrap: { marginTop: 26, marginBottom: 8 },
  previewCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 16,
    transform: [{ rotate: '-1deg' }],
    shadowColor: '#4F6B16',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  emojiWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dashed: { borderBottomWidth: 1, borderStyle: 'dashed', marginVertical: 13 },
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  panelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(20,24,15,0.12)',
    alignSelf: 'center',
    marginBottom: 16,
  },
});
