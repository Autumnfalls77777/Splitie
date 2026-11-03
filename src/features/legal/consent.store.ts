import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { LEGAL_VERSION } from '@/content/legal';
import { appStorage } from '@/lib/storage';

type ConsentState = {
  acceptedVersion: string | null;
  acceptedAt: string | null;
  accept: (version?: string) => void;
  clear: () => void;
};

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      acceptedVersion: null,
      acceptedAt: null,
      accept: (version = LEGAL_VERSION) =>
        set({
          acceptedVersion: version,
          acceptedAt: new Date().toISOString(),
        }),
      clear: () => set({ acceptedVersion: null, acceptedAt: null }),
    }),
    {
      name: 'splitie-legal-consent',
      version: 1,
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        acceptedVersion: state.acceptedVersion,
        acceptedAt: state.acceptedAt,
      }),
    },
  ),
);
