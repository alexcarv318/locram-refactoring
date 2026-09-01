import { create } from "zustand";
import { persist } from "zustand/middleware";

const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 24;
const FONT_SIZE_DEFAULT = 16;
const FONT_SIZE_STEP = 1;

interface EditorFontSizeState {
  fontSize: number;
  increase: () => void;
  decrease: () => void;
}

export const useEditorFontSizeStore = create<EditorFontSizeState>()(
  persist(
    (set, get) => ({
      fontSize: FONT_SIZE_DEFAULT,
      increase: () =>
        set({ fontSize: Math.min(get().fontSize + FONT_SIZE_STEP, FONT_SIZE_MAX) }),
      decrease: () =>
        set({ fontSize: Math.max(get().fontSize - FONT_SIZE_STEP, FONT_SIZE_MIN) }),
    }),
    { name: "locram-editor-font-size" },
  ),
);
