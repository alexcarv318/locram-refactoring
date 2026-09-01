import { useMemo } from "react";

import { createTranslator, type Translator } from "@/i18n/translate";
import { useUiPreferencesStore } from "@/stores/uiPreferencesStore";

export function useT(): Translator {
  const locale = useUiPreferencesStore((state) => state.locale);
  return useMemo(() => createTranslator(locale), [locale]);
}
