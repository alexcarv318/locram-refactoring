import { useCallback, useEffect, useRef } from "react";

import { BridgeClientError } from "@/lib/bridgeClient";
import { fetchDataVersion } from "@/api/runtimeApi";
import type { ActiveTreeSelectionKind } from "@/components/shell/desktopShellContext";
import type { RefreshNotesCachesParams } from "@/hooks/useDesktopBridgeData";
import { applyCoarseDataVersionRefresh } from "@/lib/coarseDataVersionRefresh";
import {
  applyGraphRefreshPlan,
  buildGraphRefreshPlan,
} from "@/lib/graphCacheRefreshFromChanges";
import { mergeDesktopDataVersionPayloads } from "@/lib/mergeDesktopDataVersionPayloads";
import { refreshNotesCachesForChanges } from "@/lib/notesCacheRefreshFromChanges";
import { useGraphFiltersStore } from "@/stores/graphFiltersStore";
import { useGraphStore } from "@/stores/graphStore";
import type { DataVersion, PageDetail } from "@/types";
import type { ActiveSource } from "@/types/source";

type UseDesktopDataFreshnessParams = {
  activeSource: ActiveSource | null;
  activeTreeSelectionKind: ActiveTreeSelectionKind;
  bridgeBaseUrl: string;
  graphCacheNamespace: string;
  notesScopeKey: string;
  refreshOpenPageInPlace: (
    pageId: string,
    options?: {
      baseUrl?: string;
      loadingMode?: "blocking" | "refresh";
      pageDetail?: PageDetail;
    },
  ) => Promise<void>;
  graphMode: "synced" | "frozen";
  refreshNotesCaches: (params: RefreshNotesCachesParams) => Promise<boolean>;
  selectedPageId: string | null;
  dirtyPageIds: string[];
  externalUpdatePendingPageIds: string[];
  markExternalUpdatePending: (pageId: string) => void;
  clearExternalUpdatePending: (pageId: string) => void;
  clearAllExternalUpdatePending: () => void;
};

const DATA_VERSION_POLL_INTERVAL_MS = 5000;
const DATA_VERSION_DEBOUNCE_MS = 200;
const OPEN_PAGE_REFRESH_DISABLED =
  import.meta.env.VITE_LOCRAM_E2E_SKIP_OPEN_PAGE_REFRESH === "1";

type ScopedDataVersion = {
  notesScopeKey: string;
  payload: DataVersion;
};

