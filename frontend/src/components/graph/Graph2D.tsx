"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";

import { localizeLinkType } from "@/i18n/domainLabels";
import { useT } from "@/i18n/useT";
import { getSearchMatchedNodeIds } from "@/lib/graph/filters";
import { useStableNormalizedGraphData } from "@/lib/graph/normalizeGraphData";
import { isModifierOpenInNewTab } from "@/lib/pageOpenTabs";
import { isTagGraphNode } from "@/lib/graph/tag-nodes";
import { apply2DForces, compute2DForceParams } from "@/lib/graph2d/forces";
import { getLinkStableId } from "@/lib/graph2d/linkIds";
import {
  getLinkDirectionalParticleSpeed,
  getLinkDirectionalParticles,
  isLinkIncidentToSelectedNodes,
} from "@/lib/graph2d/particles";
import {
  getLinkColor,
  getLinkWidth,
  getNodeLabel,
  getNodeSize,
  renderNodeWithEffects,
} from "@/lib/graph2d/render";
import type {
  ForceGraph2DRef,
  Graph2DLink,
  Graph2DNode,
} from "@/lib/graph2d/types";
import { useDirection } from "@/providers/direction-provider";
import { useTheme } from "@/providers/theme-provider";
import { useGraphFiltersStore } from "@/stores/graphFiltersStore";
import { useGraphStore } from "@/stores/graphStore";
import { useSourcesToolbarStore } from "@/stores/sourcesToolbarStore";
import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";

type GraphPointerEvent = MouseEvent | PointerEvent;

interface Graph2DProps {
  width?: number;
  height?: number;
  showNodeLabels: boolean;
  zoomToFitRequestId: number;
  filteredGraphData?: {
    nodes: GraphResponseNode[];
    links: GraphResponseLink[];
  };
}

