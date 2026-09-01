import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchPage } from "@/api";
import { searchPages } from "@/api/sessionApi";
import {
  DatabaseIcon,
  FolderIcon,
  GlobalIcon,
  GlobalSearchIcon,
  InformationIcon,
  XIcon,
} from "@/components/icons/Icons";
import ActionButton from "@/components/ui/ActionButton";
import FileHomeView from "@/components/editor/FileHomeView";
import LocalBaseHomeView from "@/components/editor/LocalBaseHomeView";
import ManagedBaseHomeView from "@/components/editor/ManagedBaseHomeView";
import SharedBaseHomeView from "@/components/editor/SharedBaseHomeView";
import { SourceHomeSourceView, type SourceMetric } from "@/components/editor/SourceHomeSourceView";
import type { SourceInspectContext, SourceTabMode } from "@/types/editor/EditorTabItem";
import {
  filterGraphSourceResults,
  getManagedBrowseSourceAlias,
  getSourceBadgeLabel,
  getSourceSearchBoxLabel,
  getSourceSearchMode,
  getQuickAccessSourceResults,
  isSourceSearchLocked,
  localSearchHitToSourceResult,
  getSourcePanelSubtitle,
  getSourcePanelTitle,
  type SourceResult,
} from "@/lib/sources/sourceRegistry";
import { useGraphStore } from "@/stores/graphStore";
import type { PageSummary } from "@/types";
import type { GraphResponseNode } from "@/types/graph/Graph";
import type { ActiveSource } from "@/types/source";

type SourceHomePanelProps = {
  bridgeBaseUrl: string;
  inspectContext?: SourceInspectContext;
  mode?: SourceTabMode;
  notes: PageSummary[];
  onClose: () => void;
  onSelectPage: (pageId: string) => void;
  onSelectSourceNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  source: ActiveSource;
};

function metricsForSource(
  source: ActiveSource,
  notes: PageSummary[],
  graphNodes: GraphResponseNode[],
): SourceMetric[] {
  const managedBrowseAlias = getManagedBrowseSourceAlias(source);
  if (source.kind === "file-home") {
    return [];
  }
  if (source.kind === "local-base") {
    return [
      {
        label: "Runtime",
        value: "Active base",
        detail: source.baseId,
        icon: <DatabaseIcon className="h-4 w-4" />,
      },
      {
        label: "Top-level notes",
        value: String(notes.length),
        detail: "Root entries available in Notes",
        icon: <FolderIcon className="h-4 w-4" />,
      },
      {
        label: "Graph nodes",
        value: String(graphNodes.length),
        detail: "Nodes loaded into the active source graph",
        icon: <GlobalIcon className="h-4 w-4" />,
      },
    ];
  }
  if (managedBrowseAlias !== null) {
    if (managedBrowseAlias.managedBaseKind === "ggl") {
      return [
        {
          label: "Source",
          value: "Managed GGL",
          detail: "Read-only managed Graph Governance base.",
          icon: <InformationIcon className="h-4 w-4" />,
        },
        {
          label: "Pages",
          value: String(graphNodes.length),
          detail: "Managed governance documents in this source",
          icon: <FolderIcon className="h-4 w-4" />,
        },
        {
          label: "Mutability",
          value: "Read-only",
          detail: "Managed system base",
          icon: <InformationIcon className="h-4 w-4" />,
        },
      ];
    }
    return [
      {
        label: "Source",
        value: "Managed Documentation",
        detail: "Read-only managed documentation base.",
        icon: <InformationIcon className="h-4 w-4" />,
      },
      {
        label: "Pages",
        value: String(graphNodes.length),
        detail: "Managed documentation pages in this source",
        icon: <GlobalSearchIcon className="h-4 w-4" />,
      },
      {
        label: "Mutability",
        value: "Read-only",
        detail: "Managed system base",
        icon: <InformationIcon className="h-4 w-4" />,
      },
    ];
  }
  return [];
}

function previewTextFromGraphNode(node: GraphResponseNode | undefined): string {
  if (!node) {
    return "";
  }
  const content = String(node.content ?? "").trim();
  if (content.length > 0) {
    return content;
  }
  return String(node.snippet ?? "").trim();
}