export function useDesktopDataFreshness({
  activeSource,
  activeTreeSelectionKind,
  bridgeBaseUrl,
  graphCacheNamespace,
  notesScopeKey,
  refreshOpenPageInPlace,
  graphMode,
  refreshNotesCaches,
  selectedPageId,
  dirtyPageIds,
  externalUpdatePendingPageIds,
  markExternalUpdatePending,
  clearExternalUpdatePending,
  clearAllExternalUpdatePending,
}: UseDesktopDataFreshnessParams) {
  const handledVersionRef = useRef<number | null>(null);
  const latestNotesScopeKeyRef = useRef(notesScopeKey);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const pendingPayloadQueueRef = useRef<DataVersion[]>([]);
  const debouncedInboxRef = useRef<ScopedDataVersion[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const pendingExternalRefreshInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    latestNotesScopeKeyRef.current = notesScopeKey;
  }, [notesScopeKey]);

  useEffect(() => {
    handledVersionRef.current = null;
    pendingPayloadQueueRef.current = [];
    debouncedInboxRef.current = [];
    pendingExternalRefreshInFlightRef.current.clear();
    clearAllExternalUpdatePending();
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [clearAllExternalUpdatePending, notesScopeKey]);

  const refreshOpenPageIfAllowed = useCallback(
    async (pageId: string) => {
      if (dirtyPageIds.includes(pageId)) {
        markExternalUpdatePending(pageId);
        return;
      }
      if (OPEN_PAGE_REFRESH_DISABLED) {
        clearExternalUpdatePending(pageId);
        return;
      }
      try {
        await refreshOpenPageInPlace(pageId, { loadingMode: "refresh" });
      } catch (error) {
        if (!(error instanceof BridgeClientError) || error.status !== 404) {
          throw error;
        }
      }
      clearExternalUpdatePending(pageId);
    },
    [
      clearExternalUpdatePending,
      dirtyPageIds,
      markExternalUpdatePending,
      refreshOpenPageInPlace,
    ],
  );

  useEffect(() => {
    const readyPageIds = externalUpdatePendingPageIds.filter(
      (pageId) => !dirtyPageIds.includes(pageId),
    );
    for (const pageId of readyPageIds) {
      if (pendingExternalRefreshInFlightRef.current.has(pageId)) {
        continue;
      }
      pendingExternalRefreshInFlightRef.current.add(pageId);
      void refreshOpenPageIfAllowed(pageId).finally(() => {
        pendingExternalRefreshInFlightRef.current.delete(pageId);
      });
    }
  }, [dirtyPageIds, externalUpdatePendingPageIds, refreshOpenPageIfAllowed]);

  const applyNotesCacheRefresh = useCallback(
    async (
      targetScopeKey: string,
      params: Omit<RefreshNotesCachesParams, "targetScopeKey" | "activeSource">,
    ) => {
      if (targetScopeKey.length === 0) {
        return false;
      }
      return refreshNotesCaches({
        ...params,
        targetScopeKey,
        activeSource,
      });
    },
    [activeSource, refreshNotesCaches],
  );

  const refreshCoarselyForVersion = useCallback(
    async (targetScopeKey: string) => {
      const currentGraphScope = useGraphStore.getState().graphScope;
      const graphScopeIsPresent = currentGraphScope !== null;
      const { activePresetFilter, activePresetId, activePresetName } =
        useGraphFiltersStore.getState();
      const smartFolderPresetReady =
        currentGraphScope?.kind === "smart-folder" &&
        Boolean(activePresetId && activePresetName && activePresetFilter);

      await applyCoarseDataVersionRefresh(
        targetScopeKey,
        graphCacheNamespace,
        {
          activeTreeSelectionKind,
          graphMode,
          graphScopeIsPresent,
          selectedPageId,
          smartFolderPresetReady,
        },
        {
          applyNotesCacheRefresh,
          markCachedGraphsStaleByPrefix: (prefix) => {
            useGraphStore.getState().markCachedGraphsStaleByPrefix(prefix);
          },
          markGraphStale: () => {
            useGraphStore.getState().markGraphStale();
          },
          requestGraphRefresh: () => {
            useGraphStore.getState().requestGraphRefresh();
          },
          openSelectedPage: (pageId) => refreshOpenPageIfAllowed(pageId),
        },
      );
    },
    [
      activeTreeSelectionKind,
      applyNotesCacheRefresh,
      graphCacheNamespace,
      graphMode,
      refreshOpenPageIfAllowed,
      selectedPageId,
    ],
  );

  const processVersionPayload = useCallback(
    async (payload: DataVersion) => {
      const version = payload.version;
      const versionRolledBack =
        handledVersionRef.current !== null && version < handledVersionRef.current;
      if (versionRolledBack) {
        handledVersionRef.current = null;
      }

      if (handledVersionRef.current === null) {
        handledVersionRef.current = version;
        if (versionRolledBack) {
          await refreshCoarselyForVersion(latestNotesScopeKeyRef.current);
        }
        return;
      }

      if (handledVersionRef.current === version) {
        return;
      }

      handledVersionRef.current = version;
      const typedChanges =
        Array.isArray(payload.changes) && payload.changes.length > 0
          ? payload.changes
          : null;

      const fallbackScopeKey = latestNotesScopeKeyRef.current;
      if (!typedChanges) {
        await refreshCoarselyForVersion(fallbackScopeKey);
        return;
      }

      const notesCacheRefreshPromise = refreshNotesCachesForChanges(
        typedChanges,
        fallbackScopeKey,
        applyNotesCacheRefresh,
        activeSource,
      );

      const currentGraphScope = useGraphStore.getState().graphScope;
      const currentGraphData = useGraphStore.getState().graphData;
      const graphRefreshPlan = buildGraphRefreshPlan(typedChanges, {
        activeTreeSelectionKind,
        graphNodes: currentGraphData?.nodes ?? [],
        graphScopeKind: currentGraphScope?.kind ?? null,
        graphScopeId: currentGraphScope?.id ?? null,
        selectedPageId,
      });

      const graphRefreshPromise = applyGraphRefreshPlan(
        graphRefreshPlan,
        graphCacheNamespace,
        graphMode,
        currentGraphScope !== null,
        {
          invalidateCachedGraphsContainingNode: (nodeId) => {
            useGraphStore.getState().invalidateCachedGraphsContainingNode(nodeId);
          },
          markCachedGraphsStaleByPrefix: (prefix) => {
            useGraphStore.getState().markCachedGraphsStaleByPrefix(prefix);
          },
          markGraphStale: () => {
            useGraphStore.getState().markGraphStale();
          },
          requestGraphRefresh: () => {
            useGraphStore.getState().requestGraphRefresh();
          },
        },
        graphRefreshPlan.selectedPageToRefresh
          ? (pageId) => refreshOpenPageIfAllowed(pageId)
          : null,
      );

      await Promise.all([notesCacheRefreshPromise, graphRefreshPromise]);
    },
    [
      activeSource,
      activeTreeSelectionKind,
      applyNotesCacheRefresh,
      graphCacheNamespace,
      graphMode,
      refreshCoarselyForVersion,
      refreshOpenPageIfAllowed,
      selectedPageId,
    ],
  );

  const refreshForVersion = useCallback(
    async (payload: DataVersion) => {
      pendingPayloadQueueRef.current.push(payload);

      if (refreshInFlightRef.current !== null) {
        await refreshInFlightRef.current;
        return;
      }

      const flight = (async () => {
        while (pendingPayloadQueueRef.current.length > 0) {
          const queuedPayloads = pendingPayloadQueueRef.current
            .splice(0)
            .filter((payload): payload is DataVersion => payload !== undefined);
          if (queuedPayloads.length === 0) {
            continue;
          }
          const handledVersion = handledVersionRef.current;
          if (
            handledVersion !== null &&
            queuedPayloads.some((payload) => payload.version < handledVersion)
          ) {
            for (const payload of queuedPayloads) {
              await processVersionPayload(payload);
            }
            continue;
          }

          if (handledVersionRef.current === null && queuedPayloads.length > 1) {
            const [firstPayload, ...remainingPayloads] = queuedPayloads;
            pendingPayloadQueueRef.current.unshift(...remainingPayloads);
            await processVersionPayload(firstPayload);
            continue;
          }

          const mergedPayload = mergeDesktopDataVersionPayloads(queuedPayloads);
          if (mergedPayload === null) {
            continue;
          }
          await processVersionPayload(mergedPayload);
        }
      })();

      refreshInFlightRef.current = flight;
      try {
        await flight;
      } finally {
        if (refreshInFlightRef.current === flight) {
          refreshInFlightRef.current = null;
        }
      }
    },
    [processVersionPayload],
  );

  const scheduleRefreshForVersion = useCallback(
    (payload: DataVersion) => {
      debouncedInboxRef.current.push({
        notesScopeKey: latestNotesScopeKeyRef.current,
        payload,
      });
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        const scopedPayloads = debouncedInboxRef.current.splice(0);
        const activeNotesScopeKey = latestNotesScopeKeyRef.current;
        const payloadsForActiveScope = scopedPayloads
          .filter((scopedPayload) => scopedPayload.notesScopeKey === activeNotesScopeKey)
          .map((scopedPayload) => scopedPayload.payload)
          .filter((payload): payload is DataVersion => payload !== undefined);
        if (payloadsForActiveScope.length === 0) {
          return;
        }

        const handledVersion = handledVersionRef.current;
        if (
          handledVersion !== null &&
          payloadsForActiveScope.some((payload) => payload.version < handledVersion)
        ) {
          for (const payload of payloadsForActiveScope) {
            void refreshForVersion(payload);
          }
          return;
        }

        if (handledVersionRef.current === null && payloadsForActiveScope.length > 1) {
          void refreshForVersion(payloadsForActiveScope[0]);
          const mergedRemainingPayload = mergeDesktopDataVersionPayloads(
            payloadsForActiveScope.slice(1),
          );
          if (mergedRemainingPayload !== null) {
            void refreshForVersion(mergedRemainingPayload);
          }
          return;
        }

        const mergedPayload = mergeDesktopDataVersionPayloads(payloadsForActiveScope);
        if (mergedPayload !== null) {
          void refreshForVersion(mergedPayload);
        }
      }, DATA_VERSION_DEBOUNCE_MS);
    },
    [refreshForVersion],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      debouncedInboxRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!bridgeBaseUrl || typeof EventSource === "undefined") {
      return;
    }

    const eventSource = new EventSource(`${bridgeBaseUrl}/api/events`);
    eventSource.addEventListener("data-version", (event) => {
      const eventData = (event as MessageEvent).data;
      if (typeof eventData !== "string") {
        return;
      }

      try {
        const payload = JSON.parse(eventData) as DataVersion;
        scheduleRefreshForVersion(payload);
      } catch {
        return;
      }
    });

    return () => {
      eventSource.close();
    };
  }, [bridgeBaseUrl, scheduleRefreshForVersion]);

  useEffect(() => {
    if (!bridgeBaseUrl || typeof EventSource !== "undefined") {
      return;
    }

    let disposed = false;
    const pollVersion = async () => {
      try {
        const payload = await fetchDataVersion(bridgeBaseUrl);
        if (!disposed) {
          scheduleRefreshForVersion(payload);
        }
      } catch {
        return;
      }
    };

    void pollVersion();
    const intervalId = window.setInterval(() => {
      void pollVersion();
    }, DATA_VERSION_POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [bridgeBaseUrl, scheduleRefreshForVersion]);
}
