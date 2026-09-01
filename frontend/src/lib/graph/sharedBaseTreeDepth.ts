import type { PageSummary } from "@/types";

export function filterPageSummariesByTreeDepthFromRoots(
  pages: PageSummary[],
  maxDepthHops: number,
): PageSummary[] {
  if (pages.length === 0) {
    return [];
  }

  const byId = new Map(pages.map((page) => [page.id, page]));
  const depthById = new Map<string, number>();

  const roots = pages.filter((page) => !page.parent_id || !byId.has(page.parent_id));

  const queue: PageSummary[] = [...roots];
  for (const root of roots) {
    depthById.set(root.id, 0);
  }

  while (queue.length > 0) {
    const page = queue.shift();
    if (!page) {
      break;
    }
    const depth = depthById.get(page.id) ?? 0;
    if (depth >= maxDepthHops) {
      continue;
    }
    for (const child of pages) {
      if (child.parent_id === page.id && !depthById.has(child.id)) {
        depthById.set(child.id, depth + 1);
        queue.push(child);
      }
    }
  }

  return pages.filter((page) => depthById.has(page.id));
}
