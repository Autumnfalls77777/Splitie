# 02 — Design System

## Color Palette (Theme Tokens, `src/theme/tokens.ts`)

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `white` | `#FFFFFF` | `#FFFFFF` | Pure white |
| `lime` | `#C9F25B` | `#C9F25B` | Primary accent |
| `limeBright` | (derived) | (derived) | Lime bright variant |
| `limeSoft` | `#2C3818` | `#2C3818` | Lime soft/darkened |
| `limeDeep` | palette.limeDeep | palette.limeDeep | Lime deep |
| `onLime` | `#14180F` | `#14180F` | On-lime text (ink) |
| `positive` | `#3C7A2A` | `#3C7A2A` | Positive status (e.g., settled) |
| `clay` | `#FF8568` | `#FF8568` | Clay/terracotta (warnings, negative) |
| `sky` | `#82A6FF` | `#82A6FF` | Sky blue (secondary accent) |
| `lilac` | `#B9A5FF` | `#B9A5FF` | Lilac purple (highlights) |
| `amberSoft` | `#362B15` | `#362B15` | Amber/soft dark |
| `porcelain` | `#F4F5EC` | `#F4F5EC` | Light background |
| `ink` | `#14180F` | `#14180F` | Primary text |
| `bg` | `#F4F5EC` | `#0F1209` | Page background (light/dark) |
| `surface` | `#FFFFFF` | `#161A21` | Card/surface background |
| `negative` | `#FF8568` | `#FF8568` | Same as clay (negative feedback) |

> **Note**: All tokens defined in `src/theme/tokens.ts` with `palette.*` references; light/dark palettes switched via `ThemeProvider` system/light/dark detection and `Appearance` sync.

## Typography
- **Display / numerics**: **Bricolage Grotesque** (weights 600 Semi-Bold, 700 Bold, 800 Extra-Bold)
- **Body**: **Manrope** (weights 400 Regular, 500 Medium, 600 Semi-Bold, 700 Bold, 800 Extra-Bold)
- Font files loaded from `@expo-google-fonts/bricolage-grotesque` and `@expo-google-fonts/manrope`.
- Used in `src/theme/index.tsx` via `useFonts` hooks; applied through `StyleSheet.create` per-component or via themable `text` styles.

## Component Styling
- All UI primitives in `src/components/ui/` use `useTheme()` from `src/theme` and reference `theme.colors.*` tokens.
- **Screen** always adds 108px bottom padding unless `contentBottom` prop is passed (used on inset screens like map, chat).
- **Sheet** `height` prop: `number | \`${number}%\` | 'auto'`; default `'auto'`; backdrop uses explicit `position: 'absolute'` + `top/right/bottom/left` instead of `StyleSheet.absoluteFillObject` (RN 0.88 type removal).
- **ProgressBar** uses `theme.colors.lime` for filled portion, `theme.colors.sky` for track (or invert in dark).
- **DonutChart/ProgressRing** use `theme.colors.lime` as primary fill, `theme.colors.sky` as secondary/background, `theme.colors.clay` for negative/out-of-range segments.
- **Badge** colors: `theme.colors.lime` (active), `theme.colors.clay` (warning), `theme.colors.sky` (info).
- **EmptyState** uses `theme.colors.lilac` or `theme.colors.sky` for accent, `theme.colors.porcelain` for background.

## Light/Dark Mode
- System theme detected via `Appearance.getColorScheme()` on mount.
- `ThemeProvider` sets `colorScheme` state; toggles persist in Zustand `settings.store`.
- `Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode)` — `'unspecified'` required by RN 0.88 types (was `null`).
- All `StyleSheet` entries themable; static color values replaced with `theme.colors.*` where possible.
- Custom `Toggle`/switch for light/dark in Profile settings.

## Spacing & Rhythm
- Vertical space scale: 4px base; multiples of 4 (4, 8, 12, 16, 20, 24, 32, 40, 48).
- Horizontal scale same; used in `Sheet` max-width, `Chip` padding, `Card` spacing.
- See `src/theme/tokens.ts` for `spacing` if/when added.

## Iconography
- **Lucide React Native** for all icons (`lucide-react-native`); tree-shakable.
- Used via `<XxxIcon />` components (e.g., `<MapPin />`, `<CalendarDays />`, `<Wallet />`, `<ReceiptText />`, `<Plane />`, `<ChevronRight />`, `<RefreshCw />`, `<Share />`, `<Eye />`, `<EyeOff />`).
- Custom `CategoryIcon` maps category name → Lucide icon + theme color.

## Motion & Animation
- **Reanimated 3** + **Gesture Handler** for all interactive animations (FAB expansion, sheet slide, tab press haptic, skeleton fade).
- **expo-haptics** for tap feedback on primary actions (FAB, tab press, confirm).
- **Skeleton loaders** (`Skeleton` component) for all data-fetching states.
- **Shared motion values** timed to 300ms/380ms durations; spring configs with stiffness 150, damping 25.

## Accessibility
- All touch targets ≥ 44×44 dp.
- Color contrast meets AA for lime on porcelain (4.5+: lime `#C9F25B` on `#F4F5EC` ≈ 3.6:1 — uses dark text `#14180F` for body; lime used as accent/brand only).
- Dark mode uses `#0F1209` bg with `#C9F25B` accents; contrast OK.
- VoiceOver/TalkBack labels on interactive elements (Fab, sheet buttons, toggle switches).
- Focus visible outlines via `theme.focus` when enabled.

## Future Design Tokens (planned)
- `radius` (xs, sm, md, lg, xl)
- `shadow` (light, medium, heavy)
- `typography` (font-size scale, line-height, letter-spacing)
- `opacity` map
- These would live in a third-layer `component` tokens if NativeWind were ever adopted, but currently the token system is sufficient.