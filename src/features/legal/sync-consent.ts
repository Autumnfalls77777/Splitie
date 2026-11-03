import { LEGAL_VERSION } from '@/content/legal';
import { useConsentStore } from '@/features/legal/consent.store';
import { captureException } from '@/lib/sentry';
import { supabase } from '@/lib/supabase';

/**
 * Best-effort copy of the locally accepted legal version into the signed-in
 * user's auth metadata. A metadata failure must never block sign-in.
 */
export async function syncConsentToAuthMetadata(): Promise<void> {
  const { acceptedVersion, acceptedAt } = useConsentStore.getState();
  if (!supabase || acceptedVersion !== LEGAL_VERSION || !acceptedAt) return;

  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        terms_version: acceptedVersion,
        terms_accepted_at: acceptedAt,
      },
    });
    if (error) throw error;
  } catch (error) {
    captureException(error, { scope: 'legal-consent-metadata' });
  }
}
