import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from "react"

import { computeSimpleMermaidLayout, type SimpleMermaidLayoutNode } from "@/lib/graph/simpleMermaidLayout"
import type { SimpleMermaidGraph, SimpleMermaidNodeShape } from "@/lib/graph/simpleMermaidModel"
import { useTheme } from "@/providers/theme-provider"

interface SimpleMermaidViewerProps {
    className?: string
    dataTestId?: string
    emptyMessage?: string
    graph: SimpleMermaidGraph
    onNodeActivate?: (nodeId: string, options?: { shiftKey: boolean }) => void
    showNodeLabels?: boolean
    zoomToFitRequestId?: number
}

interface ViewBox {
    x: number
    y: number
    width: number
    height: number
}

interface EdgePortAssignment {
    sourcePortIndex: number
    sourcePortCount: number
    targetPortIndex: number
    targetPortCount: number
}

const NODE_COLORS: Record<string, string> = {
    hub: "#1d4ed8",
    structure: "#15803d",
    permanent: "#b45309",
    "note-taking": "#7e22ce",
    fleeting: "#be123c",
    unknown: "#6b7280",
}

const SUBGRAPH_COLORS = ["#2563eb", "#059669", "#9333ea", "#ea580c", "#dc2626", "#ca8a04"]
const DEFAULT_VIEW_BOX: ViewBox = { x: -400, y: -300, width: 800, height: 600 }
const DRAG_THRESHOLD_PX = 4
const WHEEL_ZOOM_SENSITIVITY = 0.0015
const WHEEL_DELTA_CLAMP = 200

export type SimpleMermaidViewerHandle = {
    getVisibleSvgElement: () => SVGSVGElement | null
}

