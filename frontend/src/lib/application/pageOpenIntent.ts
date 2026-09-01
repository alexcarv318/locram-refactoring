import type { PageDetail } from "@/types";

import {
  applyPageToOpenTabs,
  resolvePageOpenDisposition,
  type PageOpenDisposition,
} from "@/lib/application/pageOpenTabs";

export type OpenPageIntent = {
  page: PageDetail;
  disposition?: PageOpenDisposition;
};

export function openPageInFileTabs(
  currentTabs: PageDetail[],
  selectedPageId: string | null,
  dirtyPageIds: string[],
  intent: OpenPageIntent,
): PageDetail[] {
  const disposition = intent.disposition ?? "default";
  const resolvedDisposition = resolvePageOpenDisposition(
    disposition,
    selectedPageId,
    dirtyPageIds,
  );
  return applyPageToOpenTabs(
    currentTabs,
    intent.page,
    selectedPageId,
    resolvedDisposition,
  );
}
