import type { ReactNode } from "react";

import PopoverSelect, {
  type PopoverSelectOption,
} from "@/components/ui/PopoverSelect";
import type { DictionaryKey } from "@/i18n/dictionaries/en";
import {
  type InterfaceDirection,
  type LocaleCode,
} from "@/i18n/types";
import { useT } from "@/i18n/useT";
import { SETTINGS_CARD_DESCRIPTION_CLASS } from "@/lib/settings/settingsUi";
import { useDirection } from "@/providers/direction-provider";
import { useLocale } from "@/providers/locale-provider";

const LOCALE_LABEL_KEY: Record<LocaleCode, DictionaryKey> = {
  en: "settings.locale.en",
  ru: "settings.locale.ru",
  ar: "settings.locale.ar",
};

const DIRECTION_LABEL_KEY: Record<InterfaceDirection, DictionaryKey> = {
  ltr: "settings.direction.ltr",
  rtl: "settings.direction.rtl",
  auto: "settings.direction.auto",
};

export const APPEARANCE_SELECT_TRIGGER_CLASS_NAME =
  "w-full min-w-0 sm:w-[176px] sm:min-w-[176px]";

interface InterfaceSettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function InterfaceSettingsCard({
  title,
  description,
  children,
}: InterfaceSettingsCardProps) {
  return (
    <div className="border-border bg-background flex min-h-14 flex-col justify-center rounded-xl border px-4 py-3">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h3 className="text-foreground text-sm font-semibold">{title}</h3>
          {description ? (
            <p className={SETTINGS_CARD_DESCRIPTION_CLASS}>{description}</p>
          ) : null}
        </div>
        <div className="flex w-full items-center justify-end gap-2 lg:w-auto">{children}</div>
      </div>
    </div>
  );
}

export default function InterfaceSettingsSection() {
  const t = useT();
  const { locale, availableLocales, setLocale } = useLocale();
  const { direction, availableDirections, setDirection } = useDirection();

  const languageLabel = t("settings.section.interface.language.label");
  const directionLabel = t("settings.section.interface.direction.label");

  const localeOptions: PopoverSelectOption<LocaleCode>[] = availableLocales.map(
    (code) => ({
      value: code,
      label: t(LOCALE_LABEL_KEY[code]),
    }),
  );

  const directionOptions: PopoverSelectOption<InterfaceDirection>[] =
    availableDirections.map((value) => ({
      value,
      label: t(DIRECTION_LABEL_KEY[value]),
    }));

  return (
    <>
      <InterfaceSettingsCard
        title={t("settings.section.interface.language.title")}
        description={t("settings.section.interface.language.description")}
      >
        <PopoverSelect<LocaleCode>
          id="locram-settings-language"
          ariaLabel={languageLabel}
          options={localeOptions}
          triggerClassName={APPEARANCE_SELECT_TRIGGER_CLASS_NAME}
          value={locale}
          onChange={setLocale}
        />
      </InterfaceSettingsCard>

      <InterfaceSettingsCard
        title={t("settings.section.interface.direction.title")}
        description={t("settings.section.interface.direction.description")}
      >
        <PopoverSelect<InterfaceDirection>
          id="locram-settings-direction"
          ariaLabel={directionLabel}
          options={directionOptions}
          triggerClassName={APPEARANCE_SELECT_TRIGGER_CLASS_NAME}
          value={direction}
          onChange={setDirection}
        />
      </InterfaceSettingsCard>
    </>
  );
}
