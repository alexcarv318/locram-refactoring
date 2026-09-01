import { fetchPagesByParent } from "@/api";
import { workingBaseReadOptions } from "@/lib/workingBaseReadOptions";
import type {
  PageDetail,
  PageSearchHit,
  PageSummary,
} from "@/types";
import type { GraphResponseNode } from "@/types/graph/Graph";
import type { ActiveSource, ManagedBaseKind } from "@/types/source";

export type SourceSearchMode = "local" | "graph" | "shared-base";

export type SourceResult = {
  id: string;
  title: string;
  snippet: string;
  meta: string;
};

type ManagedBrowseSourceAlias = {
  baseRef: string;
  managedBaseKind: ManagedBaseKind;
};

export function sourceQueryKeyPart(source: ActiveSource | null): string {
  if (!source) {
    return "local-runtime";
  }
  return source.id;
}

export function getManagedBrowseSourceAlias(
  source: ActiveSource,
): ManagedBrowseSourceAlias | null {
  if (source.kind === "managed-base") {
    return {
      baseRef: source.baseRef,
      managedBaseKind: source.managedBaseKind,
    };
  }
  return null;
}

export function getWorkingBaseScopeKey(
  activeSource: ActiveSource | null,
  activeBaseEntryId?: string | null,
): string {
  if (activeSource?.kind === "local-base") {
    return `local-base:${activeSource.entryId}`;
  }
  if (activeSource?.kind === "managed-base") {
    return activeSource.baseRef;
  }
  if (activeSource?.kind === "shared-base") {
    return `shared-base:${activeSource.grantId}`;
  }
  if (activeBaseEntryId) {
    return `local-base:${activeBaseEntryId}`;
  }
  return "local-runtime";
}

export function getNotesScopeKey(
  activeSource: ActiveSource | null,
  workingBaseScopeKey: string,
): string {
  if (!activeSource || activeSource.kind === "local-base") {
    return workingBaseScopeKey;
  }
  return activeSource.id;
}

export function getSourcePanelTitle(source: ActiveSource): string {
  return source.label;
}

export function getSourcePanelSubtitle(source: ActiveSource): string {
  if (source.kind === "file-home") {
    return "This file home keeps file-level summary, compatibility, provenance, and allowed actions together without switching the active base.";
  }
  if (source.kind === "local-base") {
    return "This source is active for Notes and Graph. Use search to jump into the base, or switch to Notes for the full tree.";
  }
  if (source.kind === "shared-base") {
    return "This shared base is active as the current working base. Notes, Graph, and search are scoped to the remote base while ownership and access remain non-local.";
  }
  const managedAlias = getManagedBrowseSourceAlias(source);
  if (managedAlias !== null) {
    if (managedAlias.managedBaseKind === "ggl") {
      return "This built-in GGL base is mounted read-only. Search here, inspect the graph, and browse the current governance snapshot without switching the active local base.";
    }
    return "This built-in documentation base is mounted read-only. Search here, inspect the graph, and browse the current documentation snapshot without switching the active local base.";
  }
  return source.label;
}

export function getSourceBadgeLabel(source: ActiveSource): string {
  if (source.kind === "file-home") {
    if (source.subjectKind === "backup_artifact") {
      return "Backup";
    }
    if (source.subjectKind === "export_artifact") {
      return "Scoped Export";
    }
    return "SQLite File";
  }
  if (source.kind === "local-base") {
    return "Local Base";
  }
  if (source.kind === "shared-base") {
    return "Shared Base";
  }
  const managedAlias = getManagedBrowseSourceAlias(source);
  if (managedAlias !== null) {
    return "Built-in";
  }
  return source.label;
}

export function getSourceSearchPlaceholder(source: ActiveSource): string {
  if (source.kind === "file-home") {
    return "Search is unavailable for this file home";
  }
  if (source.kind === "local-base") {
    return "Search notes in this source";
  }
  if (source.kind === "shared-base") {
    return "Search notes in this shared base";
  }
  const managedAlias = getManagedBrowseSourceAlias(source);
  if (managedAlias !== null) {
    return managedAlias.managedBaseKind === "ggl"
      ? "Search governance pages"
      : "Search documentation pages";
  }
  return "Search this source";
}

