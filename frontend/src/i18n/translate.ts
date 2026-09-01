import { ar } from "@/i18n/dictionaries/ar";
import { en, type DictionaryKey } from "@/i18n/dictionaries/en";
import { ru } from "@/i18n/dictionaries/ru";
import type { LocaleCode } from "@/i18n/types";

export type Dictionary = Record<DictionaryKey, string>;

export const DICTIONARIES: Record<LocaleCode, Dictionary> = {
  en,
  ru,
  ar,
};

export type TranslationParams = Record<string, string | number>;

export type Translator = (key: DictionaryKey, params?: TranslationParams) => string;

const INTERPOLATION_PATTERN = /\{(\w+)\}/g;

export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }
  return template.replace(INTERPOLATION_PATTERN, (match, name: string) => {
    const value = params[name];
    if (value === undefined) {
      return match;
    }
    return String(value);
  });
}

export function translate(
  locale: LocaleCode,
  key: DictionaryKey,
  params?: TranslationParams,
): string {
  const dictionary = DICTIONARIES[locale];
  const value = dictionary[key];
  const template = typeof value === "string" ? value : en[key];
  return interpolate(template, params);
}

export function createTranslator(locale: LocaleCode): Translator {
  return (key, params) => translate(locale, key, params);
}
