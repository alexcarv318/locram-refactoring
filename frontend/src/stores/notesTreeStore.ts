import { create } from "zustand";

import {
  fetchPageAncestry,
  fetchPagesByParent,
} from "@/api";
import { workingBaseReadOptions } from "@/lib/workingBaseReadOptions";
import type { PageSummary } from "@/types";
import type { ActiveSource } from "@/types/source";

function ancestorCacheKey(scopeKey: string, pageId: string): string {
  return `${scopeKey}::page:${pageId}`;
}

function parentCacheKey(scopeKey: string, parentId: string): string {
  return `${scopeKey}::parent:${parentId}`;
}

function scopedEntryPrefix(scopeKey: string, entryKind: "page" | "parent"): string {
  return `${scopeKey}::${entryKind}:`;
}

export { workingBaseReadOptions } from "@/lib/workingBaseReadOptions";

export function buildNotesTreeScopeKey(
  baseUrl: string,
  workingBaseScopeKey?: string | null,
): string {
  return `${baseUrl}::${workingBaseScopeKey ?? "local-runtime"}`;
}

export function selectScopedChildrenByParentId(
  childrenByParentId: Record<string, PageSummary[]>,
  scopeKey: string,
): Record<string, PageSummary[]> {
  const prefix = scopedEntryPrefix(scopeKey, "parent");
  return Object.fromEntries(
    Object.entries(childrenByParentId)
      .filter(([cacheKey]) => cacheKey.startsWith(prefix))
      .map(([cacheKey, children]) => [cacheKey.slice(prefix.length), children]),
  );
}

interface NotesTreeStoreState {
  ancestorIdsByPageId: Record<string, string[]>;
  childrenByParentId: Record<string, PageSummary[]>;
  expandedParentIdsByScopeKey: Record<string, string[]>;
  loadingParentIds: Set<string>;
  setExpandedParentIdsForScope: (scopeKey: string, parentIds: Set<string>) => void;
  getExpandedParentIdsForScope: (scopeKey: string) => Set<string>;
  loadAncestorPath: (
    baseUrl: string,
    pageId: string,
    activeSource?: ActiveSource | null,
    workingBaseScopeKey?: string | null,
  ) => Promise<string[]>;
  loadChildren: (
    baseUrl: string,
    parentId: string,
    activeSource?: ActiveSource | null,
    workingBaseScopeKey?: string | null,
  ) => Promise<void>;
  invalidateChildren: (
    baseUrl?: string,
    workingBaseScopeKey?: string | null,
  ) => void;
  invalidateAndReloadExpanded: (
    baseUrl: string,
    expandedIds: Set<string>,
    activeSource?: ActiveSource | null,
    workingBaseScopeKey?: string | null,
  ) => Promise<void>;
}

export const useNotesTreeStore = create<NotesTreeStoreState>((set, get) => ({
  ancestorIdsByPageId: {},
  childrenByParentId: {},
  expandedParentIdsByScopeKey: {},
  loadingParentIds: new Set(),

  setExpandedParentIdsForScope: (scopeKey: string, parentIds: Set<string>) => {
    set((state) => ({
      expandedParentIdsByScopeKey: {
        ...state.expandedParentIdsByScopeKey,
        [scopeKey]: [...parentIds],
      },
    }));
  },

  getExpandedParentIdsForScope: (scopeKey: string) => {
    return new Set(get().expandedParentIdsByScopeKey[scopeKey] ?? []);
  },

  loadAncestorPath: async (
    baseUrl: string,
    pageId: string,
    activeSource?: ActiveSource | null,
    workingBaseScopeKey?: string | null,
  ) => {
    const scopeKey = buildNotesTreeScopeKey(baseUrl, workingBaseScopeKey);
    const scopedPageId = ancestorCacheKey(scopeKey, pageId);
    const cachedAncestorIds = get().ancestorIdsByPageId[scopedPageId];
    const ancestorIds =
      cachedAncestorIds ??
      (await (async () => {
        try {
          const items = await fetchPageAncestry(
            baseUrl,
            pageId,
            workingBaseReadOptions(activeSource),
          );
          const nextAncestorIds = items.map((item) => item.id);
          set((state) => ({
            ancestorIdsByPageId: {
              ...state.ancestorIdsByPageId,
              [scopedPageId]: nextAncestorIds,
            },
          }));
          return nextAncestorIds;
        } catch {
          return [];
        }
      })());

    await Promise.all(
      ancestorIds.map((parentId) =>
        get().childrenByParentId[parentCacheKey(scopeKey, parentId)]
          ? Promise.resolve()
          : get().loadChildren(baseUrl, parentId, activeSource, workingBaseScopeKey),
      ),
    );

    return ancestorIds;
  },

  loadChildren: async (
    baseUrl: string,
    parentId: string,
    activeSource?: ActiveSource | null,
    workingBaseScopeKey?: string | null,
  ) => {
    const scopeKey = buildNotesTreeScopeKey(baseUrl, workingBaseScopeKey);
    const scopedParentId = parentCacheKey(scopeKey, parentId);
    if (get().loadingParentIds.has(scopedParentId)) {
      return;
    }

    set((state) => ({
      loadingParentIds: new Set([...state.loadingParentIds, scopedParentId]),
    }));

    try {
      const children = await fetchPagesByParent(
        baseUrl,
        parentId,
        workingBaseReadOptions(activeSource),
      );
      set((state) => ({
        childrenByParentId: { ...state.childrenByParentId, [scopedParentId]: children },
        loadingParentIds: new Set(
          [...state.loadingParentIds].filter((id) => id !== scopedParentId),
        ),
      }));
    } catch {
      set((state) => ({
        loadingParentIds: new Set(
          [...state.loadingParentIds].filter((id) => id !== scopedParentId),
        ),
      }));
    }
  },

  invalidateChildren: (
    baseUrl?: string,
    workingBaseScopeKey?: string | null,
  ) => {
    if (!baseUrl) {
      set({ ancestorIdsByPageId: {}, childrenByParentId: {}, loadingParentIds: new Set() });
      return;
    }

    const scopeKey = buildNotesTreeScopeKey(baseUrl, workingBaseScopeKey);
    const pagePrefix = scopedEntryPrefix(scopeKey, "page");
    const parentPrefix = scopedEntryPrefix(scopeKey, "parent");
    set((state) => ({
      ancestorIdsByPageId: Object.fromEntries(
        Object.entries(state.ancestorIdsByPageId).filter(
          ([cacheKey]) => !cacheKey.startsWith(pagePrefix),
        ),
      ),
      childrenByParentId: Object.fromEntries(
        Object.entries(state.childrenByParentId).filter(
          ([cacheKey]) => !cacheKey.startsWith(parentPrefix),
        ),
      ),
      loadingParentIds: new Set(
        [...state.loadingParentIds].filter(
          (cacheKey) => !cacheKey.startsWith(parentPrefix),
        ),
      ),
    }));
  },

  invalidateAndReloadExpanded: async (
    baseUrl: string,
    expandedIds: Set<string>,
    activeSource?: ActiveSource | null,
    workingBaseScopeKey?: string | null,
  ) => {
    get().invalidateChildren(baseUrl, workingBaseScopeKey);
    await Promise.all(
      [...expandedIds].map((parentId) =>
        get().loadChildren(baseUrl, parentId, activeSource, workingBaseScopeKey),
      ),
    );
  },
}));
