# 03 — Screens

Build log by screen, with component references, QA status, and known issues.

## Onboarding (`src/app/(onboarding)/index.tsx`)
- **3 slides**: (1) trip split receipt (lime gradient + illustration), (2) spending donut (DonutChart with category breakdown), (3) reminder cards (upcoming notifications summary).
- Dots navigator at bottom; skip button goes to `/welcome`.
- Completion persisted to `hasOnboarded` in settings store; subsequent launches skip to `/welcome` directly.
- Uses `theme.colors.white`, `clay`, `sky`, `lilac`, `amberSoft` (all added to `ThemeColors`).
- ScrollView ref: `useRef<ScrollViewInstance>(null)` (fixed RN 0.88 type).
- **QA**: Visual QA Playwright screenshot captured (light/dark) — see `docs/progress/screenshots/`.
- **Status**: ✅ Complete.

## Auth (`src/app/(auth)/`)
- **Welcome** (`welcome.tsx`): Logo wordmark, "Split the bill. Keep the memories.", Get started → `/onboarding` if not onboarded, `/sign-in` if no user.
- **Sign-in** (`sign-in.tsx`): Email/phone + password; RHF + Zod validation; `router.replace('/(tabs)')` (typed-route error resolved by disabling typedRoutes); demo credential fill (`aarav@splitie.app` / `splitie123`).
- **Sign-up** (`sign-up.tsx`): Name, email, password; RHF/Zod; same nav.
- **_layout.tsx**: Stack with `headerShown: false`, background `#C9F25B`.
- **Status**: ✅ Complete. Demo flow works.

## Tabs (`src/app/(tabs)/_layout.tsx`)
- Custom `TabBar` (center lime FAB, 4 tabs: Home, Trips, Personal, Insights).
- Profile, Notifications, Settings live **outside** tab bar (accessible via drawer/modal).
- Auth guard: redirects to `/welcome` if `!user`; onboarding check in `RootLayout`.
- Global `AddSheet` (trip picker) always visible via FAB.
- **Status**: ✅ Complete. Navigation flows verified.

### Home (`src/app/(tabs)/index.tsx`)
- Greeting/date (uses `greeting()` from `src/lib/date`).
- Notification bell avatar with unread count badge.
- Avatar/avatar stack with user initials.
- **Lime hero balance card**: large balance amount (`AnimatedNumber` or `AmountText`), trend arrow.
- **Reminder banner**: upcoming due reminder with snooze/mark-done.
- **Quick actions**: transfer, settle up, add expense FAB‑proximate buttons.
- **Active trip carousel**: scrollable cards (TripCard) of current trips.
- **Monthly spending card**: progress ring + budget bar + sparkline (`BarChart` or `Sparkline`).
- **Recent activity**: grouped expense rows (`ExpenseRow`).
- Pull-to-refresh (`RefreshControl` with `void query.refetch()`).
- Imports `theme.colors.clay`, `sky`, `lilac` (all defined).
- **QA**: ✅ Light/Dark screenshots captured.
- **Status**: ✅ Complete.

### Trips (`src/app/(tabs)/trips.tsx`)
- Search bar + filter tabs: All / Open / Settled.
- **Dark totals card**: total owed, total credited, net balance.
- **Full trip cards** (TripCard): destination, member count, status badge (active/upcoming/past/settled), trailing balance.
- Empty state when no trips; loading skeletons while fetching.
- Pull-to-refresh.
- **QA**: ✅ Screenshots captured.
- **Status**: ✅ Complete.

### Personal (`src/app/(tabs)/personal.tsx`)
- **Month switcher** (`MonthSwitcher`): navigate between months; `useState` of selected month/year.
- **Budget hero**: dark themed progress ring (`ProgressRing`) showing % of budget used, budget amount display.
- **Daily bar chart**: `BarChart` highlighting spend per day of selected month; guards `max > 0`.
- **Category donut** (`DonutChart`): spend by category; legend rows below.
- **Progress rows**: per-category spend vs budget progress bar.
- **Grouped recent expenses**: list of expenses with category icons, amounts, dates.
- **Budget edit sheet**: opens modal Sheet with budget input; validation "budget must be ≥ ₹100" (logic checks `< 10_000` paise — copy noted for adjustment).
- Budget stored per user in settings store; persists across app launches.
- **QA**: ✅ Screenshots captured.
- **Status**: ✅ Complete.

### Insights (`src/app/(tabs)/insights.tsx`)
- **Month/Year toggle**: switch between monthly and yearly period.
- **Period switcher**: Last 6 months / Current Year.
- **Total summary card**: total spent, average per month, etc.
- **Six-month area chart** (`AreaChart`): trend over selected period.
- **Category donut** (`DonutChart`): spend breakdown.
- **Weekday bars**: spend by day-of-week (bar chart).
- **Smart insight cards**: e.g., "You spent most on dining out this month", "Your average trip cost is ₹X".
- Empty state when no data.
- **QA**: ✅ Screenshots captured.
- **Status**: ✅ Complete.

