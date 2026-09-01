import type { DictionaryKey } from "@/i18n/dictionaries/en";
import type { Translator } from "@/i18n/translate";

const PAGE_TYPE_LABEL_KEYS: Record<string, DictionaryKey> = {
  fleeting: "pageType.fleeting",
  "note-taking": "pageType.noteTaking",
  permanent: "pageType.permanent",
  structure: "pageType.structure",
  hub: "pageType.hub",
};

const PAGE_STATUS_LABEL_KEYS: Record<string, DictionaryKey> = {
  active: "pageStatus.active",
  archived: "pageStatus.archived",
  to_delete: "pageStatus.to_delete",
};

const LINK_TYPE_LABEL_KEYS: Record<string, DictionaryKey> = {
  parent: "linkType.parent",
  tag: "linkType.tag",
  related: "linkType.related",
  extends: "linkType.extends",
  extended_by: "linkType.extended_by",
  supports: "linkType.supports",
  supported_by: "linkType.supported_by",
  contradicts: "linkType.contradicts",
  contradicted_by: "linkType.contradicted_by",
  refines: "linkType.refines",
  refined_by: "linkType.refined_by",
  questions: "linkType.questions",
  questioned_by: "linkType.questioned_by",
  reference: "linkType.reference",
};

function translateFromMap(
  map: Record<string, DictionaryKey>,
  value: string,
  t: Translator,
): string {
  const key = map[value];
  if (key) {
    return t(key);
  }
  return value.replace(/_/g, " ");
}

export function localizePageType(value: string, t: Translator): string {
  return translateFromMap(PAGE_TYPE_LABEL_KEYS, value, t);
}

export function localizePageStatus(value: string, t: Translator): string {
  return translateFromMap(PAGE_STATUS_LABEL_KEYS, value, t);
}

export function localizeLinkType(value: string, t: Translator): string {
  return translateFromMap(LINK_TYPE_LABEL_KEYS, value, t);
}

export function localizeFilterValue(
  title: string,
  value: string,
  t: Translator,
): string {
  if (title === "Type" || title === "filters.title.type") {
    return localizePageType(value, t);
  }
  if (title === "Status" || title === "filters.title.status") {
    return localizePageStatus(value, t);
  }
  if (title === "Relations" || title === "filters.title.relations") {
    return localizeLinkType(value, t);
  }
  return value.replace(/_/g, " ");
}
