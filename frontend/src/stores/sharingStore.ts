import { create } from "zustand";

type BaseSharePanelFocus = "create" | null;

interface SharingState {
  lastBaseShareInviteUrl: string | null;
  selectedBaseShareGrantId: string | null;
  baseSharePanelFocus: BaseSharePanelFocus;
  setLastBaseShareInviteUrl: (inviteUrl: string | null) => void;
  setSelectedBaseShareGrantId: (grantId: string | null) => void;
  clearSelectedBaseShareGrantId: () => void;
  requestBaseSharePanelFocus: (focus: Exclude<BaseSharePanelFocus, null>) => void;
  clearBaseSharePanelFocus: () => void;
}

export const useSharingStore = create<SharingState>((set) => ({
  lastBaseShareInviteUrl: null,
  selectedBaseShareGrantId: null,
  baseSharePanelFocus: null,
  setLastBaseShareInviteUrl: (lastBaseShareInviteUrl) => set({ lastBaseShareInviteUrl }),
  setSelectedBaseShareGrantId: (selectedBaseShareGrantId) => set({ selectedBaseShareGrantId }),
  clearSelectedBaseShareGrantId: () => set({ selectedBaseShareGrantId: null }),
  requestBaseSharePanelFocus: (baseSharePanelFocus) => set({ baseSharePanelFocus }),
  clearBaseSharePanelFocus: () => set({ baseSharePanelFocus: null }),
}));
