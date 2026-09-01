import { useCallback, useMemo, type Ref } from "react";

import {
  SimpleMermaidViewer,
  type SimpleMermaidViewerHandle,
} from "@/components/graph/SimpleMermaidViewer";
import { localizeLinkType } from "@/i18n/domainLabels";
import { useT } from "@/i18n/useT";
import { buildSimpleMermaidGraph } from "@/lib/graph/simpleMermaidAdapter";
import type { GraphDataState } from "@/stores/graphStore";
import { useGraphStore } from "@/stores/graphStore";

type GraphMermaidProps = {
  showTruncationNotice?: boolean;
  alignStatusToRight?: boolean;
  graphData?: GraphDataState | null;
  showNodeLabels?: boolean;
  svgCaptureRef?: Ref<SimpleMermaidViewerHandle>;
  zoomToFitRequestId?: number;
};

export default function GraphMermaid({
  showTruncationNotice = true,
  alignStatusToRight = false,
  graphData,
  showNodeLabels = true,
  svgCaptureRef,
  zoomToFitRequestId = 0,
}: GraphMermaidProps) {
  const t = useT();
  const focusNode = useGraphStore((state) => state.focusNode);
  const requestPageSelection = useGraphStore(
    (state) => state.requestPageSelection,
  );
  const selectSingleNode = useGraphStore((state) => state.selectSingleNode);
  const toggleNodeSelection = useGraphStore(
    (state) => state.toggleNodeSelection,
  );

  const graph = useMemo(() => {
    return buildSimpleMermaidGraph(graphData, {
      direction: "LR",
      localizeEdgeLabel: (rawType) => localizeLinkType(rawType, t),
    });
  }, [graphData, t]);

  const handleNodeActivate = useCallback(
    (nodeId: string, options?: { shiftKey: boolean }) => {
      focusNode(nodeId);
      requestPageSelection(nodeId);
      if (options?.shiftKey) {
        toggleNodeSelection(nodeId);
        return;
      }
      selectSingleNode(nodeId);
    },
    [focusNode, requestPageSelection, selectSingleNode, toggleNodeSelection],
  );

  return (
    <div
      className="h-full w-full overflow-hidden px-6 py-4"
      data-testid="graph-mermaid-view"
    >
      {showTruncationNotice && graph.meta.truncatedByClientLimit ? (
        <div
          className={`text-muted-foreground mb-3 flex text-xs ${alignStatusToRight ? "justify-end" : "justify-start"}`}
        >
          <span className="rounded-md bg-background/70 px-2 py-1 backdrop-blur-sm">
            Mermaid view truncated to {graph.meta.nodeCount} nodes and{" "}
            {graph.meta.edgeCount} links.
          </span>
        </div>
      ) : null}
      <SimpleMermaidViewer
        ref={svgCaptureRef}
        className="h-full w-full"
        graph={graph}
        onNodeActivate={handleNodeActivate}
        showNodeLabels={showNodeLabels}
        zoomToFitRequestId={zoomToFitRequestId}
      />
    </div>
  );
}
