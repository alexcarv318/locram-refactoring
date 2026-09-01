import SourceHomePanel from "@/components/editor/SourceHomePanel";
import type { SourceInspectContext, SourceTabMode } from "@/types/editor/EditorTabItem";
import type { PageSummary } from "@/types";
import type { ActiveSource } from "@/types/source";

type SourceLandingPanelProps = {
  bridgeBaseUrl: string;
  inspectContext?: SourceInspectContext;
  mode?: SourceTabMode;
  notes: PageSummary[];
  onClose: () => void;
  onSelectPage: (pageId: string) => void;
  onSelectSourceNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  source: ActiveSource;
};

export default function SourceLandingPanel({
  bridgeBaseUrl,
  inspectContext,
  mode = "active",
  notes,
  onClose,
  onSelectPage,
  onSelectSourceNode,
  selectedNodeId,
  source,
}: SourceLandingPanelProps) {
  return (
    <SourceHomePanel
      bridgeBaseUrl={bridgeBaseUrl}
      inspectContext={inspectContext}
      mode={mode}
      notes={notes}
      onClose={onClose}
      onSelectPage={onSelectPage}
      onSelectSourceNode={onSelectSourceNode}
      selectedNodeId={selectedNodeId}
      source={source}
    />
  );
}
