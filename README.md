# Splitie

## Overview
**Splitie** is a production-quality React Native/Expo app for splitting trip expenses among friends, tracking personal monthly/yearly expenses with charts, and sending timed payback reminders.

- **Tagline**: Split the bill. Keep the memories.
- **Design**: Premium, design-forward frontend in lime (#C9F25B) + white with light/dark themes.
- **Target**: Mobile-first, runs on iOS, Android, and web via Expo Go or web preview.
- **Ultimate goal**: Installable Android APK via EAS Build.

## Features
- **Demo mode**: Local mock auth (`DEMO_MODE_ENABLED`). Demo user: Aarav Mehta, `aarav@splitie.app`, password `splitie123`.
- **Trip splitting**: Equal, exact, percent, and shares splitting with per-member inputs and validation.
- **Personal expenses**: Track monthly/yearly spending with category donuts, budget progress rings, daily bar charts.
- **Insights**: Six-month area charts, category breakdowns, weekday patterns, smart insight cards.
- **Reminders**: Timed payback reminders with local notifications (Expo Notifications).
- **CSV export**: Export trip data or personal expense data.
- **Reset demo**: Re-seed demo data at any time.
- **Sign out**: Secure sign-out with confirmation dialog.

## Screens
- Onboarding (3 slides): trip split receipt, spending donut, reminder cards
- Welcome / Sign-in / Sign-up
- Tabs: Home, Trips, Personal, Insights
- Profile (appearance, currency, reminder timing, notifications, haptics, CSV export, reset demo, about, sign out)
- Notifications (unread/completed reminders, due badges, snooze, mark all read)
- Trip New (gradient preview, cover/emoji pickers, name/destination/date/budget, dynamic member chips)
- Trip Detail (gradient cover hero, overlapping balance card, Expenses/Balances tabs, transfer actions)
- Settle Up (transfer count/total, per-transfer cards, mark all paid)
- Add Expense (big amount field, category grid, payer picker, split controls, participant selection)
- Personal Add (amount quick chips, title, category grid, payment method, recurrence, date/note)
- Settings sheets (appearance, display currency, reminder lead days, notification permission, haptics, CSV export, reset demo, about)

## Tech Stack
- **Framework**: Expo SDK 58, React Native 0.88.1, React 19.3.0, Expo Router with `src/app`
- **Language**: TypeScript (strict mode)
- **State**: Zustand (persisted with expo-sqlite/kv-store on native, localStorage on web), TanStack Query
- **Forms**: React Hook Form + Zod validation
- **Navigation**: Expo Router file-based routes, custom floating tab bar with center lime FAB
- **Styling**: Custom design-token system (tokens in `src/theme/tokens.ts`), Bricolage Grotesque display font + Manrope body font, NativeWind not used (token system chosen to avoid Metro OOM)
- **Charts**: react-native-svg based DonutChart, BarChart, AreaChart, Sparkline, ProgressRing
- **Animations**: Reanimated, Gesture Handler, expo-haptics
- **Data Persistence**: Expo SQLite (offline-first), TanStack Query cache
- **Notifications**: expo-notifications with scheduled reminders
- **UI Primitives**: Custom Text, Screen, Logo/LogoMark, Button, IconButton, Card, Avatar, Chip, SegmentedControl, ProgressBar, Skeleton, Badge, Divider, EmptyState, Input, PasswordInput, Header, SectionHeader, ListRow, Sheet, CategoryIcon, AmountText, AnimatedNumber, Checkbox, MonthSwitcher, DateField
- **Utilities**: Money formatting/parsing/allocation (integer paise), Indian date helpers, IDs, haptics, storage adapter, color helpers, currency display sync
- **Type-safe routing**: Typed routes disabled (`experiments.typedRoutes: false`) to avoid Metro memory issues and stale generated types; navigation via string hrefs
- **Build**: EAS JSON with preview profile for Android APK

## Project Structure
```
src/
  app/              # Expo Router routes (src/app)
  components/       # Reusable UI primitives
    ui/             # Base components (Input, Sheet, Toast, etc.)
    layout/         # Header, TabBar, AddSheet
    charts/         # DonutChart, BarChart, AreaChart, ProgressRing, Sparkline
    trips/          # TripCard, ExpenseRow, PersonalExpenseRow
    onboarding/     # Illustrations, dots, skip, completion
  features/         # Feature stores (auth, trips, personal, reminders, settings, ui)
    auth/
    trips/
    personal/
    reminders/
    settings/
  lib/              # Utilities (money, date, currency, haptics, IDs, storage)
  theme/            # Tokens, ThemeProvider, color palettes
  types/            # Type models (Trip, Expense, Member, etc.)
  data/             # Categories, covers, demo seed data
app.json            # Expo config
eas.json            # EAS Build profiles
.gitignore
tsconfig.json
```

## Getting Started
### Prerequisites
- Node.js 20+ (LTS)
- npm or yarn
- Expo CLI (`npm i -g expo` or via `npx`)
- Android Studio (for APK building, optional for now)

### Installation
```bash
cd splitie-mobile-app
npm install
```

### Type Check
```bash
npm run typecheck
```
*(Uses `tsc --noEmit` with strict mode; passes after disabling `experiments.typedRoutes` and removing stale `.expo/types/router.d.ts`.)*

### Dev Server
```bash
npx expo start --web --port 8081
```
- Web: **http://localhost:8081**
- Expo Go: **exp://10.165.47.250:8081** (LAN)
- Note: On machines with limited disk/memory, Metro may OOM; clearing C: cache or increasing `--max-old-space-size` may help.

### Demo Mode
The app starts in demo mode if `DEMO_MODE_ENABLED` is true (default). On first launch:
1. User sees onboarding (3 slides)
2. Then `/welcome` auth screen
3. Demo credentials: `aarav@splitie.app` / `splitie123`
4. After login, navigates to `/(tabs)` with seeded demo data

To remove demo mode later, delete the `hasOnboarded` flag from settings or comment out the demo entry in `src/constants/app.ts`.

### Environment Variables
Create `.env.example` at root:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```
*(No real secrets committed; demo mode is local-only. Replace with actual Supabase credentials when backend is enabled.)*

### EAS Android APK Build
```bash
eas login          # Login to Expo account
eas build -p android --profile preview   # Build APK
```
See `eas.json` for the preview profile configuration.

## Known Limitations / Next Steps
- **Typed routes disabled**: Navigation uses string `router.push('/(tabs')` etc.; type-safe routes can be re-enabled later with `experiments.typedRoutes: true` and `npx expo start --clear` to regenerate.
- **Backend not yet connected**: Supabase schema migrations exist under `supabase/migrations/`. RLS policies ensure user-level access. Demo mode is fully local; backend integration requires Supabase setup and RLS.
- **C: drive memory**: OOM errors during Metro bundling on low-disk machines; workarounds include moving Metro cache to E: (`$env:TEMP="E:\\Temp\\Temp"`), increasing Node heap, or using `--max-workers 1`.
- **No git commits yet**: Working tree is untracked; initial commit recommended after this session.
- **APK not built yet**: Requires EAS account and sufficient headroom.

## License
MIT