export function getSourceEmptyMessage(source: ActiveSource): string {
  if (source.kind === "file-home") {
    return "File homes do not expose structured note browsing.";
  }
  const managedAlias = getManagedBrowseSourceAlias(source);
  if (managedAlias?.managedBaseKind === "documentation") {
    return "Use the source search page to browse managed documentation pages.";
  }
  return "No structured notes are available for this source yet.";
}

export function getSourceSearchMode(source: ActiveSource): SourceSearchMode {
  if (source.kind === "file-home") {
    return "graph";
  }
  if (source.kind === "local-base") {
    return "local";
  }
  if (source.kind === "shared-base") {
    return "shared-base";
  }
  if (getManagedBrowseSourceAlias(source) !== null) {
    return "local";
  }
  return "graph";
}

export function getSourceSearchBoxLabel(source: ActiveSource): string {
  void source;
  return "Search this source";
}

export function isSourceSearchLocked(source: ActiveSource): boolean {
  void source;
  return false;
}

export function graphNodeToSourceResult(node: GraphResponseNode): SourceResult {
  return {
    id: String(node.id),
    title: String(node.title ?? "Untitled"),
    snippet: String(node.snippet ?? "").trim(),
    meta: [node.type ?? "document", node.status ?? "active"].join(" • "),
  };
}

export function pageSummaryToSourceResult(page: PageSummary): SourceResult {
  return {
    id: page.id,
    title: page.title,
    snippet: [page.type, page.status].join(" • "),
    meta: page.updated_at ? `updated ${page.updated_at}` : "top-level",
  };
}

export function localSearchHitToSourceResult(page: PageSearchHit): SourceResult {
  return {
    id: page.id,
    title: page.title,
    snippet: page.snippet,
    meta: [page.type, page.status].join(" • "),
  };
}

export function filterGraphSourceResults(
  nodes: GraphResponseNode[],
  query: string,
): SourceResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }
  return nodes
    .filter((node) => {
      const haystack = `${node.title ?? ""} ${node.snippet ?? ""} ${node.content ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .slice(0, 20)
    .map(graphNodeToSourceResult);
}

export function getQuickAccessSourceResults(
  source: ActiveSource,
  notes: PageSummary[],
  graphNodes: GraphResponseNode[],
): SourceResult[] {
  if (source.kind === "file-home") {
    return [];
  }
  if (source.kind === "local-base") {
    return notes.slice(0, 8).map(pageSummaryToSourceResult);
  }
  if (source.kind === "shared-base") {
    return notes.slice(0, 8).map(pageSummaryToSourceResult);
  }
  if (getManagedBrowseSourceAlias(source) !== null) {
    return graphNodes.slice(0, 8).map(graphNodeToSourceResult);
  }
  return graphNodes.slice(0, 8).map(graphNodeToSourceResult);
}

export function pageSummaryFromPageDetail(page: PageDetail): PageSummary {
  return {
    id: page.id,
    title: page.title,
    type: page.type,
    status: page.status,
    subject: page.subject,
    tags: page.tags,
    parent_id: page.parent_id,
    created_at: page.created_at,
    updated_at: page.updated_at,
  };
}

function buildManagedSourceRootPages(source: ActiveSource, bridgeBaseUrl: string) {
  const managedAlias = getManagedBrowseSourceAlias(source);
  if (managedAlias !== null) {
    return fetchPagesByParent(bridgeBaseUrl, "root", {
      baseRef: managedAlias.baseRef,
    });
  }
  return Promise.resolve<PageSummary[]>([]);
}

export async function fetchSourceRootPages(
  bridgeBaseUrl: string,
  source: ActiveSource | null,
): Promise<PageSummary[]> {
  if (!source || source.kind === "local-base") {
    return fetchPagesByParent(
      bridgeBaseUrl,
      "root",
      workingBaseReadOptions(source),
    );
  }
  if (source.kind === "shared-base") {
    return fetchPagesByParent(
      bridgeBaseUrl,
      "root",
      {
        baseRef: `shared:${source.grantId}`,
        recipientActorRef: source.recipientActorRef,
        recipientAccountId: source.recipientAccountId ?? undefined,
      },
    );
  }
  return buildManagedSourceRootPages(source, bridgeBaseUrl);
}