export default function SourceHomePanel({
  bridgeBaseUrl,
  inspectContext,
  mode = "active",
  notes,
  onClose,
  onSelectPage,
  onSelectSourceNode,
  selectedNodeId,
  source,
}: SourceHomePanelProps) {
  const graphNodes = useGraphStore((state) => state.graphData?.nodes ?? []);
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const isLocalBaseSource = source.kind === "local-base";
  const managedBrowseAlias = useMemo(() => getManagedBrowseSourceAlias(source), [source]);
  const localSearchMutation = useMutation({
    mutationFn: (query: string) =>
      searchPages(
        bridgeBaseUrl,
        query,
        managedBrowseAlias !== null
          ? { baseRef: managedBrowseAlias.baseRef }
          : undefined,
      ),
  });
  const selectedManagedPageQuery = useQuery({
    enabled:
      bridgeBaseUrl.length > 0 &&
      managedBrowseAlias !== null &&
      Boolean(selectedNodeId),
    queryKey: [
      "managed-base-source-page",
      bridgeBaseUrl,
      managedBrowseAlias?.baseRef ?? null,
      selectedNodeId,
    ],
    queryFn: async () => {
      if (managedBrowseAlias === null || !selectedNodeId) {
        return null;
      }
      return fetchPage(bridgeBaseUrl, selectedNodeId, { baseRef: managedBrowseAlias.baseRef });
    },
    retry: false,
  });

  const quickAccess = useMemo(
    () => (isLocalBaseSource ? [] : getQuickAccessSourceResults(source, notes, graphNodes)),
    [graphNodes, isLocalBaseSource, notes, source],
  );

  const graphSearchResults = useMemo(
    () => filterGraphSourceResults(graphNodes, submittedQuery),
    [graphNodes, submittedQuery],
  );

  const searchResults = useMemo<SourceResult[]>(() => {
    if (!submittedQuery) {
      return quickAccess;
    }
    switch (getSourceSearchMode(source)) {
      case "local":
        return (localSearchMutation.data ?? []).map(localSearchHitToSourceResult);
      case "graph":
      default:
        return graphSearchResults;
    }
  }, [
    graphSearchResults,
    localSearchMutation.data,
    quickAccess,
    source,
    submittedQuery,
  ]);

  const selectedGraphNode = useMemo(
    () => graphNodes.find((node) => String(node.id) === selectedNodeId),
    [graphNodes, selectedNodeId],
  );
  const selectedResult = useMemo(
    () => searchResults.find((result) => result.id === selectedNodeId) ?? searchResults[0] ?? null,
    [searchResults, selectedNodeId],
  );
  const previewTitle =
    selectedManagedPageQuery.data?.title ??
    selectedGraphNode?.title ??
    selectedResult?.title ??
    source.label;
  const previewBody =
    selectedManagedPageQuery.data?.content ||
    previewTextFromGraphNode(selectedGraphNode) ||
    selectedResult?.snippet ||
    getSourcePanelSubtitle(source);
  const sourceMetrics = useMemo(
    () => (isLocalBaseSource ? [] : metricsForSource(source, notes, graphNodes)),
    [graphNodes, isLocalBaseSource, notes, source],
  );
  const isSearchLocked = isSourceSearchLocked(source);
  const searchBoxLabel = getSourceSearchBoxLabel(source);

  if (isLocalBaseSource) {
    return (
      <LocalBaseHomeView
        bridgeBaseUrl={bridgeBaseUrl}
        inspectContext={inspectContext}
        mode={mode}
        onClose={onClose}
        source={source}
      />
    );
  }

  if (source.kind === "file-home") {
    return <FileHomeView bridgeBaseUrl={bridgeBaseUrl} onClose={onClose} source={source} />;
  }

  if (source.kind === "shared-base") {
    return (
      <SharedBaseHomeView
        bridgeBaseUrl={bridgeBaseUrl}
        mode={mode}
        onClose={onClose}
        source={source}
      />
    );
  }

  if (source.kind === "managed-base") {
    return (
      <ManagedBaseHomeView
        bridgeBaseUrl={bridgeBaseUrl}
        onClose={onClose}
        source={source}
      />
    );
  }

  return (
    <section className="bg-background flex h-full min-h-0 flex-col overflow-hidden" aria-label={getSourcePanelTitle(source)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-foreground text-base font-semibold">{getSourcePanelTitle(source)}</h2>
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {getSourceBadgeLabel(source)}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">{getSourcePanelSubtitle(source)}</p>
        </div>
        <ActionButton
          ariaLabel={`Close ${getSourcePanelTitle(source)}`}
          icon={<XIcon className="h-4 w-4" />}
          onClick={onClose}
          title={`Close ${getSourcePanelTitle(source)}`}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4">
          <SourceHomeSourceView
            isSearchLocked={isSearchLocked}
            localSearchPending={localSearchMutation.isPending}
            onSearchInputChange={setSearchInput}
            onSearchSubmit={() => {
              const nextQuery = searchInput.trim();
              setSubmittedQuery(nextQuery);
              if (!nextQuery) {
                return;
              }
              switch (getSourceSearchMode(source)) {
                case "local":
                  localSearchMutation.mutate(nextQuery);
                  return;
                case "graph":
                default:
                  return;
              }
            }}
            onSelectPage={onSelectPage}
            onSelectSourceNode={onSelectSourceNode}
            previewBody={previewBody}
            previewTitle={previewTitle}
            quickAccess={quickAccess}
            searchBoxLabel={searchBoxLabel}
            searchInput={searchInput}
            searchResults={searchResults}
            selectedNodeId={selectedNodeId}
            source={source}
            sourceMetrics={sourceMetrics}
            submittedQuery={submittedQuery}
          />
        </div>
      </div>
    </section>
  );
}
