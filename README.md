# Splitie

## Overview
**Splitie** is a production-quality React Native/Expo app for splitting trip expenses among friends, tracking personal monthly/yearly expenses with charts, and sending timed payback reminders.

- **Tagline**: Split the bill. Keep the memories.
- **Design**: Premium, design-forward frontend in lime (#C9F25B) + white with light/dark themes.
- **Target**: Mobile-first, runs on iOS, Android, and web via Expo Go or web preview.
- **Ultimate goal**: Installable Android APK via EAS Build.

## Features
- **Google sign-in**: Supabase OAuth via `signInWithOAuth`. There is no demo mode, demo account, or seeded demo data.
- **Trip splitting**: Equal, exact, percent, and shares splitting with per-member inputs and validation.
- **Shared trips**: Join a trip with a 6-letter code, claim a name-only member, or invite someone by email. Hosts can rotate the code and remove pending invites.
- **Personal expenses**: Track monthly/yearly spending with category donuts, budget progress rings, daily bar charts.
- **Insights**: Six-month area charts, category breakdowns, weekday patterns, smart insight cards.
- **Reminders**: Local settle-up notifications plus Expo push payment reminders to members who have a Splitie account.
- **CSV export**: Export trip data or personal expense data.
- **Sign out**: Secure sign-out with confirmation dialog.

## Screens
- Onboarding (3 slides): trip split receipt, spending donut, reminder cards
- Welcome / Sign-in / Sign-up
- Tabs: Home, Trips, Personal, Insights
- Join a trip (code → preview → “Which one are you?” picker → join)
- Profile (appearance, currency, reminder timing, notifications, haptics, CSV export, about, sign out)
- Notifications (unread/completed reminders, due badges, snooze, mark all read)
- Trip New (gradient preview, cover/emoji pickers, name/destination/date/budget, dynamic member chips)
- Trip Detail (gradient cover hero, overlapping balance card, trip code card, pending invite tags, Expenses/Balances tabs, transfer actions)
- Invite sheets (add member by email, notify others with push reminders)
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
- **Notifications**: expo-notifications with scheduled reminders and Expo push tokens (`push_tokens` + `send-push` Edge Function)
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
  features/         # Feature stores (auth, trips, invites, notifications, sync, etc.)
    auth/
    trips/
    invites/
    notifications/
    sync/
    personal/
    reminders/
    settings/
  lib/              # Utilities (money, date, currency, haptics, IDs, storage, push)
  theme/            # Tokens, ThemeProvider, color palettes
  types/            # Type models (Trip, Expense, Member, etc.)
  data/             # Categories and covers
supabase/
  migrations/       # Apply in timestamp order in the Supabase SQL editor
  functions/
    send-push/      # Expo push delivery for reminders and invites
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

### Backend setup
The app needs Supabase for auth and sync.

1. Create a Supabase project.
2. Run `supabase/migrations/20261102000000_init.sql`, then `supabase/migrations/20261103000000_trip_sharing.sql` in the SQL editor.
3. Configure Google under **Authentication → Providers → Google**. The app calls `signInWithOAuth`, so the Google client ID/secret belong in Supabase, not in the app.
4. Add `splitie://auth-callback` and the web callback URL to **Authentication → URL Configuration → Redirect URLs**.
5. Deploy the Edge Function: `supabase functions deploy send-push`.
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase. Do not create them as project secrets.
6. Add `google-services.json` for Android FCM. It contains client identifiers, not server secrets, and is intentionally tracked. Add the `android.googleServicesFile` entry to `app.json` (see the Phase 2 TODO in `replyback.md`).
7. Upload the Firebase service account to **Supabase → Project Settings → Messaging → FCM V1** for Android push.

### Environment Variables
Copy `.env.example` to `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```
*Only public `EXPO_PUBLIC_*` values belong in the app. Never commit `GOOGLE_SECRET_KEY`, `SENTRY_AUTH_TOKEN`, the service role key, or a Firebase service-account JSON.*

### EAS Android APK Build
```bash
eas login          # Login to Expo account
eas build -p android --profile preview   # Build APK
```
See `eas.json` for the preview profile configuration.

## Known Limitations / Next Steps
- **Typed routes disabled**: Navigation uses string `router.push('/(tabs)')` etc.; type-safe routes can be re-enabled later with `experiments.typedRoutes: true` and `npx expo start --clear` to regenerate.
- **Migrations are manual**: `supabase/migrations/` is not applied automatically. Apply the init migration first, then the trip-sharing migration, then deploy `send-push`.
- **Push requires Firebase**: Android push needs `google-services.json`, the `android.googleServicesFile` entry in `app.json`, and FCM V1 credentials in Supabase. Without them, the app still works and reminders are skipped.
- **Reminder trust trade-off**: The app computes reminder amounts from the same suggested transfers as Settle up. The `send-push` function checks that the caller and recipients are trip members and that each amount is a positive integer no larger than the trip's total expenses, but it does not recompute the settle-up graph. Treat a reminder as a nudge, not a verified debt.
- **No Realtime in v1**: Pending invites refresh on launch, foreground, sign-in, and invite push taps. A second device does not update live.
- **Cross-trip currency totals**: Trip cards and trip screens use the trip's own currency; the Trips tab summary still adds trips together in the app's display currency.
- **Account switch clears local cache**: `claimLocalData()` wipes local data when a device switches accounts. Shared trips will re-sync from the server, but unsynced local edits on the old account are lost.
- **C: drive memory**: OOM errors during Metro bundling on low-disk machines; workarounds include moving Metro cache to E: (`$env:TEMP="E:\\Temp\\Temp"`), increasing Node heap, or using `--max-workers 1`.
- **APK not built yet**: Requires EAS account, keystore/Play Console setup, and sufficient headroom.

## License
MIT