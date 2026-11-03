import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: number;
  message: string;
  description?: string;
  kind: ToastKind;
};

type UIState = {
  toast: ToastMessage | null;
  addSheetOpen: boolean;
  showToast: (message: string, options?: { description?: string; kind?: ToastKind }) => void;
  hideToast: () => void;
  openAddSheet: () => void;
  closeAddSheet: () => void;
};

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  toast: null,
  addSheetOpen: false,
  showToast: (message, options) =>
    set({
      toast: {
        id: (toastId += 1),
        message,
        description: options?.description,
        kind: options?.kind ?? 'success',
      },
    }),
  hideToast: () => set({ toast: null }),
  openAddSheet: () => set({ addSheetOpen: true }),
  closeAddSheet: () => set({ addSheetOpen: false }),
}));
