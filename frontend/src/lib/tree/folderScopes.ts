import type { DictionaryKey } from "@/i18n/dictionaries/en";
import type { Translator } from "@/i18n/translate";
import { cloneGraphFilters, EMPTY_GRAPH_FILTERS, type FilterPreset } from "@/lib/graph/filter-state/index";

type BuiltInFolderLeaf = {
  kind: "leaf";
  id: string;
  labelKey: DictionaryKey;
};

type BuiltInFolderBranch = {
  kind: "branch";
  id: string;
  labelKey: DictionaryKey;
  items: BuiltInFolderLeaf[];
};

export type BuiltInFolderQuickEntry = BuiltInFolderBranch | BuiltInFolderLeaf;

const createdItems: BuiltInFolderLeaf[] = [
  {
    kind: "leaf",
    id: "builtin-folder-created-today",
    labelKey: "smartFolders.builtIn.today",
  },
  {
    kind: "leaf",
    id: "builtin-folder-created-week",
    labelKey: "smartFolders.builtIn.week",
  },
  {
    kind: "leaf",
    id: "builtin-folder-created-month",
    labelKey: "smartFolders.builtIn.month",
  },
];

const modifiedItems: BuiltInFolderLeaf[] = [
  {
    kind: "leaf",
    id: "builtin-folder-modified-today",
    labelKey: "smartFolders.builtIn.today",
  },
  {
    kind: "leaf",
    id: "builtin-folder-modified-week",
    labelKey: "smartFolders.builtIn.week",
  },
  {
    kind: "leaf",
    id: "builtin-folder-modified-month",
    labelKey: "smartFolders.builtIn.month",
  },
];

const standaloneItems: BuiltInFolderLeaf[] = [
  {
    kind: "leaf",
    id: "builtin-folder-need-review",
    labelKey: "smartFolders.builtIn.needReview",
  },
  {
    kind: "leaf",
    id: "builtin-folder-orphaned",
    labelKey: "smartFolders.builtIn.orphaned",
  },
];

export const BUILT_IN_FOLDER_QUICK_ACCESS: BuiltInFolderQuickEntry[] = [
  {
    kind: "branch",
    id: "builtin-folder-group-created",
    labelKey: "smartFolders.branch.created",
    items: createdItems,
  },
  {
    kind: "branch",
    id: "builtin-folder-group-modified",
    labelKey: "smartFolders.branch.modified",
    items: modifiedItems,
  },
  ...standaloneItems,
];

const builtInFolderLeaves = [...createdItems, ...modifiedItems, ...standaloneItems];

function findBuiltInFolderLeaf(
  scopeId: string,
): { labelKey: DictionaryKey; branchLabelKey?: DictionaryKey } | null {
  for (const entry of BUILT_IN_FOLDER_QUICK_ACCESS) {
    if (entry.kind === "leaf") {
      if (entry.id === scopeId) {
        return { labelKey: entry.labelKey };
      }
      continue;
    }
    const leaf = entry.items.find((item) => item.id === scopeId);
    if (leaf) {
      return { labelKey: leaf.labelKey, branchLabelKey: entry.labelKey };
    }
  }
  return null;
}

export function resolveBuiltInFolderScopeDisplayName(scopeId: string, t: Translator): string | null {
  const match = findBuiltInFolderLeaf(scopeId);
  if (!match) {
    return null;
  }
  if (match.branchLabelKey) {
    return t("smartFolders.builtIn.scopeLabel", {
      branch: t(match.branchLabelKey),
      period: t(match.labelKey),
    });
  }
  return t(match.labelKey);
}

export function resolveActivePresetDisplayName(
  activePresetId: string | null,
  activePresetName: string | null,
  customPresets: readonly FilterPreset[],
  t: Translator,
): string | null {
  if (!activePresetId) {
    return null;
  }
  const builtInLabel = resolveBuiltInFolderScopeDisplayName(activePresetId, t);
  if (builtInLabel) {
    return builtInLabel;
  }
  return customPresets.find((preset) => preset.id === activePresetId)?.name ?? activePresetName;
}

export function isBuiltInFolderScopeId(scopeId: string | null | undefined): boolean {
  if (!scopeId) {
    return false;
  }
  return builtInFolderLeaves.some((item) => item.id === scopeId);
}

export function buildBuiltInFolderPreset(scopeId: string, t: Translator): FilterPreset | null {
  const name = resolveBuiltInFolderScopeDisplayName(scopeId, t);
  if (!name) {
    return null;
  }
  return {
    id: scopeId,
    name,
    filter: cloneGraphFilters(EMPTY_GRAPH_FILTERS),
    created_at: "",
    updated_at: "",
  };
}

export function filterBuiltInFolderQuickAccess(scopeIds: string[]): BuiltInFolderQuickEntry[] {
  if (scopeIds.length === 0) {
    return BUILT_IN_FOLDER_QUICK_ACCESS;
  }
  const allowedScopeIds = new Set(scopeIds);
  return BUILT_IN_FOLDER_QUICK_ACCESS.flatMap((entry): BuiltInFolderQuickEntry[] => {
    if (entry.kind === "leaf") {
      return allowedScopeIds.has(entry.id) ? [entry] : [];
    }
    const items = entry.items.filter((item) => allowedScopeIds.has(item.id));
    if (items.length === 0) {
      return [];
    }
    return [{ ...entry, items }];
  });
}
