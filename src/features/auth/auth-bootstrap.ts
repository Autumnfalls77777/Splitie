import { supabase } from '@/lib/supabase';
import { useAuthStore } from './auth.store';

let started = false;
let stopListener: (() => void) | null = null;

/**
 * Restores the SecureStore session before the first route renders. getSession()
 * reads local storage, so this also works offline.
 */
export async function initializeAuth(): Promise<void> {
  if (started) return;
  started = true;

  if (!supabase) {
    useAuthStore.getState().restoreSession(null);
    return;
  }

  const { data } = await supabase.auth.getSession();
  useAuthStore.getState().restoreSession(data.session);

  if (!stopListener) {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Never call other Supabase methods inside this callback; the store only
      // maps the session and schedules the profile write.
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().handleSignedOut();
      } else if (session) {
        useAuthStore.getState().restoreSession(session);
      }
    });
    stopListener = () => listener.subscription.unsubscribe();
  }
}
