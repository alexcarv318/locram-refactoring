import type {
  InterfaceDirection,
  LocaleCode,
  ResolvedDirection,
} from "@/i18n/types";
import { RTL_LOCALE_PREFIXES } from "@/i18n/types";

export function resolveDirection(
  locale: LocaleCode,
  direction: InterfaceDirection,
): ResolvedDirection {
  if (direction === "ltr" || direction === "rtl") {
    return direction;
  }
  return inferDirectionFromLocale(locale);
}

export function inferDirectionFromLocale(locale: string): ResolvedDirection {
  const normalized = locale.toLowerCase().split(/[-_]/)[0] ?? "";
  return RTL_LOCALE_PREFIXES.includes(normalized) ? "rtl" : "ltr";
}