export const SimpleMermaidViewer = forwardRef<SimpleMermaidViewerHandle, SimpleMermaidViewerProps>(function SimpleMermaidViewer(
    {
    className,
    dataTestId,
    emptyMessage = "No nodes to render.",
    graph,
    onNodeActivate,
    showNodeLabels = true,
    zoomToFitRequestId = 0,
    },
    ref,
) {
    const diagramDefsId = useId().replace(/:/g, "")
    const filterGlowId = `${diagramDefsId}-simple-mermaid-focus-glow`
    const markerArrowId = `${diagramDefsId}-simple-mermaid-arrow`
    const containerRef = useRef<HTMLDivElement | null>(null)
    const svgElementRef = useRef<SVGSVGElement | null>(null)
    const dragStartPointRef = useRef<{ clientX: number; clientY: number } | null>(null)
    const lastHandledZoomRequestIdRef = useRef(0)
    const [viewBox, setViewBox] = useState<ViewBox>(DEFAULT_VIEW_BOX)
    const [layoutNodes, setLayoutNodes] = useState<Map<string, SimpleMermaidLayoutNode>>(new Map())
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
    const [focusedEdgeId, setFocusedEdgeId] = useState<string | null>(null)
    const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set())
    const [dragState, setDragState] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
    const [panStart, setPanStart] = useState<{ clientX: number; clientY: number } | null>(null)
    const [didDrag, setDidDrag] = useState(false)
    const { theme } = useTheme()

    useImperativeHandle(
        ref,
        () => ({
            getVisibleSvgElement: () => svgElementRef.current,
        }),
        [],
    )

    const baseLayout = useMemo(() => computeSimpleMermaidLayout(graph), [graph])

    const fitViewToContent = useCallback(
        (nextLayoutNodes: Map<string, SimpleMermaidLayoutNode>) => {
            if (nextLayoutNodes.size === 0) {
                setViewBox(DEFAULT_VIEW_BOX)
                return
            }

            let minX = Number.POSITIVE_INFINITY
            let maxX = Number.NEGATIVE_INFINITY
            let minY = Number.POSITIVE_INFINITY
            let maxY = Number.NEGATIVE_INFINITY

            for (const node of nextLayoutNodes.values()) {
                minX = Math.min(minX, node.x - node.width / 2)
                maxX = Math.max(maxX, node.x + node.width / 2)
                minY = Math.min(minY, node.y - node.height / 2)
                maxY = Math.max(maxY, node.y + node.height / 2)
            }

            for (const subgraphBounds of baseLayout.subgraphBounds) {
                minX = Math.min(minX, subgraphBounds.x)
                maxX = Math.max(maxX, subgraphBounds.x + subgraphBounds.width)
                minY = Math.min(minY, subgraphBounds.y)
                maxY = Math.max(maxY, subgraphBounds.y + subgraphBounds.height)
            }

            const rect = containerRef.current?.getBoundingClientRect()
            const containerWidth = rect?.width && rect.width > 0 ? rect.width : 800
            const containerHeight = rect?.height && rect.height > 0 ? rect.height : 600
            const aspectRatio = containerWidth / containerHeight
            const padding = 80
            const contentWidth = maxX - minX + padding * 2
            const contentHeight = maxY - minY + padding * 2

            let viewportWidth = contentWidth
            let viewportHeight = contentHeight
            if (viewportWidth / viewportHeight > aspectRatio) {
                viewportHeight = viewportWidth / aspectRatio
            } else {
                viewportWidth = viewportHeight * aspectRatio
            }

            setViewBox({
                x: minX - padding - (viewportWidth - contentWidth) / 2,
                y: minY - padding - (viewportHeight - contentHeight) / 2,
                width: viewportWidth,
                height: viewportHeight,
            })
        },
        [baseLayout.subgraphBounds],
    )

    useEffect(() => {
        const nextLayoutNodes = new Map(baseLayout.nodes)
        setLayoutNodes(nextLayoutNodes)
        setFocusedNodeId(null)
        setFocusedEdgeId(null)
        setCollapsedNodeIds(new Set())
        fitViewToContent(nextLayoutNodes)
    }, [baseLayout.nodes, fitViewToContent])

    useEffect(() => {
        if (zoomToFitRequestId <= 0) {
            return
        }
        if (lastHandledZoomRequestIdRef.current === zoomToFitRequestId) {
            return
        }
        lastHandledZoomRequestIdRef.current = zoomToFitRequestId
        const nextLayoutNodes = new Map(baseLayout.nodes)
        setLayoutNodes(nextLayoutNodes)
        setCollapsedNodeIds(new Set())
        setFocusedNodeId(null)
        setFocusedEdgeId(null)
        fitViewToContent(nextLayoutNodes)
    }, [baseLayout.nodes, fitViewToContent, zoomToFitRequestId])

    const screenToSvg = useCallback(
        (clientX: number, clientY: number) => {
            const rect = containerRef.current?.getBoundingClientRect()
            const width = rect?.width && rect.width > 0 ? rect.width : 800
            const height = rect?.height && rect.height > 0 ? rect.height : 600
            const left = rect?.left ?? 0
            const top = rect?.top ?? 0
            return {
                x: viewBox.x + ((clientX - left) / width) * viewBox.width,
                y: viewBox.y + ((clientY - top) / height) * viewBox.height,
            }
        },
        [viewBox],
    )

    const visibleGraph = useMemo(() => {
        const hiddenNodeIds = new Set<string>()

        function hideDescendants(parentId: string): void {
            for (const edge of graph.edges) {
                if (edge.source !== parentId || hiddenNodeIds.has(edge.target)) {
                    continue
                }
                hiddenNodeIds.add(edge.target)
                hideDescendants(edge.target)
            }
        }

        for (const collapsedNodeId of collapsedNodeIds) {
            hideDescendants(collapsedNodeId)
        }

        const finalHiddenNodeIds = new Set<string>()
        for (const hiddenNodeId of hiddenNodeIds) {
            const hasVisibleParent = graph.edges.some((edge) => {
                return edge.target === hiddenNodeId && !collapsedNodeIds.has(edge.source) && !hiddenNodeIds.has(edge.source)
            })
            if (!hasVisibleParent) {
                finalHiddenNodeIds.add(hiddenNodeId)
            }
        }

        for (const collapsedNodeId of collapsedNodeIds) {
            finalHiddenNodeIds.delete(collapsedNodeId)
        }

        const nodes = graph.nodes.filter((node) => !finalHiddenNodeIds.has(node.id))
        const visibleNodeIds = new Set(nodes.map((node) => node.id))
        const edges = graph.edges.filter((edge) => {
            return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target) && !collapsedNodeIds.has(edge.source)
        })

        return { nodes, edges }
    }, [collapsedNodeIds, graph.edges, graph.nodes])

    const edgePortAssignments = useMemo(() => {
        const sourcePortCounts = new Map<string, number>()
        const targetPortCounts = new Map<string, number>()
        for (const edge of visibleGraph.edges) {
            sourcePortCounts.set(edge.source, (sourcePortCounts.get(edge.source) ?? 0) + 1)
            targetPortCounts.set(edge.target, (targetPortCounts.get(edge.target) ?? 0) + 1)
        }

        const sourcePortUsage = new Map<string, number>()
        const targetPortUsage = new Map<string, number>()
        const assignments = new Map<string, EdgePortAssignment>()

        for (const edge of visibleGraph.edges) {
            const sourcePortIndex = sourcePortUsage.get(edge.source) ?? 0
            const targetPortIndex = targetPortUsage.get(edge.target) ?? 0
            sourcePortUsage.set(edge.source, sourcePortIndex + 1)
            targetPortUsage.set(edge.target, targetPortIndex + 1)
            assignments.set(edge.id, {
                sourcePortIndex,
                sourcePortCount: sourcePortCounts.get(edge.source) ?? 1,
                targetPortIndex,
                targetPortCount: targetPortCounts.get(edge.target) ?? 1,
            })
        }

        return assignments
    }, [visibleGraph.edges])

    const handleNodeMouseDown = useCallback(
        (event: React.MouseEvent<SVGGElement>, nodeId: string) => {
            if (event.button !== 0) {
                return
            }
            event.stopPropagation()
            const node = layoutNodes.get(nodeId)
            if (!node) {
                return
            }
            const point = screenToSvg(event.clientX, event.clientY)
            setDidDrag(false)
            dragStartPointRef.current = { clientX: event.clientX, clientY: event.clientY }
            setDragState({
                nodeId,
                offsetX: point.x - node.x,
                offsetY: point.y - node.y,
            })
        },
        [layoutNodes, screenToSvg],
    )

    const handleMouseMove = useCallback(
        (event: React.MouseEvent<SVGSVGElement>) => {
            if (dragState) {
                const dragStartPoint = dragStartPointRef.current
                if (!didDrag && dragStartPoint) {
                    const movementX = event.clientX - dragStartPoint.clientX
                    const movementY = event.clientY - dragStartPoint.clientY
                    if (movementX * movementX + movementY * movementY < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
                        return
                    }
                }
                const point = screenToSvg(event.clientX, event.clientY)
                setLayoutNodes((currentLayoutNodes) => {
                    const node = currentLayoutNodes.get(dragState.nodeId)
                    if (!node) {
                        return currentLayoutNodes
                    }
                    const nextLayoutNodes = new Map(currentLayoutNodes)
                    nextLayoutNodes.set(dragState.nodeId, {
                        ...node,
                        x: point.x - dragState.offsetX,
                        y: point.y - dragState.offsetY,
                    })
                    return nextLayoutNodes
                })
                setDidDrag(true)
                return
            }

            if (!panStart) {
                return
            }

            const currentPoint = screenToSvg(event.clientX, event.clientY)
            const previousPoint = screenToSvg(panStart.clientX, panStart.clientY)
            setViewBox((currentViewBox) => ({
                x: currentViewBox.x - (currentPoint.x - previousPoint.x),
                y: currentViewBox.y - (currentPoint.y - previousPoint.y),
                width: currentViewBox.width,
                height: currentViewBox.height,
            }))
            setPanStart({ clientX: event.clientX, clientY: event.clientY })
        },
        [didDrag, dragState, panStart, screenToSvg],
    )

    const stopInteraction = useCallback(() => {
        setDragState(null)
        setPanStart(null)
        dragStartPointRef.current = null
    }, [])

    const handleNodeClick = useCallback(
        (event: React.MouseEvent<SVGGElement>, nodeId: string) => {
            event.stopPropagation()
            if (didDrag) {
                setDidDrag(false)
                return
            }
            setFocusedNodeId(nodeId)
            setFocusedEdgeId(null)
            onNodeActivate?.(nodeId, { shiftKey: event.shiftKey })
        },
        [didDrag, onNodeActivate],
    )

    const handleNodeDoubleClick = useCallback((event: React.MouseEvent<SVGGElement>, nodeId: string) => {
        event.stopPropagation()
        setCollapsedNodeIds((currentCollapsedNodeIds) => {
            const nextCollapsedNodeIds = new Set(currentCollapsedNodeIds)
            if (nextCollapsedNodeIds.has(nodeId)) {
                nextCollapsedNodeIds.delete(nodeId)
            } else {
                nextCollapsedNodeIds.add(nodeId)
            }
            return nextCollapsedNodeIds
        })
    }, [])

    const handleEdgeClick = useCallback((event: React.MouseEvent<SVGGElement>, edgeId: string) => {
        event.stopPropagation()
        setFocusedEdgeId((currentFocusedEdgeId) => (currentFocusedEdgeId === edgeId ? null : edgeId))
        setFocusedNodeId(null)
    }, [])

    const handleBackgroundMouseDown = useCallback((event: React.MouseEvent<SVGRectElement>) => {
        if (event.button !== 0) {
            return
        }
        setPanStart({ clientX: event.clientX, clientY: event.clientY })
    }, [])

    const handleCanvasClick = useCallback(() => {
        setFocusedNodeId(null)
        setFocusedEdgeId(null)
    }, [])

    const handleWheel = useCallback(
        (event: React.WheelEvent<SVGSVGElement>) => {
            event.preventDefault()
            const clampedDeltaY = Math.max(-WHEEL_DELTA_CLAMP, Math.min(WHEEL_DELTA_CLAMP, event.deltaY))
            const scale = Math.exp(clampedDeltaY * WHEEL_ZOOM_SENSITIVITY)
            const point = screenToSvg(event.clientX, event.clientY)
            const rect = containerRef.current?.getBoundingClientRect()
            const width = rect?.width && rect.width > 0 ? rect.width : 800
            const height = rect?.height && rect.height > 0 ? rect.height : 600
            const left = rect?.left ?? 0
            const top = rect?.top ?? 0

            setViewBox((currentViewBox) => {
                const nextWidth = currentViewBox.width * scale
                const nextHeight = currentViewBox.height * scale
                return {
                    x: point.x - ((event.clientX - left) / width) * nextWidth,
                    y: point.y - ((event.clientY - top) / height) * nextHeight,
                    width: nextWidth,
                    height: nextHeight,
                }
            })
        },
        [screenToSvg],
    )

    if (graph.nodes.length === 0) {
        return (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                {emptyMessage}
            </div>
        )
    }

    return (
        <div className={className} data-testid={dataTestId}>
            <div ref={containerRef} className="h-full w-full touch-none select-none overflow-hidden">
                <svg
                    ref={svgElementRef}
                    aria-label="Note graph: pan, scroll to zoom, click nodes to open"
                    className="h-full w-full cursor-grab active:cursor-grabbing"
                    role="img"
                    viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                    onMouseLeave={stopInteraction}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopInteraction}
                    onWheel={handleWheel}
                >
                    <defs>
                        <filter id={filterGlowId} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" result="blurred" stdDeviation="6" />
                            <feColorMatrix
                                in="blurred"
                                result="coloredBlur"
                                type="matrix"
                                values="0 0 0 0 0.98 0 0 0 0 0.75 0 0 0 0 0.12 0 0 0 0.55 0"
                            />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <marker
                            id={markerArrowId}
                            fill="#64748b"
                            markerHeight="6"
                            markerWidth="8"
                            orient="auto"
                            refX="8"
                            refY="3"
                        >
                            <polygon points="0 0, 8 3, 0 6" />
                        </marker>
                    </defs>

                    <rect
                        fill="transparent"
                        height={viewBox.height}
                        onClick={handleCanvasClick}
                        onMouseDown={handleBackgroundMouseDown}
                        width={viewBox.width}
                        x={viewBox.x}
                        y={viewBox.y}
                    />

                    {baseLayout.subgraphBounds.map((subgraphBounds, index) => (
                        <g key={subgraphBounds.id}>
                            <rect
                                fill={toAlphaColor(SUBGRAPH_COLORS[index % SUBGRAPH_COLORS.length], 0.06)}
                                height={subgraphBounds.height}
                                pointerEvents="none"
                                rx={12}
                                stroke={toAlphaColor(SUBGRAPH_COLORS[index % SUBGRAPH_COLORS.length], 0.25)}
                                strokeDasharray="6 3"
                                strokeWidth={1.5}
                                width={subgraphBounds.width}
                                x={subgraphBounds.x}
                                y={subgraphBounds.y}
                            />
                            <text
                                fill={SUBGRAPH_COLORS[index % SUBGRAPH_COLORS.length]}
                                fontFamily="system-ui, sans-serif"
                                fontSize={12}
                                fontWeight={600}
                                pointerEvents="none"
                                x={subgraphBounds.x + 12}
                                y={subgraphBounds.y + 18}
                            >
                                {subgraphBounds.label}
                            </text>
                        </g>
                    ))}

                    {visibleGraph.edges.map((edge) => {
                        const sourceNode = layoutNodes.get(edge.source)
                        const targetNode = layoutNodes.get(edge.target)
                        const assignment = edgePortAssignments.get(edge.id)
                        if (!sourceNode || !targetNode || !assignment) {
                            return null
                        }

                        const isRelevantToFocusedNode =
                            !focusedNodeId || edge.source === focusedNodeId || edge.target === focusedNodeId
                        if (!isRelevantToFocusedNode) {
                            return null
                        }

                        const isFocused =
                            focusedEdgeId === edge.id || focusedNodeId === edge.source || focusedNodeId === edge.target
                        const edgeStroke = isFocused ? "#38bdf8" : edge.style === "thick" ? "#64748b" : "#475569"
                        const edgeLabelFill = isFocused
                            ? theme === "dark"
                                ? "#38bdf8"
                                : "#0369a1"
                            : theme === "dark"
                              ? "#94a3b8"
                              : "#475569"
                        const strokeWidth = isFocused ? 2.5 : edge.style === "thick" ? 2.5 : 1.5
                        const edgeGeometry = buildEdgeGeometry(sourceNode, targetNode, assignment)

                        return (
                            <g
                                key={edge.id}
                                data-edge={edge.id}
                                data-testid={`diagram-edge-${edge.id}`}
                                onClick={(event) => handleEdgeClick(event, edge.id)}
                                style={{ cursor: "pointer" }}
                            >
                                <path
                                    d={edgeGeometry.path}
                                    fill="none"
                                    markerEnd={`url(#${markerArrowId})`}
                                    stroke={edgeStroke}
                                    strokeDasharray={edge.style === "dotted" ? "6 4" : undefined}
                                    strokeWidth={strokeWidth}
                                />
                                <path d={edgeGeometry.path} fill="none" stroke="transparent" strokeWidth={16} />
                                {showNodeLabels && edge.label ? (
                                    <text
                                        fill={edgeLabelFill}
                                        fontFamily="system-ui, sans-serif"
                                        fontSize={11}
                                        textAnchor="middle"
                                        x={edgeGeometry.labelPoint.x}
                                        y={edgeGeometry.labelPoint.y}
                                    >
                                        {edge.label}
                                    </text>
                                ) : null}
                            </g>
                        )
                    })}

                    {visibleGraph.nodes.map((node) => {
                        const nodeLayout = layoutNodes.get(node.id)
                        if (!nodeLayout) {
                            return null
                        }

                        const hasChildren = graph.edges.some((edge) => edge.source === node.id)
                        const isFocused = focusedNodeId === node.id
                        const isConnectedToFocusedNode = focusedNodeId
                            ? graph.edges.some(
                                  (edge) =>
                                      (edge.source === focusedNodeId && edge.target === node.id) ||
                                      (edge.target === focusedNodeId && edge.source === node.id),
                              )
                            : false
                        const isDimmed = Boolean(focusedNodeId && !isFocused && !isConnectedToFocusedNode)
                        const nodeColor = NODE_COLORS[node.semanticClass] ?? NODE_COLORS.unknown

                        return (
                            <g
                                key={node.id}
                                data-node={node.id}
                                data-testid={`diagram-node-${node.id}`}
                                onClick={(event) => handleNodeClick(event, node.id)}
                                onDoubleClick={(event) => handleNodeDoubleClick(event, node.id)}
                                onMouseDown={(event) => handleNodeMouseDown(event, node.id)}
                                style={{ cursor: "pointer", opacity: isDimmed ? 0.25 : 1 }}
                                transform={`translate(${nodeLayout.x}, ${nodeLayout.y})`}
                            >
                                <path
                                    d={getNodePath(node.shape, nodeLayout.width, nodeLayout.height)}
                                fill={theme === "dark" ? "#111827" : "#f8fafc"}
                                    filter={isFocused ? `url(#${filterGlowId})` : undefined}
                                    stroke={isFocused ? "#f59e0b" : nodeColor}
                                    strokeWidth={isFocused ? 2.5 : 1.5}
                                />
                                {showNodeLabels ? (
                                    <text
                                        fill={
                                            theme === "dark"
                                                ? isFocused
                                                    ? "#f8fafc"
                                                    : "#e5e7eb"
                                                : "#0f172a"
                                        }
                                        fontFamily="system-ui, sans-serif"
                                        fontSize={13}
                                        fontWeight={isFocused ? 700 : 500}
                                        pointerEvents="none"
                                        textAnchor="middle"
                                    >
                                        {nodeLayout.labelLines.map((line, index) => (
                                            <tspan
                                                key={`${node.id}-${index}`}
                                                x={0}
                                                dy={
                                                    index === 0
                                                        ? `${-((nodeLayout.labelLines.length - 1) * 16) / 2}px`
                                                        : "16px"
                                                }
                                            >
                                                {line}
                                            </tspan>
                                        ))}
                                    </text>
                                ) : null}
                                {hasChildren ? (
                                    <text
                                        fill="#94a3b8"
                                        fontFamily="system-ui, sans-serif"
                                        fontSize={12}
                                        pointerEvents="none"
                                        x={nodeLayout.width / 2 - 10}
                                        y={-nodeLayout.height / 2 + 12}
                                    >
                                        {collapsedNodeIds.has(node.id) ? "+" : "-"}
                                    </text>
                                ) : null}
                            </g>
                        )
                    })}
                </svg>
            </div>
        </div>
    )
})

