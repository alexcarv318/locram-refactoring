import { create } from "zustand";

import {
  type FilterPreset,
  type SmartFolderFilterSnapshot,
} from "@/lib/graph/filter-state/index";

export type SmartFolderModalMode = "create" | "edit";

type SmartFolderModalState = {
  draftName: string;
  exportStepOpen: boolean;
  isOpen: boolean;
  mode: SmartFolderModalMode;
  presetId: string | null;
  snapshot: SmartFolderFilterSnapshot | null;
  closeModal: () => void;
  openCreateModal: (snapshot: SmartFolderFilterSnapshot, draftName?: string) => void;
  openEditModal: (preset: FilterPreset, snapshot: SmartFolderFilterSnapshot) => void;
  openExportModal: (snapshot: SmartFolderFilterSnapshot) => void;
  setDraftName: (value: string) => void;
};

export const useSmartFolderModalStore = create<SmartFolderModalState>((set) => ({
  draftName: "",
  exportStepOpen: false,
  isOpen: false,
  mode: "create",
  presetId: null,
  snapshot: null,

  closeModal: () =>
    set({
      isOpen: false,
      presetId: null,
      snapshot: null,
      draftName: "",
      mode: "create",
      exportStepOpen: false,
    }),

  openCreateModal: (snapshot, draftName = "") =>
    set({
      isOpen: true,
      mode: "create",
      presetId: null,
      snapshot,
      draftName,
      exportStepOpen: false,
    }),

  openEditModal: (preset, snapshot) =>
    set({
      isOpen: true,
      mode: "edit",
      presetId: preset.id,
      snapshot,
      draftName: preset.name,
      exportStepOpen: false,
    }),

  openExportModal: (snapshot) =>
    set({
      isOpen: true,
      mode: "create",
      presetId: null,
      snapshot,
      draftName: "",
      exportStepOpen: true,
    }),

  setDraftName: (value) => set({ draftName: value }),
}));
