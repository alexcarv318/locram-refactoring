import type { PageDetail } from "@/types";

export type CloseOtherFileTabsPlan = {
  nextOpenTabs: PageDetail[];
  cleanTabsToClose: PageDetail[];
  dirtyTabsRemaining: PageDetail[];
};

export function planCloseOtherFileTabs(
  openTabs: PageDetail[],
  keepPageIds: string[],
  dirtyPageIds: string[],
): CloseOtherFileTabsPlan | null {
  const keepIds = new Set(keepPageIds.filter((pageId) => pageId.length > 0));
  if (keepIds.size === 0) {
    return null;
  }

  const otherTabs = openTabs.filter((tab) => !keepIds.has(tab.id));
  const dirtyOthers = otherTabs.filter((tab) => dirtyPageIds.includes(tab.id));
  const cleanOthers = otherTabs.filter((tab) => !dirtyPageIds.includes(tab.id));
  const nextOpenTabs = openTabs.filter(
    (tab) => keepIds.has(tab.id) || dirtyPageIds.includes(tab.id),
  );

  return {
    nextOpenTabs,
    cleanTabsToClose: cleanOthers,
    dirtyTabsRemaining: dirtyOthers,
  };
}

export type CloseAllFileTabsPlan = {
  nextOpenTabs: PageDetail[];
  cleanTabsToClose: PageDetail[];
  dirtyTabsRemaining: PageDetail[];
};

export function planCloseAllFileTabs(
  openTabs: PageDetail[],
  dirtyPageIds: string[],
): CloseAllFileTabsPlan {
  const dirtyTabs = openTabs.filter((tab) => dirtyPageIds.includes(tab.id));
  const cleanTabs = openTabs.filter((tab) => !dirtyPageIds.includes(tab.id));
  return {
    nextOpenTabs: dirtyTabs,
    cleanTabsToClose: cleanTabs,
    dirtyTabsRemaining: dirtyTabs,
  };
}
