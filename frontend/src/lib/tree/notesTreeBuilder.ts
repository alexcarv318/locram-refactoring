import type { PageSummary } from "@/types";

export interface TreeNode {
  note: PageSummary;
  children: TreeNode[];
  hasChildren: boolean;
}

const TYPE_SORT_ORDER: Record<string, number> = {
  hub: 0,
  structure: 1,
  permanent: 2,
  "note-taking": 3,
  fleeting: 4,
};

export const FOLDER_TYPES = new Set(["hub", "structure"]);

function typeSortKey(type: string): number {
  return TYPE_SORT_ORDER[type] ?? 3;
}

export function sortPageSummariesByTreeType(pages: PageSummary[]): PageSummary[] {
  return pages.slice().sort((a, b) => typeSortKey(a.type) - typeSortKey(b.type));
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.slice().sort((a: TreeNode, b: TreeNode) => typeSortKey(a.note.type) - typeSortKey(b.note.type));
}

export function buildNotesTree(notes: PageSummary[]): TreeNode[] {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, TreeNode[]>();
  const rootNodes: TreeNode[] = [];

  for (const note of notes) {
    const treeNode: TreeNode = {
      note,
      children: [],
      hasChildren: false,
    };
    if (note.parent_id && byId.has(note.parent_id)) {
      const siblings = childrenMap.get(note.parent_id) ?? [];
      siblings.push(treeNode);
      childrenMap.set(note.parent_id, siblings);
    } else {
      rootNodes.push(treeNode);
    }
  }

  function attachChildren(node: TreeNode): void {
    const kids = childrenMap.get(node.note.id);
    if (kids) {
      node.children = sortNodes(kids);
      node.hasChildren = node.children.length > 0;
      for (const kid of node.children) {
        attachChildren(kid);
      }
    }
  }

  for (const root of rootNodes) {
    attachChildren(root);
  }

  return sortNodes(rootNodes);
}

export function buildLazyRootTree(roots: PageSummary[]): TreeNode[] {
  return sortNodes(
    roots.map((note) => ({
      note,
      children: [],
      hasChildren: (note.child_count ?? 0) > 0,
    })),
  );
}

export function buildLazyChildNodes(
  children: PageSummary[],
  childrenByParentId: Record<string, PageSummary[]>,
): TreeNode[] {
  return sortNodes(
    children.map((note) => {
      const loadedGrandchildren = childrenByParentId[note.id];
      return {
        note,
        children: loadedGrandchildren
          ? buildLazyChildNodes(loadedGrandchildren, childrenByParentId)
          : [],
        hasChildren: (note.child_count ?? 0) > 0,
      };
    }),
  );
}

export function includeAncestorChain(notes: PageSummary[], visibleIds: Set<string>): PageSummary[] {
  const noteById = new Map(notes.map((note) => [note.id, note]));
  const expandedIds = new Set(visibleIds);

  for (const noteId of visibleIds) {
    let currentParentId = noteById.get(noteId)?.parent_id ?? null;
    while (currentParentId) {
      expandedIds.add(currentParentId);
      currentParentId = noteById.get(currentParentId)?.parent_id ?? null;
    }
  }

  return notes.filter((note) => expandedIds.has(note.id));
}

export function countDescendants(node: TreeNode): number {
  let total = 0;
  for (const child of node.children) {
    total += 1 + countDescendants(child);
  }
  return total;
}
