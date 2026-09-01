import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import type {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-3d";
import * as THREE from "three";

import {
  GRAPH_BG_3D_DARK,
  GRAPH_BG_3D_LIGHT,
  NODE_HIGHLIGHT_BORDER,
  NODE_PENDING_COLOR,
  NODE_SELECTED_COLOR,
} from "@/lib/graph/color-palette";
import { getSearchMatchedNodeIds } from "@/lib/graph/filters";
import { useStableNormalizedGraphData } from "@/lib/graph/normalizeGraphData";
import { isModifierOpenInNewTab } from "@/lib/pageOpenTabs";
import { isTagGraphNode } from "@/lib/graph/tag-nodes";
import { measureGraphContainer } from "@/lib/graph3d/dimensions";
import { apply3DForces, compute3DForceParams } from "@/lib/graph3d/forces";
import { getNodeHighlightSprite } from "@/lib/graph3d/highlight";
import { createNodeLabelSprite } from "@/lib/graph3d/nodeLabel";
import {
  resetGraph3DSelection,
  setPointerCursor,
  toggleLinkSelection,
} from "@/lib/graph3d/interaction";
import { startOrbitRotation } from "@/lib/graph3d/orbit";
import {
  getLinkDirectionalParticles,
  getLinkDirectionalParticleSpeed,
  getLinkDirectionalParticleWidth,
  isLinkIncidentToSelectedNodes,
} from "@/lib/graph3d/particles";
import { GRAPH_3D_PHYSICS_DEFAULT } from "@/lib/graph3d/physics";
import {
  getLinkColor,
  getLinkStableId,
  getLinkWidth,
  getNodeColor,
  getNodeLabel,
  getNodeSize,
} from "@/lib/graph3d/render";
import { localizeLinkType } from "@/i18n/domainLabels";
import { useT } from "@/i18n/useT";
import type {
  ForceGraph3DRef,
  Graph3DLink,
  Graph3DNode,
} from "@/lib/graph3d/types";
import { useTheme } from "@/providers/theme-provider";
import { useGraphFiltersStore } from "@/stores/graphFiltersStore";
import { useGraphStore } from "@/stores/graphStore";
import { useSourcesToolbarStore } from "@/stores/sourcesToolbarStore";
import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";

type GraphPointerEvent = MouseEvent | PointerEvent;

interface Graph3DProps {
  width?: number;
  height?: number;
  showNodeLabels: boolean;
  isOrbitEnabled: boolean;
  zoomToFitRequestId: number;
  filteredGraphData?: {
    nodes: GraphResponseNode[];
    links: GraphResponseLink[];
  };
}

const GRAPH_3D_PERFORMANCE_POLICY = {
  cooldownTicks: 0,
  cooldownTime: 0,
  showDirectionalParticles: true,
  showNodeHighlightSprites: false,
} as const;

const Graph3D = ({
  width,
  height,
  showNodeLabels,
  isOrbitEnabled,
  zoomToFitRequestId,
  filteredGraphData,
}: Graph3DProps) => {
  const t = useT();
  const localizedLinkLabel = (link: Graph3DLink): string => {
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
  const { theme } = useTheme();

  const finalGraphData = useStableNormalizedGraphData(
    filteredGraphData,
    graphData,
  );

  const searchMatchedNodeIds = useMemo(() => {
    return getSearchMatchedNodeIds(finalGraphData.nodes, searchQuery);
  }, [finalGraphData.nodes, searchQuery]);

  const graphRef = useRef<
    | ForceGraphMethods<
        NodeObject<Graph3DNode>,
        LinkObject<Graph3DNode, Graph3DLink>
      >
    | undefined
  >(undefined);
  const [firstRender, setFirstRender] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const orbitEnabledRef = useRef<boolean>(false);

  const selectedNodes = useRef<Set<Graph3DNode>>(new Set());
  const [selectedLinks, setSelectedLinks] = useState<Set<Graph3DLink>>(
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

  const highlightSpriteByNodeRef = useRef<WeakMap<object, THREE.Sprite>>(
    new WeakMap(),
  );

  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;

    const params = compute3DForceParams(finalGraphData.nodes.length);
    apply3DForces(fg as unknown as ForceGraph3DRef, params);
  }, [finalGraphData.nodes.length]);

  useEffect(() => {
    const next = new Set(
      finalGraphData.nodes.filter((n) => selectedNodeIds.has(String(n.id))),
    );
    selectedNodes.current = next as unknown as Set<Graph3DNode>;
  }, [finalGraphData.nodes, selectedNodeIds]);

  useEffect(() => {
    if (selectedNodeIds.size === 0 && !focusedNodeId) {
      return;
    }
    setSelectedLinks((current) => (current.size === 0 ? current : new Set()));
    setHighlightedLinkId((current) => (current === null ? current : null));
  }, [finalGraphData.links, focusedNodeId, selectedNodeIds]);

  useEffect(() => {
    orbitEnabledRef.current = isOrbitEnabled;

    if (!isOrbitEnabled) return;

    return startOrbitRotation({
      graph: graphRef.current as unknown as ForceGraph3DRef,
      isEnabledRef: orbitEnabledRef,
    });
  }, [isOrbitEnabled]);

  useEffect(() => {
    if (zoomToFitRequestId <= 0) return;
    graphRef.current?.zoomToFit?.(300, 5);
  }, [zoomToFitRequestId]);

  useEffect(() => {
    const currentNodeIds = new Set(
      finalGraphData.nodes.map((node) => String((node as Graph3DNode).id)),
    );
    const sameFocusedNode = previousFocusedNodeIdRef.current === focusedNodeId;
    const hadFocusedNode = focusedNodeId
      ? previousNodeIdsRef.current.has(String(focusedNodeId))
      : false;

    previousFocusedNodeIdRef.current = focusedNodeId;
    previousNodeIdsRef.current = currentNodeIds;

    if (!focusedNodeId) return;
    if (firstRender) return;
    if (isEditMode) return;
    if (sameFocusedNode && hadFocusedNode) return;

    const fg = graphRef.current;
    if (!fg) return;

    const node = finalGraphData.nodes.find(
      (n) => String((n as Graph3DNode).id) === String(focusedNodeId),
    );
    const typed = node as Graph3DNode | undefined;
    if (!typed) return;

    if (
      typed.x !== undefined &&
      typed.y !== undefined &&
      typed.z !== undefined
    ) {
      fg.cameraPosition?.(
        { x: typed.x, y: typed.y, z: typed.z + 360 },
        { x: typed.x, y: typed.y, z: typed.z + 100 },
        500,
      );
    }
  }, [finalGraphData.nodes, firstRender, focusedNodeId, isEditMode]);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions(
        measureGraphContainer({
          container: containerRef.current,
          width,
          height,
          fallback: { width: 800, height: 600 },
        }),
      );
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
    graphRef.current?.refresh?.();
  }, [showNodeLabels]);

  const selectedNodesForLinks = selectedNodes.current;

  const handleNodeClick = (
    node: Graph3DNode | null,
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
    link: Graph3DLink | null,
    event?: GraphPointerEvent,
  ) => {
    if (!link) return;

    clearSelectedNodes();
    setHighlightedNodeId(null);

    if (event?.shiftKey) {
      setSelectedLinks((prev) =>
        toggleLinkSelection({ link, selectedLinks: prev }),
      );
      return;
    }

    setSelectedLinks(new Set([link]));
  };

  const handleNodeHover = (node: Graph3DNode | null) => {
    setPointerCursor(Boolean(node));
    setHighlightedNodeId(node?.id ?? null);
  };

  const handleLinkHover = (link: Graph3DLink | null) => {
    setPointerCursor(Boolean(link));
    setHighlightedLinkId(link ? getLinkStableId(link) : null);
  };

  const handleBackgroundClick = () => {
    setPointerCursor(false);
    const reset = resetGraph3DSelection();
    clearSelectedNodes();
    setSelectedLinks(reset.selectedLinks);
    setHighlightedNodeId(reset.highlightedNodeId);
    setHighlightedLinkId(reset.highlightedLinkId);
    graphRef.current?.zoomToFit?.(300);
  };

  const handleNodeThreeObject = (node: Graph3DNode) => {
    const showPersistentLabel = showNodeLabels;
    const isSelected = selectedNodes.current.has(node);
    const isHighlighted = highlightedNodeId === node.id;
    const isSearchMatch = searchMatchedNodeIds.has(String(node.id));
    const group = new THREE.Group();

    if (GRAPH_3D_PERFORMANCE_POLICY.showNodeHighlightSprites) {
      const visible = isSelected || isHighlighted || isSearchMatch;
      const radius = visible
        ? getNodeSize(node) * (isSelected ? 6 : isSearchMatch ? 5 : 4)
        : 0;
      const highlightSprite = getNodeHighlightSprite({
        node,
        cache: highlightSpriteByNodeRef.current,
        color:
          isSearchMatch && !isSelected && !isHighlighted
            ? NODE_HIGHLIGHT_BORDER
            : NODE_SELECTED_COLOR,
        baseOpacity: 0.9,
        radius,
        isSelected,
      });
      if (highlightSprite) {
        group.add(highlightSprite);
      }
    }

    if (showPersistentLabel) {
      group.add(createNodeLabelSprite(getNodeLabel(node), getNodeSize(node)));
    }

    return group.children.length > 0 ? group : new THREE.Object3D();
  };

  const handleGraphDragStartCapture = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleEngineStop = () => {
    if (firstRender) {
      setFirstRender(false);
    }
    return;
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      onDragStartCapture={handleGraphDragStartCapture}
    >
      <ForceGraph3D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={finalGraphData}
        backgroundColor={
          theme === "dark" ? GRAPH_BG_3D_DARK : GRAPH_BG_3D_LIGHT
        }
        nodeColor={(node: Graph3DNode) =>
          selectedNodes.current.has(node) || highlightedNodeId === node.id
            ? NODE_SELECTED_COLOR
            : getNodeColor(node)
        }
        nodeVal={(node: Graph3DNode) => getNodeSize(node)}
        linkColor={(link: Graph3DLink) =>
          link.__isPending
            ? NODE_PENDING_COLOR
            : getLinkColor(link, {
                theme,
                selectedNodes: selectedNodesForLinks,
                selectedLinks,
                highlightedLinkId,
              })
        }
        linkWidth={(link: Graph3DLink) =>
          getLinkWidth(link, {
            selectedLinks,
            highlightedLinkId,
          })
        }
        nodeLabel={(node: Graph3DNode) => (showNodeLabels ? "" : getNodeLabel(node))}
        linkLabel={(link: Graph3DLink) => localizedLinkLabel(link)}
        linkDirectionalParticles={(link: Graph3DLink) =>
          GRAPH_3D_PERFORMANCE_POLICY.showDirectionalParticles &&
          (selectedLinks.has(link) ||
            highlightedLinkId === getLinkStableId(link) ||
            isLinkIncidentToSelectedNodes({
              link,
              selectedNodes: selectedNodesForLinks,
            }))
            ? getLinkDirectionalParticles(link)
            : 0
        }
        linkDirectionalParticleWidth={(link: Graph3DLink) =>
          GRAPH_3D_PERFORMANCE_POLICY.showDirectionalParticles
            ? getLinkDirectionalParticleWidth({
                link,
                selectedLinks,
                highlightedLinkId,
                selectedNodes: selectedNodesForLinks,
              })
            : 0
        }
        linkDirectionalParticleSpeed={() =>
          GRAPH_3D_PERFORMANCE_POLICY.showDirectionalParticles
            ? getLinkDirectionalParticleSpeed()
            : 0
        }
        linkDirectionalParticleColor={(link: Graph3DLink) =>
          GRAPH_3D_PERFORMANCE_POLICY.showDirectionalParticles
            ? getLinkColor(link, {
                theme,
                selectedNodes: selectedNodesForLinks,
                selectedLinks,
                highlightedLinkId,
              })
            : "transparent"
        }
        nodeThreeObject={handleNodeThreeObject}
        nodeThreeObjectExtend
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        onBackgroundClick={handleBackgroundClick}
        enableNavigationControls={true}
        d3AlphaDecay={GRAPH_3D_PHYSICS_DEFAULT.d3AlphaDecay}
        d3VelocityDecay={GRAPH_3D_PHYSICS_DEFAULT.d3VelocityDecay}
        warmupTicks={GRAPH_3D_PHYSICS_DEFAULT.warmupTicks}
        cooldownTicks={GRAPH_3D_PERFORMANCE_POLICY.cooldownTicks}
        cooldownTime={GRAPH_3D_PERFORMANCE_POLICY.cooldownTime}
        onEngineStop={handleEngineStop}
      />
    </div>
  );
};

export default Graph3D;
