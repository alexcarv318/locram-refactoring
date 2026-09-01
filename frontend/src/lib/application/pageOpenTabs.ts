import type { PageDetail } from "@/types";

export type PageOpenDisposition = "default" | "new-tab" | "replace-active";

export function isModifierOpenInNewTab(
  event?: Pick<MouseEvent, "altKey" | "metaKey" | "ctrlKey"> | null,
): boolean {
  if (!event) {
    return false;
  }
  return event.altKey || event.metaKey;
}

export function resolvePageOpenDisposition(
  disposition: PageOpenDisposition,
  selectedPageId: string | null,
  dirtyPageIds: string[],
): "new-tab" | "replace-active" {
  if (disposition === "new-tab") {
    return "new-tab";
  }
  if (disposition === "replace-active") {
    return "replace-active";
  }
  if (!selectedPageId) {
    return "new-tab";
  }
  if (dirtyPageIds.includes(selectedPageId)) {
    return "new-tab";
  }
  return "replace-active";
}

export function applyPageToOpenTabs(
  currentTabs: PageDetail[],
  pageDetail: PageDetail,
  selectedPageId: string | null,
  resolvedDisposition: "new-tab" | "replace-active",
): PageDetail[] {
  const existingIndex = currentTabs.findIndex((tab) => tab.id === pageDetail.id);
  if (existingIndex !== -1) {
    return currentTabs.map((tab) => (tab.id === pageDetail.id ? pageDetail : tab));
  }

  if (resolvedDisposition === "new-tab") {
    return [...currentTabs, pageDetail];
  }

  if (!selectedPageId) {
    return [...currentTabs, pageDetail];
  }

  const activeIndex = currentTabs.findIndex((tab) => tab.id === selectedPageId);
  if (activeIndex === -1) {
    return [...currentTabs, pageDetail];
  }

  const nextTabs = [...currentTabs];
  nextTabs[activeIndex] = pageDetail;
  return nextTabs;
}

export function fileTabPageIds(openTabs: PageDetail[]): string[] {
  return openTabs.map((tab) => tab.id);
}
