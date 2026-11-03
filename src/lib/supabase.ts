import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { secureStorage } from './secure-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const publishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        storage: secureStorage,
        storageKey: 'splitie-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
      global: {
        headers: { 'x-application-name': 'splitie' },
      },
      db: { schema: 'public' },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Cloud sync is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment.',
    );
  }
  return supabase;
}
