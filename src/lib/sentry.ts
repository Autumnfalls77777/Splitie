import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

export const isSentryConfigured = Boolean(dsn);

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: __DEV__ ? 'development' : 'production',
  release: process.env.EXPO_PUBLIC_APP_VERSION,
  tracesSampleRate: __DEV__ ? 1 : 0.2,
  sendDefaultPii: false,
  enableNativeCrashHandling: true,
  debug: false,
});

Sentry.setTag('app', 'splitie');

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!isSentryConfigured) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export { Sentry };
