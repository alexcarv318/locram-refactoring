import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DEFAULT_INTERFACE_DIRECTION,
  DEFAULT_LOCALE,
  INTERFACE_DIRECTIONS,
  LOCALE_CODES,
  type InterfaceDirection,
  type LocaleCode,
} from "@/i18n/types";

export const UI_PREFERENCES_STORAGE_KEY = "locram-ui-preferences";

interface UiPreferencesState {
  locale: LocaleCode;
  direction: InterfaceDirection;
  setLocale: (locale: LocaleCode) => void;
  setDirection: (direction: InterfaceDirection) => void;
  reset: () => void;
}

function isLocale(value: unknown): value is LocaleCode {
  return typeof value === "string" && (LOCALE_CODES as readonly string[]).includes(value);
}

function isDirection(value: unknown): value is InterfaceDirection {
  return (
    typeof value === "string" && (INTERFACE_DIRECTIONS as readonly string[]).includes(value)
  );
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      direction: DEFAULT_INTERFACE_DIRECTION,
      setLocale: (locale) => {
        if (!isLocale(locale)) {
          return;
        }
        set({ locale });
      },
      setDirection: (direction) => {
        if (!isDirection(direction)) {
          return;
        }
        set({ direction });
      },
      reset: () =>
        set({
          locale: DEFAULT_LOCALE,
          direction: DEFAULT_INTERFACE_DIRECTION,
        }),
    }),
    {
      name: UI_PREFERENCES_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        locale: state.locale,
        direction: state.direction,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<UiPreferencesState>;
        const locale = isLocale(persisted.locale) ? persisted.locale : currentState.locale;
        const direction = isDirection(persisted.direction)
          ? persisted.direction
          : currentState.direction;
        return { ...currentState, locale, direction };
      },
    },
  ),
);
