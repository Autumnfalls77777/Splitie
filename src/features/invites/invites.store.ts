import { create } from 'zustand';

import { useAuthStore } from '@/features/auth/auth.store';
import { getMyPendingInvites, type PendingInvite } from '@/features/trips/sharing';

type InviteState = {
  invites: PendingInvite[];
  activeInviteId: string | null;
  /** Increments when a different invite opens so the sheet remounts cleanly. */
  session: number;
  loading: boolean;
  error: string | null;
  refresh: (options?: { open?: boolean }) => Promise<void>;
  open: (inviteId?: string) => void;
  close: () => void;
  dismiss: (inviteId: string) => void;
  reset: () => void;
};

export const useInviteStore = create<InviteState>((set, get) => ({
  invites: [],
  activeInviteId: null,
  session: 0,
  loading: false,
  error: null,

  refresh: async (options) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ invites: [], activeInviteId: null, session: 0, loading: false, error: null });
      return;
    }

    set({ loading: true, error: null });
    try {
      const invites = await getMyPendingInvites();
      set((state) => {
        const currentStillExists =
          state.activeInviteId != null &&
          invites.some((invite) => invite.inviteId === state.activeInviteId);
        const nextActive = currentStillExists
          ? state.activeInviteId
          : options?.open && invites.length > 0
            ? invites[0].inviteId
            : null;
        const opened = nextActive !== null && nextActive !== state.activeInviteId;
        return {
          invites,
          activeInviteId: nextActive,
          session: opened ? state.session + 1 : state.session,
          loading: false,
        };
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Could not load invites.',
      });
    }
  },

  open: (inviteId) => {
    const state = get();
    const nextId = inviteId ?? state.invites[0]?.inviteId ?? null;
    const opened = nextId !== null && nextId !== state.activeInviteId;
    set({
      activeInviteId: nextId,
      session: opened ? state.session + 1 : state.session,
    });
    if (state.invites.length === 0) void get().refresh();
  },

  close: () => set({ activeInviteId: null }),

  dismiss: (inviteId) =>
    set((state) => {
      const invites = state.invites.filter((invite) => invite.inviteId !== inviteId);
      return {
        invites,
        activeInviteId: state.activeInviteId === inviteId ? null : state.activeInviteId,
      };
    }),

  reset: () =>
    set({ invites: [], activeInviteId: null, session: 0, loading: false, error: null }),
}));
