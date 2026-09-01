import type { DictionaryKey } from "@/i18n/dictionaries/en";

export function searchMatchKindI18nKey(matchKind?: string): DictionaryKey | null {
  if (!matchKind) {
    return null;
  }
  switch (matchKind) {
    case "title":
      return "workspace.search.matchKind.title";
    case "id":
      return "workspace.search.matchKind.id";
    case "content":
      return "workspace.search.matchKind.content";
    default:
      return "workspace.search.matchKind.other";
  }
}
