import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";

export interface NodeTreeItem {
  node: GraphResponseNode;
  depth: number;
  children: NodeTreeItem[];
}

export interface NodeGroup {
  parentId: string | null;
  parentTitle: string;
  parentLabel: string | null;
  parentNode: GraphResponseNode | null;
  children: NodeTreeItem[];
}

export function groupNodesByParent(
  nodes: GraphResponseNode[] | null | undefined,
  _links: GraphResponseLink[] | null | undefined,
): NodeGroup[] {
  const normalizedNodes = Array.isArray(nodes) ? nodes : [];
  const nodesById = new Map(
    normalizedNodes.map((node) => [String(node.id), node]),
  );
  const childrenByParent = new Map<string, GraphResponseNode[]>();

  for (const node of normalizedNodes) {
    if (!node.parentId) {
      continue;
    }

    const parent = nodesById.get(String(node.parentId));
    if (!parent) {
      continue;
    }

    const children = childrenByParent.get(String(parent.id));
    if (children) {
      children.push(node);
    } else {
      childrenByParent.set(String(parent.id), [node]);
    }
  }

  const buildTree = (
    parentId: string,
    depth: number,
    seen: Set<string>,
  ): NodeTreeItem[] => {
    const directChildren = childrenByParent.get(parentId) ?? [];
    return directChildren.map((node) => {
      const nodeId = String(node.id);
      if (seen.has(nodeId)) {
        return {
          node,
          depth,
          children: [],
        };
      }

      const nextSeen = new Set(seen);
      nextSeen.add(nodeId);

      return {
        node,
        depth,
        children: buildTree(nodeId, depth + 1, nextSeen),
      };
    });
  };

  const rootNodes = normalizedNodes.filter((node) => {
    if (!childrenByParent.has(String(node.id))) {
      return false;
    }

    if (!node.parentId) {
      return true;
    }

    return !nodesById.has(String(node.parentId));
  });

  const groups: NodeGroup[] = rootNodes.map((node) => ({
    parentId: String(node.id),
    parentTitle: node.title,
    parentLabel: node.type,
    parentNode: node,
    children: buildTree(String(node.id), 1, new Set([String(node.id)])),
  }));

  const includedNodeIds = new Set<string>();
  for (const group of groups) {
    if (group.parentId) {
      includedNodeIds.add(group.parentId);
    }

    const queue = [...group.children];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      includedNodeIds.add(String(current.node.id));
      queue.push(...current.children);
    }
  }

  const ungroupedChildren = normalizedNodes.filter((node) => {
    if (includedNodeIds.has(String(node.id))) {
      return false;
    }

    const hasParentInScope =
      !!node.parentId && nodesById.has(String(node.parentId));
    return !hasParentInScope;
  });

  if (ungroupedChildren.length > 0) {
    groups.push({
      parentId: null,
      parentTitle: "Other",
      parentLabel: null,
      parentNode: null,
      children: ungroupedChildren.map((node) => ({
        node,
        depth: 0,
        children: [],
      })),
    });
  }

  return groups;
}
