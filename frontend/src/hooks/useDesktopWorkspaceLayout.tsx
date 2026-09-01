import { useEffect, useMemo } from "react";

import LocramEditorTab from "@/components/editor/LocramEditorTab";
import LocramSourcesTab from "@/components/sources/LocramSourcesTab";
import LocramTreeTab from "@/components/tree-chat/LocramTreeTab";
import { useShellLayoutStore } from "@/stores/shellLayoutStore";

function EmptyShellPanel() {
  return null;
}

function TreePanel() {
  return <LocramTreeTab />;
}

function SourcesPanel() {
  return <LocramSourcesTab />;
}

function EditorPanel() {
  return <LocramEditorTab />;
}

export function useDesktopWorkspaceLayout() {
  const shellTabs = useShellLayoutStore((state) => state.tabs);
  const setShellTabs = useShellLayoutStore((state) => state.setTabs);

  useEffect(() => {
    setShellTabs([
      {
        id: "tree",
        label: "Notes",
        isVisible: true,
        width: 470,
        component: EmptyShellPanel,
      },
      {
        id: "editor",
        label: "Editor",
        isVisible: true,
        width: 740,
        component: EmptyShellPanel,
        persistWidth: false,
      },
      {
        id: "sources",
        label: "Sources",
        isVisible: true,
        width: 470,
        component: EmptyShellPanel,
      },
    ]);
  }, [setShellTabs]);

  const layoutTabs = useMemo(
    () =>
      shellTabs.map((tab) => ({
        ...tab,
        component:
          tab.id === "tree"
            ? TreePanel
            : tab.id === "sources"
              ? SourcesPanel
              : EditorPanel,
      })),
    [shellTabs],
  );

  return {
    layoutTabs,
  };
}
