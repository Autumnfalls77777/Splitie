import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/lib/storage';
import { captureEvent, posthog } from '@/lib/posthog';
import { posthogAppLogger } from '@/lib/posthog-logger';
import { captureException, Sentry } from '@/lib/sentry';
import { requireSupabase, supabase } from '@/lib/supabase';
import { releaseLocalData } from '@/features/sync/local-data';
import type { User } from '@/types/models';

type AuthState = {
  user: User | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  restoreSession: (session: Session | null) => User | null;
  handleSignedOut: () => void;
  signOut: () => void;
  updateUser: (patch: Partial<Pick<User, 'name' | 'email'>>) => void;
};

export class EmailConfirmationRequiredError extends Error {
  email: string;

  constructor(email: string) {
    super(`Account created. Check ${email} for a confirmation link, then sign in.`);
    this.name = 'EmailConfirmationRequiredError';
    this.email = email;
  }
}

function authRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth-callback`;
  }
  return Linking.createURL('auth-callback');
}

function sessionToUser(user: SupabaseUser): User {
  const metadata = user.user_metadata ?? {};
  const email = user.email ?? '';
  const name =
    (typeof metadata.name === 'string' && metadata.name.trim()) ||
    (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
    email.split('@')[0] ||
    'Splitie user';
  const avatar =
    (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
    (typeof metadata.picture === 'string' && metadata.picture) ||
    undefined;
  const provider =
    user.app_metadata?.provider === 'google' || metadata.iss?.includes('google')
      ? 'google'
      : 'password';

  return {
    id: user.id,
    name,
    email,
    createdAt: user.created_at ?? new Date().toISOString(),
    provider,
    avatarUrl: avatar,
  };
}

function identify(user: User) {
  posthog?.identify(user.id, {
    $set: {
      name: user.name,
      email: user.email,
      auth_provider: user.provider ?? 'password',
    },
  });
  if (user.email || user.name) {
    Sentry.setUser({ id: user.id, email: user.email, username: user.name });
  }
}

function friendlyAuthError(error: { message?: string } | null, fallback: string): string {
  const message = (error?.message ?? '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('email not confirmed')) {
    return 'Confirm your email first. Check your inbox for the confirmation link.';
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (message.includes('password should be')) {
    return 'Use a stronger password (at least 6 characters).';
  }
  return error?.message || fallback;
}

async function syncProfile(user: User) {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client.from('profiles').upsert(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatarUrl ?? null,
      },
      { onConflict: 'id' },
    );
    if (error) captureException(new Error(error.message), { scope: 'profile-upsert' });
  } catch (error) {
    captureException(error, { scope: 'profile-upsert' });
  }
}

function applySession(session: Session, set: (partial: Partial<AuthState>) => void): User {
  const user = sessionToUser(session.user);
  set({ user });
  identify(user);
  void syncProfile(user);
  return user;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,

      signIn: async (email, password) => {
        const normalized = email.trim().toLowerCase();
        if (!normalized) throw new Error('Enter your email address.');
        if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error('Enter a valid email address.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        const { data, error } = await requireSupabase().auth.signInWithPassword({
          email: normalized,
          password,
        });
        if (error) throw new Error(friendlyAuthError(error, 'Could not sign you in.'));
        if (!data.session) throw new Error('Could not start your session. Please try again.');

        const user = applySession(data.session, set);
        posthogAppLogger.info('password authentication completed', { auth_provider: 'password' });
        captureEvent('signed_in', { method: 'password' });
        return user;
      },

      signUp: async (name, email, password) => {
        if (name.trim().length < 2) throw new Error('Tell us your name.');
        const normalized = email.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error('Enter a valid email address.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        const { data, error } = await requireSupabase().auth.signUp({
          email: normalized,
          password,
          options: {
            data: { name: name.trim() },
            emailRedirectTo: authRedirectUrl(),
          },
        });
        if (error) throw new Error(friendlyAuthError(error, 'Could not create your account.'));

        // Supabase intentionally returns a user with no identities when the
        // email is already registered, without raising an error.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error('An account with this email already exists. Sign in instead.');
        }

        if (!data.session) {
          captureEvent('signup_confirmation_sent');
          throw new EmailConfirmationRequiredError(normalized);
        }

        const user = applySession(data.session, set);
        posthogAppLogger.info('account registration completed', { auth_provider: 'password' });
        captureEvent('signed_up', { method: 'password' });
        return user;
      },

      signInWithGoogle: async () => {
        const client = requireSupabase();
        const redirectTo = authRedirectUrl(); // Linking.createURL('auth-callback')

        if (Platform.OS === 'web') {
          const { error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo,
              queryParams: { prompt: 'select_account' },
            },
          });
          if (error) throw new Error(friendlyAuthError(error, 'Could not start Google sign-in.'));
          captureEvent('google_signin_started', { platform: 'web' });
          // The browser is navigating to Google. Keep the button in its loading
          // state until the callback route takes over.
          return new Promise<User>(() => {});
        }

        // --- NATIVE PATH ---
        const { data, error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            queryParams: { prompt: 'select_account' },
          },
        });
        if (error || !data.url) {
          throw new Error(friendlyAuthError(error, 'Could not start Google sign-in.'));
        }

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success' || !result.url) {
          throw new Error('Google sign-in was cancelled.');
        }

        // Parse query and hash manually (Linking.parse() only returns queryParams)
        const u = result.url;
        const hashIdx = u.indexOf('#');
        const beforeHash = hashIdx >= 0 ? u.slice(0, hashIdx) : u;
        const qIdx = beforeHash.indexOf('?');
        const query = new URLSearchParams(qIdx >= 0 ? beforeHash.slice(qIdx + 1) : '');
        const hashParams = new URLSearchParams(hashIdx >= 0 ? u.slice(hashIdx + 1) : '');
        const pick = (k: string) => query.get(k) || hashParams.get(k) || '';

        const providerError = pick('error_description') || pick('error');
        if (providerError) throw new Error(providerError);

        const code = pick('code');
        const accessToken = pick('access_token');
        const refreshToken = pick('refresh_token');
        if (code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // Race guard: if exchange failed but a session now exists, treat as success
            const { data: existing } = await client.auth.getSession();
            if (!existing.session) {
              throw new Error(friendlyAuthError(exchangeError, 'Could not finish Google sign-in.'));
            }
          }
        } else if (typeof accessToken === 'string' && typeof refreshToken === 'string') {
          const { error: sessionError } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            // Race guard: if setSession failed but a session now exists, treat as success
            const { data: existing } = await client.auth.getSession();
            if (!existing.session) {
              throw new Error(friendlyAuthError(sessionError, 'Could not finish Google sign-in.'));
            }
          }
        } else {
          throw new Error('Google did not return an authorization code or tokens.');
        }

        const { data: sessionData } = await client.auth.getSession();
        if (!sessionData.session) throw new Error('Google did not return a session. Please try again.');

        const user = applySession(sessionData.session, set);
        posthogAppLogger.info('google authentication completed', { auth_provider: 'google' });
        captureEvent('signed_in', { method: 'google' });
        return user;
      },

      restoreSession: (session) => {
        if (!session) {
          set({ user: null });
          return null;
        }
        return applySession(session, set);
      },

      handleSignedOut: () => {
        if (get().user) {
          posthogAppLogger.info('session ended');
          posthog?.reset();
          Sentry.setUser(null);
        }
        set({ user: null });
        void releaseLocalData();
      },

      signOut: () => {
        posthogAppLogger.info('user signed out');
        posthog?.reset();
        Sentry.setUser(null);
        set({ user: null });
        void releaseLocalData();
        void supabase?.auth.signOut({ scope: 'local' });
      },

      updateUser: (patch) => {
        const current = get().user;
        if (!current) return;
        const updated = { ...current, ...patch };
        set({ user: updated });
        void syncProfile(updated);
      },
    }),
    {
      name: 'splitie-auth',
      version: 3,
      storage: createJSONStorage(() => appStorage),
      migrate: (persistedState, version) => {
        if (version < 3) {
          // Pre-Supabase local accounts are superseded by cloud sessions.
          return { user: null };
        }
        return persistedState as Pick<AuthState, 'user'>;
      },
      partialize: (state) => ({ user: state.user }),
    },
  ),
);