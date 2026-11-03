/**
 * Onboarding is intentionally a fixed light experience. These colours must not
 * come from the app theme because the lime artwork and white cards are designed
 * to stay light even when the rest of the app is in dark mode.
 */
export const onboardingColors = {
  lime: '#C9F25B',
  ink: '#14180F',
  inkMuted: '#25310F',
  inkSoft: '#3C4A26',
  white: '#FFFFFF',
  lineStrong: '#14180F',
  limeSoft: '#EDFBC8',
  limeDeep: '#4F6B16',
  amberSoft: '#FBF0D8',
  warning: '#8A5A00',
  clay: '#E2603F',
  sky: '#4C7DF0',
  lilac: '#8B6FE8',
  avatarPeach: '#F3A26F',
  avatarSky: '#8FC9F5',
  avatarLilac: '#C8B4F5',
  onDarkMuted: '#D8E8B0',
  surfaceAlt: '#EFF1E4',
} as const;

/** Every foreground/background pair used by onboarding text. */
export const onboardingTextPairs = [
  { label: 'hero title on lime', fg: onboardingColors.ink, bg: onboardingColors.lime },
  { label: 'hero body on lime', fg: onboardingColors.inkMuted, bg: onboardingColors.lime },
  { label: 'skip link on lime', fg: onboardingColors.inkMuted, bg: onboardingColors.lime },
  { label: 'white card title on white', fg: onboardingColors.ink, bg: onboardingColors.white },
  {
    label: 'white card subtitle on white',
    fg: onboardingColors.inkMuted,
    bg: onboardingColors.white,
  },
  { label: 'balance pill on lime', fg: onboardingColors.ink, bg: onboardingColors.lime },
  { label: 'dark note title on ink', fg: onboardingColors.white, bg: onboardingColors.ink },
  {
    label: 'dark note subtitle on ink',
    fg: onboardingColors.onDarkMuted,
    bg: onboardingColors.ink,
  },
  { label: 'cta label on ink', fg: onboardingColors.white, bg: onboardingColors.ink },
  { label: 'welcome card title on white', fg: onboardingColors.ink, bg: onboardingColors.white },
  {
    label: 'welcome card subtitle on white',
    fg: onboardingColors.inkMuted,
    bg: onboardingColors.white,
  },
  { label: 'welcome card label on white', fg: onboardingColors.inkMuted, bg: onboardingColors.white },
  { label: 'welcome card amount on white', fg: onboardingColors.ink, bg: onboardingColors.white },
] as const;
