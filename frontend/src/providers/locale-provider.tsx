import { createContext, useContext, useMemo, type ReactNode } from "react";

import { LOCALE_CODES, type LocaleCode } from "@/i18n/types";
import { useUiPreferencesStore } from "@/stores/uiPreferencesStore";

interface LocaleContextValue {
  locale: LocaleCode;
  availableLocales: readonly LocaleCode[];
  setLocale: (locale: LocaleCode) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const locale = useUiPreferencesStore((state) => state.locale);
  const setLocale = useUiPreferencesStore((state) => state.setLocale);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      availableLocales: LOCALE_CODES,
      setLocale,
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