function buildEdgeGeometry(
    sourceNode: SimpleMermaidLayoutNode,
    targetNode: SimpleMermaidLayoutNode,
    assignment: EdgePortAssignment,
): { path: string; labelPoint: { x: number; y: number } } {
    const sourceSpan = Math.min(sourceNode.width * 0.6, Math.max(0, assignment.sourcePortCount - 1) * 14)
    const sourcePortX =
        assignment.sourcePortCount <= 1
            ? sourceNode.x
            : sourceNode.x - sourceSpan / 2 + (assignment.sourcePortIndex / (assignment.sourcePortCount - 1)) * sourceSpan
    const sourcePortY = sourceNode.y + sourceNode.height / 2

    const targetSpan = Math.min(targetNode.width * 0.6, Math.max(0, assignment.targetPortCount - 1) * 14)
    const targetPortX =
        assignment.targetPortCount <= 1
            ? targetNode.x
            : targetNode.x - targetSpan / 2 + (assignment.targetPortIndex / (assignment.targetPortCount - 1)) * targetSpan
    const targetPortY = targetNode.y - targetNode.height / 2

    if (sourcePortY >= targetPortY) {
        const side = sourcePortX >= targetPortX ? 1 : -1
        const offset = 40 + Math.abs(assignment.sourcePortIndex - assignment.targetPortIndex) * 15
        const bendX = Math.max(sourceNode.x + sourceNode.width / 2, targetNode.x + targetNode.width / 2) + offset * side
        return {
            path: `M ${sourcePortX} ${sourcePortY} C ${sourcePortX} ${sourcePortY + 30} ${bendX} ${sourcePortY + 30} ${bendX} ${sourcePortY} L ${bendX} ${targetPortY} C ${bendX} ${targetPortY - 30} ${targetPortX} ${targetPortY - 30} ${targetPortX} ${targetPortY}`,
            labelPoint: {
                x: bendX - side * 18,
                y: (sourcePortY + targetPortY) / 2 - 12,
            },
        }
    }

    const deltaY = targetPortY - sourcePortY
    const controlOffset = Math.max(30, Math.min(deltaY * 0.4, 80))
    const labelPoint = evaluateCubicBezier(
        { x: sourcePortX, y: sourcePortY },
        { x: sourcePortX, y: sourcePortY + controlOffset },
        { x: targetPortX, y: targetPortY - controlOffset },
        { x: targetPortX, y: targetPortY },
        0.5,
    )

    return {
        path: `M ${sourcePortX} ${sourcePortY} C ${sourcePortX} ${sourcePortY + controlOffset} ${targetPortX} ${targetPortY - controlOffset} ${targetPortX} ${targetPortY}`,
        labelPoint: {
            x: labelPoint.x,
            y: labelPoint.y - 10,
        },
    }
}

