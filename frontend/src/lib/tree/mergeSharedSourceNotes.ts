import type { PageSummary } from "@/types";
import type { GraphResponseNode } from "@/types/graph/Graph";
import type { ActiveSource } from "@/types/source";

export function graphResponseNodeToPageSummary(node: GraphResponseNode): PageSummary {
  return {
    id: String(node.id),
    title: String(node.title ?? "Untitled"),
    type: String(node.type ?? "document"),
    status: String(node.status ?? "active"),
    subject: Array.isArray(node.subject) ? node.subject : [],
    tags: Array.isArray(node.tags) ? node.tags : [],
    parent_id: node.parentId ? String(node.parentId) : null,
    created_at: node.created_at,
    updated_at: node.updated_at ?? "",
  };
}

export function mergeSharedSourceNotesWithGraph(
  source: ActiveSource,
  notes: PageSummary[],
  graphNotes: PageSummary[],
): PageSummary[] {
  if (source.kind !== "shared-base") {
    return notes;
  }
  if (graphNotes.length === 0) {
    return notes;
  }
  const mergedNotes = [
    ...notes,
    ...graphNotes.filter((graphNote) => !notes.some((note) => note.id === graphNote.id)),
  ];
  const noteIds = new Set(mergedNotes.map((note) => note.id));
  return mergedNotes.map((note) => {
    return !note.parent_id || !noteIds.has(note.parent_id) ? { ...note, parent_id: null } : note;
  });
}

export function ancestorParentIdsForPage(pageId: string, pages: PageSummary[]): string[] {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const chain: string[] = [];
  let currentId: string | null = byId.get(pageId)?.parent_id ?? null;
  while (currentId) {
    chain.unshift(currentId);
    currentId = byId.get(currentId)?.parent_id ?? null;
  }
  return chain;
}

export function buildEagerTreeNotesFromGraph(
  activeSource: ActiveSource | null,
  notes: PageSummary[],
  graphNodes: GraphResponseNode[],
): PageSummary[] | null {
  if (!activeSource || activeSource.kind === "local-base") {
    return null;
  }
  if (activeSource.kind !== "shared-base") {
    return null;
  }
  const graphNotes = graphNodes.map((node) => graphResponseNodeToPageSummary(node));
  return mergeSharedSourceNotesWithGraph(activeSource, notes, graphNotes);
}
