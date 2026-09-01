import { create } from "zustand";

import { createPreset, deletePreset, fetchPresets, updatePreset } from "@/api/presetsApi";
import type { FilterPreset, GraphFiltersState } from "@/lib/graph/filter-state/index";

interface PresetsStoreState {
  presets: FilterPreset[];
  errorMessage: string;
  isLoading: boolean;
  clearError: () => void;
  loadPresets: (baseUrl: string) => Promise<void>;
  addPreset: (baseUrl: string, name: string, filter: GraphFiltersState) => Promise<FilterPreset>;
  renamePreset: (baseUrl: string, id: string, name: string) => Promise<void>;
  removePreset: (baseUrl: string, id: string) => Promise<void>;
  savePreset: (baseUrl: string, id: string, name: string, filter: GraphFiltersState) => Promise<FilterPreset>;
}

function replacePreset(presets: FilterPreset[], preset: FilterPreset) {
  return presets.map((existingPreset) => (existingPreset.id === preset.id ? preset : existingPreset));
}

export const usePresetsStore = create<PresetsStoreState>((set) => ({
  presets: [],
  errorMessage: "",
  isLoading: false,

  clearError: () => set({ errorMessage: "" }),

  loadPresets: async (baseUrl: string) => {
    set({ errorMessage: "", isLoading: true });
    try {
      const items = await fetchPresets(baseUrl);
      set({ presets: items });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Could not load Smart Folders.",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  addPreset: async (baseUrl: string, name: string, filter: GraphFiltersState) => {
    set({ errorMessage: "" });
    const preset = await createPreset(baseUrl, { name, filter });
    set((state) => ({ presets: [...state.presets, preset] }));
    return preset;
  },

  renamePreset: async (baseUrl: string, id: string, name: string) => {
    set({ errorMessage: "" });
    const preset = await updatePreset(baseUrl, id, { name });
    set((state) => ({ presets: replacePreset(state.presets, preset) }));
  },

  savePreset: async (baseUrl: string, id: string, name: string, filter: GraphFiltersState) => {
    set({ errorMessage: "" });
    const preset = await updatePreset(baseUrl, id, { name, filter });
    set((state) => ({ presets: replacePreset(state.presets, preset) }));
    return preset;
  },

  removePreset: async (baseUrl: string, id: string) => {
    set({ errorMessage: "" });
    await deletePreset(baseUrl, id);
    set((state) => ({ presets: state.presets.filter((p) => p.id !== id) }));
  },
}));