function evaluateCubicBezier(
    start: { x: number; y: number },
    control1: { x: number; y: number },
    control2: { x: number; y: number },
    end: { x: number; y: number },
    t: number,
): { x: number; y: number } {
    const inverse = 1 - t
    return {
        x:
            inverse ** 3 * start.x +
            3 * inverse ** 2 * t * control1.x +
            3 * inverse * t ** 2 * control2.x +
            t ** 3 * end.x,
        y:
            inverse ** 3 * start.y +
            3 * inverse ** 2 * t * control1.y +
            3 * inverse * t ** 2 * control2.y +
            t ** 3 * end.y,
    }
}

function getNodePath(shape: SimpleMermaidNodeShape, width: number, height: number): string {
    const halfWidth = width / 2
    const halfHeight = height / 2

    if (shape === "round") {
        return `M ${-halfWidth + 10} ${-halfHeight} H ${halfWidth - 10} Q ${halfWidth} ${-halfHeight} ${halfWidth} ${-halfHeight + 10} V ${halfHeight - 10} Q ${halfWidth} ${halfHeight} ${halfWidth - 10} ${halfHeight} H ${-halfWidth + 10} Q ${-halfWidth} ${halfHeight} ${-halfWidth} ${halfHeight - 10} V ${-halfHeight + 10} Q ${-halfWidth} ${-halfHeight} ${-halfWidth + 10} ${-halfHeight} Z`
    }
    if (shape === "diamond") {
        return `M 0 ${-halfHeight - 6} L ${halfWidth + 14} 0 L 0 ${halfHeight + 6} L ${-halfWidth - 14} 0 Z`
    }
    if (shape === "circle") {
        return `M 0 ${-halfHeight} A ${halfWidth} ${halfHeight} 0 1 1 0 ${halfHeight} A ${halfWidth} ${halfHeight} 0 1 1 0 ${-halfHeight} Z`
    }
    if (shape === "stadium") {
        return `M ${-halfWidth} ${-halfHeight} H ${halfWidth} Q ${halfWidth + halfHeight} ${-halfHeight} ${halfWidth + halfHeight} 0 Q ${halfWidth + halfHeight} ${halfHeight} ${halfWidth} ${halfHeight} H ${-halfWidth} Q ${-halfWidth - halfHeight} ${halfHeight} ${-halfWidth - halfHeight} 0 Q ${-halfWidth - halfHeight} ${-halfHeight} ${-halfWidth} ${-halfHeight} Z`
    }
    return `M ${-halfWidth} ${-halfHeight} H ${halfWidth} V ${halfHeight} H ${-halfWidth} Z`
}

function toAlphaColor(hexColor: string, alpha: number): string {
    const normalizedHex = hexColor.replace("#", "")
    const red = Number.parseInt(normalizedHex.slice(0, 2), 16)
    const green = Number.parseInt(normalizedHex.slice(2, 4), 16)
    const blue = Number.parseInt(normalizedHex.slice(4, 6), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