### Profile (`src/app/profile.tsx`)
- **Lime user card**: name, stats (trips count, expenses total), appearance toggle (light/dark), display currency selector, haptics on/off, notification permission status.
- **Appearance**: system/light/dark radio; syncs with `Appearance.setColorScheme`.
- **Display currency**: selector (INR ₹, USD $, EUR €, etc.); syncs with `getDisplayCurrency()` in `src/lib/currency.ts`; ThemeProvider effect updates display.
- **Reminder lead days**: stepper (1‑14 days) — how many before due date notification fires.
- **Notification permission**: status banner; "Turn on notifications" button → requests `Permissions.getAsync(Permissions.NOTIFICATIONS_PERMISSION)`.
- **Haptics**: on/off toggle; saves to settings store.
- **CSV export**: 
  - Web: Blob download of generated CSV.
  - Native: `expo-file-system` + `expo-sharing` + `expo-clipboard` (copy to clipboard).
- **Reset demo**: Re-seeds demo data (trips, expenses, reminders); resets `hasOnboarded`; shows confirmation dialog.
- **About**: Version, libraries list.
- **Sign out**: Confirmation dialog (`globalThis.confirm` on web, `Alert.alert` on native); navigates to `/welcome` then `/onboarding`.
- **QA**: ✅ Screenshots captured (light/dark).
- **Status**: ✅ Complete.

### Notifications (`src/app/notifications.tsx`)
- **Permission banner**: shows if permissions granted/denied; button to re-request.
- **Unread reminders list**: each with due date badge (e.g., "2d"), "View trip" link, "Snooze" (temporarily dismiss), "Mark done".
- **Completed reminders** collapsible section.
- **Mark all read** button.
- **Snooze logic**: pushes notification out by `leadDays`; handled by `reminder.service.ts` via `expo-notifications`.
- **QA**: ✅ Screenshots captured.
- **Status**: ✅ Complete.

### Trip New (`src/app/trip/new.tsx`)
- **Live gradient preview**: horizontal gradient preview updating as cover/emoji selected.
- **Cover picker**: grid of cover images/colors; selection updates preview.
- **Emoji picker**: select emoji displayed on trip card.
- **Fields**: name (mandatory), destination, start/end date, budget (optional, integer paise).
- **Dynamic member chips**: add/remove participants; each chip shows name + close (×).
- **Validation**: name required; budget > 0 if provided; at least 2 members.
- **On save**: creates trip, navigates to trip detail.
- **QA**: ✅ Screenshot captured (light).
- **Status**: ⚠️ Minor: member chip close button touch area could be larger on narrow screens.

### Trip Detail (`src/app/trip/[id]/index.tsx`)
- **Gradient cover hero**: overlapping image/color; status/member/budget badges laid over.
- **Overlapping balance card**: "You're owed ₹X" or "You've paid ₹Y" large typography.
- **Tabs**: **Expenses** / **Balances**.
  - **Expenses**: grouped expense rows (`ExpenseRow`); each has delete (swipe) and transfer/remind/pay actions (sheet).
  - **Balances**: member-wise net balance; summary of who owes whom; "Settle up" button → `SettleUp` screen.
- **Member balances**: circular chart or list of who owes whom how much.
- **Share summary**: total shares, individual amounts.
- **Trip options**: delete trip (permanent), edit cover/name.
- **Floating footer**: "Add expense" + "Settle up" CTA buttons.
- Share action: copies summary text via `showToast('Trip summary copied')` (replaced no-op `showToastCopy`).
- **QA**: ✅ Screenshots captured (light/dark).
- **Status**: ✅ Complete.

### Settle Up (`src/app/trip/[id]/settle.tsx`)
- **Transfer count/total hero**: number of transfers, total amount to be transferred.
- **Per-transfer cards**: each transfer shows from → to member, amount, "Mark as paid" toggle.
- **Mark all paid** button: marks all transfers as paid; recalculates totals.
- **Settled empty state**: when all transfers paid, shows "All settled!" illustration.
- **QA**: ✅ Screenshot captured.
- **Status**: ✅ Complete.

### Add Expense (`src/app/trip/[id]/add-expense.tsx`)
- **Big amount field**: centered large numeric input (custom `AmountText`).
- **Category grid**: scrollable grid of category chips (from `COVERS` + names); selected category highlighted.
- **Payer picker**: dropdown/chip of all trip members; selected payer highlighted.
- **Split type controls**: tabs for Equal / Exact / Percent / Shares.
  - **Equal**: one split per member, amount divided equally (largest-remainder leftover).
  - **Exact**: per-member amount inputs; validates sum = total amount.
  - **Percent**: per-member percentage inputs; validates sum = 100%.
  - **Shares**: each member gets a share count; amounts computed via `allocateByWeights`.
