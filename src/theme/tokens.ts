/**
 * Splitie design tokens.
 * Every colour, space and type ramp in the app comes from this file.
 */

export const palette = {
  lime: '#C9F25B',
  limeBright: '#D9FF72',
  limeSoft: '#EDFBC8',
  limeDeep: '#A6D32F',
  limeInk: '#25310F',
  ink: '#14180F',
  inkSoft: '#2C361E',
  olive: '#3C4A26',
  porcelain: '#F4F5EC',
  porcelainDeep: '#E9EBDD',
  white: '#FFFFFF',
  clay: '#E2603F',
  claySoft: '#FBE7E0',
  amber: '#D89B2C',
  amberSoft: '#FBF0D8',
  sky: '#4C7DF0',
  skySoft: '#E5ECFD',
  lilac: '#8B6FE8',
  lilacSoft: '#EEE9FC',
  teal: '#2E9C86',
  tealSoft: '#DFF5EF',
  rose: '#D65B86',
  roseSoft: '#FBE6ED',
  slate: '#6B7280',
} as const;

export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  ink: string;
  inkMuted: string;
  inkSubtle: string;
  inkInverse: string;
  line: string;
  lineStrong: string;
  lime: string;
  limeBright: string;
  limeSoft: string;
  limeDeep: string;
  onLime: string;
  white: string;
  clay: string;
  sky: string;
  lilac: string;
  amberSoft: string;
  positive: string;
  positiveSoft: string;
  negative: string;
  negativeSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  scrim: string;
  tabBar: string;
  tabBarBorder: string;
  skeleton: string;
  skeletonHighlight: string;
  shadow: string;
};

export const lightColors: ThemeColors = {
  bg: palette.porcelain,
  bgElevated: palette.white,
  surface: palette.white,
  surfaceAlt: '#EFF1E4',
  surfaceSunken: '#E7E9DA',
  ink: palette.ink,
  inkMuted: '#5F6654',
  inkSubtle: '#8B9180',
  inkInverse: '#F7F9EE',
  line: '#E1E4D3',
  lineStrong: '#CDD1BE',
  lime: palette.lime,
  limeBright: palette.limeBright,
  limeSoft: palette.limeSoft,
  limeDeep: palette.limeDeep,
  onLime: palette.ink,
  white: palette.white,
  clay: palette.clay,
  sky: palette.sky,
  lilac: palette.lilac,
  amberSoft: palette.amberSoft,
  positive: '#3C7A2A',
  positiveSoft: '#E6F4D9',
  negative: palette.clay,
  negativeSoft: palette.claySoft,
  warning: palette.amber,
  warningSoft: palette.amberSoft,
  info: palette.sky,
  infoSoft: palette.skySoft,
  overlay: 'rgba(20, 24, 15, 0.42)',
  scrim: 'rgba(20, 24, 15, 0.06)',
  tabBar: 'rgba(255, 255, 255, 0.97)',
  tabBarBorder: 'rgba(20, 24, 15, 0.08)',
  skeleton: '#E8EADD',
  skeletonHighlight: '#F5F6EF',
  shadow: '#14180F',
};

export const darkColors: ThemeColors = {
  bg: '#0F1209',
  bgElevated: '#15190E',
  surface: '#181D10',
  surfaceAlt: '#202616',
  surfaceSunken: '#0B0E07',
  ink: '#F2F5E7',
  inkMuted: '#AFB6A1',
  inkSubtle: '#767E69',
  inkInverse: '#14180F',
  line: '#2A311E',
  lineStrong: '#3B442B',
  lime: palette.lime,
  limeBright: palette.limeBright,
  limeSoft: '#2C3818',
  limeDeep: palette.limeDeep,
  onLime: palette.ink,
  white: '#FFFFFF',
  clay: '#FF8568',
  sky: '#82A6FF',
  lilac: '#B9A5FF',
  amberSoft: '#362B15',
  positive: '#9AD96A',
  positiveSoft: '#243318',
  negative: '#FF8568',
  negativeSoft: '#3A1F18',
  warning: '#F0BE5C',
  warningSoft: '#362B15',
  info: '#82A6FF',
  infoSoft: '#1D2742',
  overlay: 'rgba(0, 0, 0, 0.62)',
  scrim: 'rgba(255, 255, 255, 0.04)',
  tabBar: 'rgba(21, 25, 14, 0.98)',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  skeleton: '#232A18',
  skeletonHighlight: '#2D3520',
  shadow: '#000000',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 56,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 32,
  pill: 999,
} as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayXBold: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const;

export const typography = {
  displayXL: { fontFamily: fonts.displayXBold, fontSize: 44, lineHeight: 48, letterSpacing: -1.6 },
  display: { fontFamily: fonts.displayXBold, fontSize: 36, lineHeight: 40, letterSpacing: -1.2 },
  displaySemi: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.9 },
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26, letterSpacing: -0.4 },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },
  bodyMedium: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },
  bodySmall: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, letterSpacing: -0.05 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, letterSpacing: 0.1 },
  micro: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.3 },
  numeric: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -1.2 },
  numericSmall: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.8 },
  numericTiny: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 22, letterSpacing: -0.4 },
} as const;

export const shadows = {
  card: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  float: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  hero: {
    shadowColor: '#6F8F20',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 26,
    elevation: 10,
  },
} as const;

export const durations = {
  fast: 160,
  base: 240,
  slow: 380,
  splash: 1400,
} as const;
