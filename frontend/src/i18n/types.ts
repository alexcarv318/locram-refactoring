export type LocaleCode = "en" | "ru" | "ar";

export type InterfaceDirection = "ltr" | "rtl" | "auto";

export type ResolvedDirection = "ltr" | "rtl";

export const LOCALE_CODES: readonly LocaleCode[] = ["en", "ru", "ar"] as const;

export const INTERFACE_DIRECTIONS: readonly InterfaceDirection[] = [
  "ltr",
  "rtl",
  "auto",
] as const;

export const DEFAULT_LOCALE: LocaleCode = "en";

export const DEFAULT_INTERFACE_DIRECTION: InterfaceDirection = "auto";

export const RTL_LOCALE_PREFIXES: readonly string[] = [
  "ar",
  "he",
  "fa",
  "ur",
  "yi",
  "dv",
  "ps",
] as const;

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: "English",
  ru: "Русский",
  ar: "العربية",
};

export const DIRECTION_LABELS: Record<InterfaceDirection, string> = {
  ltr: "Left to right",
  rtl: "Right to left",
  auto: "Auto (follow language)",
};