- **Per-member split inputs**: dynamic fields appear based on split type; auto-prefill when amount/split type/participants change.
- **Payer selection**: changes who "paid" the expense; updates payer label on expense rows.
- **Date picker** + **note** textarea.
- **Save** button: validates, computes splits, saves expense to store.
- **QA**: ✅ Screenshot captured (light).
- **Status**: ✅ Complete. `categoryCell` width `'23%'` with 4 columns may wrap on narrow screens (≤360px); consider `minMax(30%, 25%)` or column count adjustment.

### Personal Add (`src/app/personal/add.tsx`)
- **Amount quick chips**: preset amounts (₹50, ₹100, ₹200, ₹500) or custom input.
- **Title** text input.
- **Category grid**: same as Add Expense but smaller selection (personal vs trip categories).
- **Payment method**: radio/cash/UPI buttons; stored in personal expense model.
- **Recurrence**: none/weekly/monthly/yearly; stored as `recurrence` field.
- **Date picker** + **note** textarea.
- **Validation**: amount > 0; title required; date not in future (or allow future for recurring).
- **Save**: creates personal expense, updates month stats.
- **QA**: ✅ Screenshot captured.
- **Status**: ✅ Complete.

## Cross-Cutting / Shared
- **Sheet** component (`src/components/ui/Sheet.tsx`): modal sheet with header, body, optional footer; `height` prop controls height or 'auto'; `scrollable` prop (bool) — body wrapped in ScrollView when true; backdrop explicit positioning.
- **Toast** host (`src/app/_layout.tsx` + `src/components/ui/Toast.tsx`): top‑center messages; `showToast(message, { description? })` from `useUIStore`.
- **Header** / **SectionHeader**: reusable headers with title/subtitle, left/right action buttons; imports fixed to `@/components/ui/...`.
- **Input** / **PasswordInput**: shared form inputs; `Input` uses `forwardRef<TextInputInstance>`; `PasswordInput` toggles visibility.
- **DateField**: web has `<input type="date">`; native has `DatePickerAndroid` / `useDatePicker` hook.
- **MonthSwitcher**: navigates month/year state; used in Personal and Insights.
- **Avatar / AvatarStack**: user initials/avatar; stack for multiple selected members (expense payer, trip members).
- **Chip**: selectable tag component; used for members, categories, split types, payment methods.
- **ProgressBar**: circular progress ring; used in budget hero, personal budget, trip summary.
- **Skeleton**: shimmer loader; used in all data-fetching states (Home, Trips, Personal, Insights, Profile).
- **EmptyState**: illustrated empty state with message; used when no data (Trips filtered, Personal no expenses, Insights no data, Notifications empty, Add Expense no categories, etc.).
- **Badge**: small status label; colors from theme (lime/positive, clay/warning, sky/info).
- **Divider**: horizontal rule between sections.
- **ProgressRing**: circular progress (budget %, trip completion %, reminder due %).
- **DonutChart**: donut chart of values; used in category spend, personal budget, trip member balances.
- **Sparkline**: compact line chart; used in Home monthly spending, Insights period trend.
- **AnimatedNumber**: animating number count from 0 to target; used in balance hero, trip total settlements.
- **Checkbox**: toggle; used in reminder snooze, settle up mark-paid, recurrence, haptics toggle.
- **SectionHeader**: header with title and optional right action (e.g., "View all", "Reset").
- **ListRow**: consistent row layout for expense/reminder items; leading icon, title, trailing subtitle/amount.
- **CategoryIcon**: maps category name → Lucide icon + theme color dot.
- **AmountText**: large formatted price (e.g., ₹1,234.56); uses `formatMoney` with display currency.
- **Checkbox, MonthSwitcher, DateField** also used in Profile settings.

## QA Status Summary
| Screen | Light Screenshot | Dark Screenshot | Notes |
|--------|-----------------|----------------|-------|
| Onboarding | ✅ | ✅ | 3-slide pager |
| Auth (Welcome/Sign-in/Sign-up) | ✅ | ✅ | Demo flow |
| Home | ✅ | ✅ | Balance card, sparkline |
| Trips | ✅ | ✅ | Filters, cards |
| Personal | ✅ | ✅ | Budget ring, daily bar |
| Insights | ✅ | ✅ | Area chart, weekday bars |
| Profile | ✅ | ✅ | Settings sheet, CSV export |
| Notifications | ✅ | ✅ | Permission, due badges |
| Trip New | ✅ | — | Gradient preview |
| Trip Detail | ✅ | ✅ | Balance card, tabs, share |
| Settle Up | ✅ | — | Transfer cards |
| Add Expense | ✅ | — | Split controls, category grid |
| Personal Add | ✅ | — | Quick chips, recurrence |

All Playwright screenshots stored in `docs/progress/screenshots/` (paths listed at bottom of `05-verification.md` once created).