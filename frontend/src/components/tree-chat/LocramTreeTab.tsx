import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Dock, { type TreeMode } from "@/components/dock/Dock";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import BasesTree from "@/components/bases/BasesTree";
import NetworkTree from "@/components/network/NetworkTree";
import LocramTree from "@/components/tree-chat/LocramTree";
import { fetchDesktopActivation } from "@/api";

export default function LocramTreeTab() {
  const { bridgeBaseUrl, onSelectNotesScope } = useDesktopShellContext();
  const [treeMode, setTreeMode] = useState<TreeMode>("notes");
  const desktopActivationQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-activation", bridgeBaseUrl],
    queryFn: () => fetchDesktopActivation(bridgeBaseUrl),
    retry: false,
    staleTime: 10_000,
  });
  const showNetwork =
    desktopActivationQuery.data?.usableCapabilities.shareBase === true;

  useEffect(() => {
    if (!showNetwork && treeMode === "network") {
      setTreeMode("notes");
      void onSelectNotesScope();
    }
  }, [onSelectNotesScope, showNetwork, treeMode]);

  return (
    <div className="bg-panel-background flex h-full flex-col">
      <Dock
        treeMode={treeMode}
        onTreeModeChange={setTreeMode}
        showNetwork={showNetwork}
        onSelectNotes={() => {
          void onSelectNotesScope();
        }}
      />

      <div className="flex-1 overflow-hidden">
        {treeMode === "bases" ? <BasesTree /> : treeMode === "network" ? <NetworkTree /> : <LocramTree />}
      </div>
    </div>
  );
}
