# send-push Edge Function

Sends Expo push notifications for:

- **Payment reminders** (`type: "payment_reminder"`): validates the caller and
  recipients are trip members, validates each amount is a positive integer no
  larger than the trip's total expenses, records `payment_reminders`, and sends
  the reminder to every registered device for the recipient.
- **Trip invites** (`type: "trip_invite"`): looks up the invited email on
  `profiles`, skips people who already have an account on the trip, and sends a
  single notification. `notified_at` prevents duplicate pushes for 10 minutes.

## Deploy

```bash
supabase functions deploy send-push
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by
Supabase Edge Functions. **Do not create them as project secrets and never put
the service role key in an `EXPO_PUBLIC_*` variable.**

The function verifies the caller with `admin.auth.getUser(token)`; it does not
trust the request body for identity.

## Push prerequisites

1. Add `google-services.json` for Android FCM (client config, intentionally
   tracked in git).
2. Add `"android": { "googleServicesFile": "./google-services.json" }` to
   `app.json`.
3. Upload the Firebase service-account JSON to
   **Supabase → Project Settings → Messaging → FCM V1**.
4. Rebuild the release APK so the FCM client is bundled.

The app requests notification permission and registers an Expo push token the
first time a signed-in user opens the app. Tokens are stored in `push_tokens`;
the Edge Function deletes tokens that Expo reports as `DeviceNotRegistered`.

## Trust trade-off

The app computes reminder amounts from the same suggested transfers rendered on
the Settle screen. The Edge Function validates:

- the caller is a member of the trip,
- every recipient is a member with a real `user_id`,
- `amount_paise > 0` and `amount_paise <=` the trip's total expenses,
- the sender has not reminded that recipient in the last six hours.

It does **not** recompute the settle-up graph. A member could therefore send a
reminder for a smaller amount than the recipient actually owes (or for an amount
that does not match the current split). Treat the notification as a nudge, not a
verified debt. Moving the transfer calculation server-side is the follow-up if
this needs stronger guarantees.

## Notification copy

Payment reminder:

- Title: `Payment reminder from {senderName}`
- Body: `Hey {recipientName}, you owe {senderName} {symbol}{amount} for {tripName}. Pay up and settle in Splitie.`

Trip invite:

- Title: `{hostName} invited you to {tripName}`
- Body: `Tap to view and accept.`

Both use the Android `settlements` channel and data
`{ type, tripId | inviteId }`.
