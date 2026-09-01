import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchSessionBootstrap, resolveBridgeBaseUrl } from "@/api";
import { notesSummariesQueryKey } from "@/api/notesApi";
import { DESKTOP_BRIDGE_QUERY_KEYS } from "@/hooks/desktopBridgeQueryKeys";
import {
  fetchSourceRootPages,
  getNotesScopeKey,
  getWorkingBaseScopeKey,
} from "@/lib/sources/sourceRegistry";
import type { NotesCacheRefreshKind } from "@/lib/notesCacheRefreshPolicy";
import { useNotesTreeStore } from "@/stores/notesTreeStore";
import type { PageSummary, SessionBootstrap } from "@/types";
import type { ActiveSource } from "@/types/source";

export const QUERY_KEYS = DESKTOP_BRIDGE_QUERY_KEYS;

export type RefreshNotesCachesParams = {
  targetScopeKey: string;
  kind: NotesCacheRefreshKind;
  activeSource?: ActiveSource | null;
};

function buildNotesTreeQueryOptions(
  baseUrl: string,
  source: ActiveSource | null,
  notesScopeKey: string,
) {
  return {
    queryKey: QUERY_KEYS.notesTree(baseUrl, notesScopeKey),
    queryFn: () => fetchSourceRootPages(baseUrl, source),
    retry: 10,
    retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 10_000),
  };
}

export function useDesktopBridgeData(activeSource: ActiveSource | null) {
  const queryClient = useQueryClient();

  const bridgeBaseUrlQuery = useQuery({
    queryKey: QUERY_KEYS.bridgeBaseUrl,
    queryFn: resolveBridgeBaseUrl,
    retry: 0,
  });
  const bridgeBaseUrl = bridgeBaseUrlQuery.data ?? "";

  const bootstrapQuery = useQuery<SessionBootstrap>({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: QUERY_KEYS.sessionBootstrap(bridgeBaseUrl),
    queryFn: () => fetchSessionBootstrap(bridgeBaseUrl),
    retry: 10,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 10_000),
  });
  const activeBaseEntryId = bootstrapQuery.data?.active_base?.entry_id;
  const workingBaseScopeKey = getWorkingBaseScopeKey(activeSource, activeBaseEntryId);
  const notesScopeKey = getNotesScopeKey(activeSource, workingBaseScopeKey);
  const notesScopeIdentityRequiresBootstrap = activeSource === null;
  const notesTreeQueryEnabled =
    bridgeBaseUrl.length > 0 &&
    (!notesScopeIdentityRequiresBootstrap || bootstrapQuery.data !== undefined);

  const notesTreeQuery = useQuery<PageSummary[]>({
    enabled: notesTreeQueryEnabled,
    ...buildNotesTreeQueryOptions(bridgeBaseUrl, activeSource, notesScopeKey),
  });

  const notesTreePages: PageSummary[] = notesTreeQuery.data ?? [];

  const getSourceRootPages = async (
    source: ActiveSource,
    options?: { forceRefresh?: boolean },
  ): Promise<PageSummary[]> => {
    if (!bridgeBaseUrl) {
      return [];
    }

    const sourceWorkingBaseScopeKey = getWorkingBaseScopeKey(source, activeBaseEntryId);
    const sourceNotesScopeKey = getNotesScopeKey(source, sourceWorkingBaseScopeKey);
    const queryOptions = buildNotesTreeQueryOptions(
      bridgeBaseUrl,
      source,
      sourceNotesScopeKey,
    );
    if (options?.forceRefresh) {
      return queryClient.fetchQuery(queryOptions);
    }
    return queryClient.ensureQueryData(queryOptions);
  };

  const refreshNotesCaches = useCallback(
    async (params: RefreshNotesCachesParams): Promise<boolean> => {
      const { targetScopeKey, kind, activeSource: refreshActiveSource } = params;
      if (!bridgeBaseUrl || targetScopeKey.length === 0) {
        return false;
      }

      const isVisibleScope = targetScopeKey === notesScopeKey;
      const sourceForReload = refreshActiveSource ?? activeSource;
      const queryInvalidations: Array<Promise<void>> = [];

      if (kind === "metadata" || kind === "structural") {
        queryInvalidations.push(
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.notesTree(bridgeBaseUrl, targetScopeKey),
          }),
        );
        queryInvalidations.push(
          queryClient.invalidateQueries({
            queryKey: notesSummariesQueryKey(bridgeBaseUrl, targetScopeKey),
          }),
        );
      }

      if (kind === "structural" && isVisibleScope) {
        const expandedIds = useNotesTreeStore.getState().getExpandedParentIdsForScope(targetScopeKey);
        if (expandedIds.size > 0) {
          await useNotesTreeStore
            .getState()
            .invalidateAndReloadExpanded(
              bridgeBaseUrl,
              expandedIds,
              sourceForReload,
              targetScopeKey,
            );
        } else {
          useNotesTreeStore.getState().invalidateChildren(bridgeBaseUrl, targetScopeKey);
        }
      }

      if (queryInvalidations.length > 0) {
        await Promise.all(queryInvalidations);
      }

      return isVisibleScope || queryInvalidations.length > 0;
    },
    [activeSource, bridgeBaseUrl, notesScopeKey, queryClient],
  );

  return {
    activeBaseEntryId,
    bootstrapQuery,
    bridgeBaseUrl,
    bridgeBaseUrlQuery,
    getSourceRootPages,
    notesTreePages,
    notesTreeQuery,
    notesScopeKey,
    refreshNotesCaches,
    workingBaseScopeKey,
  };
}