const Graph2D = ({
  width,
  height,
  showNodeLabels,
  zoomToFitRequestId,
  filteredGraphData,
}: Graph2DProps) => {
  const t = useT();
  const localizedLinkLabel = (link: Graph2DLink | null | undefined): string => {
    if (!link) return "";
    if (link.parentChild) return localizeLinkType("parent", t);
    if (link.type) return localizeLinkType(String(link.type), t);
    return "";
  };
  const {
    graphData,
    selectedNodeIds,
    selectSingleNode,
    toggleNodeSelection,
    clearSelectedNodes,
  } = useGraphStore();
  const focusedNodeId = useGraphStore((state) => state.focusedNodeId);
  const focusNode = useGraphStore((state) => state.focusNode);
  const requestPageSelection = useGraphStore(
    (state) => state.requestPageSelection,
  );
  const isEditMode = useSourcesToolbarStore((state) => state.isEditMode);
  const searchQuery = useGraphFiltersStore((state) => state.searchQuery);

  const finalGraphData = useStableNormalizedGraphData(
    filteredGraphData,
    graphData,
  );

  const { theme } = useTheme();
  const { resolvedDirection } = useDirection();
  const graphRef = useRef<
    | ForceGraphMethods<
        NodeObject<Graph2DNode>,
        LinkObject<Graph2DNode, Graph2DLink>
      >
    | undefined
  >(undefined);
  const [firstRender, setFirstRender] = useState(true);
  const [graphReady, setGraphReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const selectedNodes = useRef<Set<Graph2DNode>>(new Set());
  const [selectedLinks, setSelectedLinks] = useState<Set<Graph2DLink>>(
    new Set(),
  );
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null,
  );
  const [highlightedLinkId, setHighlightedLinkId] = useState<string | null>(
    null,
  );
  const previousFocusedNodeIdRef = useRef<string | null>(null);
  const previousNodeIdsRef = useRef<Set<string>>(new Set());

  const searchMatchedNodeIds = useMemo(() => {
    return getSearchMatchedNodeIds(finalGraphData.nodes, searchQuery);
  }, [finalGraphData.nodes, searchQuery]);

  useEffect(() => {
    const next = new Set(
      finalGraphData.nodes.filter((n: Graph2DNode) =>
        selectedNodeIds.has(String(n.id)),
      ),
    );
    selectedNodes.current = next as unknown as Set<Graph2DNode>;
  }, [finalGraphData.nodes, selectedNodeIds]);

  useEffect(() => {
    if (selectedNodeIds.size === 0 && !focusedNodeId) {
      return;
    }
    setSelectedLinks((current) => (current.size === 0 ? current : new Set()));
    setHighlightedLinkId((current) => (current === null ? current : null));
  }, [finalGraphData.links, focusedNodeId, selectedNodeIds]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const effectiveWidth = width || rect.width;
        const effectiveHeight = height || rect.height;
        setDimensions({ width: effectiveWidth, height: effectiveHeight });
      } else {
        const effectiveWidth = width || window.innerWidth * 0.9;
        const effectiveHeight = height || window.innerHeight * 0.9;
        setDimensions({ width: effectiveWidth, height: effectiveHeight });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
    };
  }, [width, height]);

  useEffect(() => {
    let rafId: number | null = null;

    rafId = window.requestAnimationFrame(() => {
      const fg = graphRef.current;
      if (!fg) return;

      const params = compute2DForceParams(finalGraphData.nodes.length);
      apply2DForces(fg as unknown as ForceGraph2DRef, params);

      try {
        const fgRef = fg as unknown as {
          d3Alpha?: (v: number) => void;
          d3ReheatSimulation?: () => void;
        };
        fgRef.d3Alpha?.(1);
        fgRef.d3ReheatSimulation?.();
      } catch {
        // ignore errors from optional d3 API
      }
    });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [finalGraphData.nodes.length, finalGraphData.links.length]);

  useEffect(() => {
    let rafId: number | null = null;

    rafId = window.requestAnimationFrame(() => {
      const fg = graphRef.current;
      if (!fg) return;

      const params = compute2DForceParams(finalGraphData.nodes.length);
      apply2DForces(fg as unknown as ForceGraph2DRef, params);
    });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [dimensions.width, dimensions.height, finalGraphData.nodes.length]);

  useEffect(() => {
    if (zoomToFitRequestId <= 0) return;
    graphRef.current?.zoomToFit?.(300);
  }, [zoomToFitRequestId]);

  useEffect(() => {
    const currentNodeIds = new Set(
      finalGraphData.nodes.map((node) => String((node as Graph2DNode).id)),
    );
    const sameFocusedNode = previousFocusedNodeIdRef.current === focusedNodeId;
    const hadFocusedNode = focusedNodeId
      ? previousNodeIdsRef.current.has(String(focusedNodeId))
      : false;

    previousFocusedNodeIdRef.current = focusedNodeId;
    previousNodeIdsRef.current = currentNodeIds;

    if (!focusedNodeId) return;
    if (isEditMode) return;
    if (sameFocusedNode && hadFocusedNode) return;

    const fg = graphRef.current;
    if (!fg) return;

    const node = finalGraphData.nodes.find(
      (n) => String((n as Graph2DNode).id) === String(focusedNodeId),
    );
    const typed = node as Graph2DNode | undefined;
    if (!typed) return;

    if (typed.x !== undefined && typed.y !== undefined) {
      fg.centerAt?.(typed.x, typed.y, 600);
      fg.zoom?.(1.1, 600);
    }
  }, [finalGraphData.nodes, focusedNodeId, isEditMode]);

  const handleNodeClick = (
    node: Graph2DNode | null,
    event?: GraphPointerEvent,
  ) => {
    if (!node?.id) return;

    setSelectedLinks(new Set());

    if (event?.shiftKey) {
      toggleNodeSelection(node.id);
      focusNode(String(node.id));
      return;
    }

    selectSingleNode(node.id);
    focusNode(String(node.id));
    setHighlightedLinkId(null);
    if (!isTagGraphNode(node)) {
      const tabDisposition =
        event && isModifierOpenInNewTab(event) ? "new-tab" : "default";
      requestPageSelection(String(node.id), tabDisposition);
    }
    setHighlightedNodeId(node.id);
    setTimeout(() => setHighlightedNodeId(null), 3000);
  };

  const handleLinkClick = (
    link: Graph2DLink | null,
    event?: GraphPointerEvent,
  ) => {
    if (!link) return;
    clearSelectedNodes();
    setHighlightedNodeId(null);

    if (event?.shiftKey) {
      setSelectedLinks((prev) => {
        const next = new Set(prev);
        if (next.has(link)) next.delete(link);
        else next.add(link);
        return next;
      });
      return;
    }

    setSelectedLinks(new Set([link]));
  };

  const handleNodeHover = (node: Graph2DNode | null) => {
    if (node) document.body.style.cursor = "pointer";
    else document.body.style.cursor = "default";
  };

  const handleLinkHover = (link: Graph2DLink | null) => {
    if (link) {
      document.body.style.cursor = "pointer";
      setHighlightedLinkId(getLinkStableId(link));
    } else {
      document.body.style.cursor = "default";
      setHighlightedLinkId(null);
    }
  };

  const handleBackgroundClick = () => {
    document.body.style.cursor = "default";
    setHighlightedNodeId(null);
    setHighlightedLinkId(null);
    clearSelectedNodes();
    setSelectedLinks(new Set());
    graphRef.current?.zoomToFit?.(300);
  };

  const handleEngineStop = () => {
    if (firstRender) {
      graphRef.current?.zoomToFit?.(400, 50);
      setFirstRender(false);
      setGraphReady(true);
    }
    return;
  };

  useEffect(() => {
    setGraphReady(false);
    setFirstRender(true);
    if (finalGraphData.nodes.length === 0) {
      setGraphReady(true);
    }
  }, [finalGraphData.nodes.length, finalGraphData.links.length]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      style={{ opacity: graphReady ? 1 : 0 }}
    >
      <ForceGraph2D
        ref={graphRef}
        nodeId="id"
        width={dimensions.width}
        height={dimensions.height}
        graphData={finalGraphData}
        backgroundColor="transparent"
        nodeLabel={getNodeLabel}
        linkLabel={localizedLinkLabel}
        nodeCanvasObject={(node, ctx) =>
          renderNodeWithEffects(node, ctx, {
            theme,
            selectedNodes: selectedNodes.current,
            highlightedNodeId,
            searchMatchedNodeIds,
            showLabels: showNodeLabels || isTagGraphNode(node),
            direction: resolvedDirection,
          })
        }
        nodeVal={(node: Graph2DNode) => getNodeSize(node) * 2}
        linkColor={(link) =>
          getLinkColor(link, {
            theme,
            selectedNodes: selectedNodes.current,
            selectedLinks,
            highlightedLinkId,
          })
        }
        linkWidth={(link) =>
          getLinkWidth(link, {
            selectedNodes: selectedNodes.current,
            selectedLinks,
            highlightedLinkId,
          })
        }
        linkDirectionalParticles={(link: Graph2DLink) => {
          const selectedByLink = selectedLinks.has(link);
          const selectedByNode = isLinkIncidentToSelectedNodes({
            link,
            selectedNodes: selectedNodes.current,
          });
          if (!selectedByLink && !selectedByNode) {
            return 0;
          }
          return getLinkDirectionalParticles(link);
        }}
        linkDirectionalParticleSpeed={(link: Graph2DLink) => {
          const selectedByLink = selectedLinks.has(link);
          const selectedByNode = isLinkIncidentToSelectedNodes({
            link,
            selectedNodes: selectedNodes.current,
          });
          return selectedByLink || selectedByNode
            ? getLinkDirectionalParticleSpeed()
            : 0;
        }}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        onBackgroundClick={handleBackgroundClick}
        d3VelocityDecay={0.18}
        d3AlphaDecay={0.02}
        cooldownTicks={100}
        cooldownTime={15000}
        onEngineStop={handleEngineStop}
      />
    </div>
  );
};

export default Graph2D;
