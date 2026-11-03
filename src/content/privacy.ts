import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
  LEGAL_VERSION,
} from './legal';

export const PRIVACY_TITLE = 'Privacy Policy';
export const PRIVACY_VERSION = LEGAL_VERSION;
export const PRIVACY_EFFECTIVE_DATE = LEGAL_EFFECTIVE_DATE;
export const PRIVACY_LAST_UPDATED = LEGAL_LAST_UPDATED;

export const PRIVACY_TEXT = `This Privacy Policy explains what information Splitie ("we", "us", "our") collects when you use the Splitie mobile app, how we use it, who we share it with, and the choices you have. Splitie is operated by Prabal Jaiswal. By creating an account or using the app you agree to this policy. If you do not agree, please do not use the app.

1. Information we collect
Information you give us
• Account details: your name, email address and profile picture. If you sign in with Google, we receive your name, email address and profile picture from Google. If you sign up with email and password, your password is handled by our authentication provider and is stored in hashed form; we cannot read it.
• Trip and expense data: trip names and dates, the members of a trip, expenses, amounts, notes, who paid, how costs are split, settlement records, and trip join codes.
• Invites and reminders: email addresses you enter to invite someone to a trip, and the payment reminders you choose to send to other members.

Information collected automatically
• Usage analytics: we use PostHog to understand how the app is used, such as sign-ins, screens viewed and features used, along with device type, operating system, app version and an approximate location derived from your IP address. Events are linked to your account, which may include your name and email address.
• Error and crash reports: we use Sentry to detect and fix bugs. A report can include the error, technical details such as the device model, operating system and app version, and your account identifier, email address or name so that we can investigate problems.
• Push notification token: if you allow notifications, we store a device token so we can deliver trip invites and payment reminders to your phone.
• On-device storage: the app stores your session and some trip data on your device so it works smoothly.

We do not collect your precise location, contacts, photos (unless you choose a profile picture), SMS messages, or any bank account, card or UPI details.

2. How we use your information
• To create your account, sign you in and keep your session secure.
• To run the core features: creating trips, adding members, splitting expenses and showing who owes whom.
• To send notifications you ask for or expect, such as trip invites and payment reminders from other members.
• To monitor performance, find and fix bugs, and improve the app (analytics and error reports).
• To protect the service from abuse and to comply with the law.

We do not sell your personal information and we do not use it for third-party advertising.

3. What other people can see
When you join a trip, other members of that trip can see your name, profile picture, and the expenses and balances recorded in that trip. A person who invites you by email will know the email address they typed, and you will be shown who invited you and the trip name before you accept. Anyone who has a trip's join code can join that trip, so share codes only with people you trust.

4. Who we share information with
We use trusted service providers who process data on our behalf:

Provider
Purpose
Data involved
Supabase
Authentication, database and server functions
Account details, trip and expense data, invites, push tokens
Google
"Sign in with Google"
Name, email, profile picture (only if you choose Google sign-in)
PostHog
Product analytics
Usage events, device information, account identifier, name and email
Sentry
Error and crash reporting
Error details, device information, account identifier, email, name
Expo / Google Firebase
Delivering push notifications
Push token and notification content

We may also disclose information if required by law, to enforce our Terms of Service, to protect the rights, safety or property of users or others, or in connection with a merger, acquisition or sale of the service. These providers have their own privacy policies, and we encourage you to read them.

5. International data transfers
Our providers may store and process data on servers outside India, including in the United States or other countries. By using the app you understand that your information may be transferred to and processed in those locations, and we choose providers that apply reasonable security safeguards.

6. How long we keep information
We keep your account and trip data for as long as your account is active. If you ask us to delete your account, we will delete or anonymise your personal information within a reasonable period, except where we must keep something to meet legal obligations or resolve disputes. Expense records in a trip that other members still use may be kept in anonymised form so their balances stay accurate. Analytics and error data are kept for the retention periods set in our PostHog and Sentry projects and are then deleted automatically. Backups are overwritten on a regular cycle.

7. Your choices and rights
• Access and correction: you can view and edit your name and email in the app, or ask us for a copy of the personal information we hold about you.
• Deletion: you can ask us to delete your account and personal data by emailing us.
• Withdraw consent: you can stop using the app at any time and ask us to stop processing your data.
• Notifications: you can turn notifications off in your phone's settings, or deny the permission.
• Grievances: if you have a complaint about how we handle your data, contact us using the details below. We aim to respond within 30 days.

You may have additional rights under the laws that apply to you, including India's Digital Personal Data Protection Act, 2023. We will honour those rights as required.

8. Security
We protect your information with measures such as encrypted connections (HTTPS), access controls on our database so that you can only reach data you are allowed to see, and secure on-device storage for your session. No system is completely secure, so we cannot guarantee absolute security. Please keep your login details safe.

9. Children
Splitie is not intended for anyone under 18. We do not knowingly collect information from children. If you believe a child has given us personal information, contact us and we will delete it.

10. Permissions the app may ask for
• Notifications: to deliver trip invites and payment reminders.
• Exact alarms (Android): to schedule reminders at a specific time.
• Photos/camera (if you add a profile picture): only to let you choose an image.

11. Changes to this policy
We may update this policy from time to time. When we make important changes we will update the date at the top and, where appropriate, notify you in the app. Continuing to use the app after a change means you accept the updated policy.

12. Contact us
Questions, requests or complaints about your data: email prabaljaiswal69420@gmail.com. Operator: Prabal Jaiswal.`;
