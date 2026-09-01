import { Suspense, forwardRef, lazy, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react"
import { LuChevronDown, LuDownload, LuExpand, LuFullscreen, LuGlobe, LuLetterText, LuTag } from "react-icons/lu"

import { getAttachmentUrl, saveAttachment } from "@/api"
import type { SimpleMermaidViewerHandle } from "@/components/graph/SimpleMermaidViewer"
import { useDesktopShellContext } from "@/components/shell/desktopShellContext"
import { useT } from "@/i18n/useT"
import { buildEffectiveGraphData } from "@/lib/graph/effectiveGraphData"
import { applyScopeGraphFilter, buildGraphCanvasInstanceKey } from "@/lib/graph/scopeGraphFilter"
import { buildMermaidGraph } from "@/lib/graph/mermaid"
import { encodeTextBase64, serializeSvgElement } from "@/lib/graph/mermaidSvgExport"
import { useScopeFilterOptions } from "@/hooks/useScopeFilterOptions"
import { expandGraphWithTagNodes } from "@/lib/graph/tag-nodes"
import { cn } from "@/lib/utils/cn"
import { useGraphFiltersStore } from "@/stores/graphFiltersStore"
import { useGraphStore } from "@/stores/graphStore"
import { useSourcesToolbarStore } from "@/stores/sourcesToolbarStore"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover"
import Tooltip from "@/components/ui/Tooltip"
import {
    FreezeGraphIcon,
    GraphStaleIcon,
    MermaidIcon,
    RebuildGraphIcon,
    RefreshGraphIcon,
} from "@/components/icons/Icons"

const Graph2D = lazy(() => import("@/components/graph/Graph2D"))
const Graph3D = lazy(() => import("@/components/graph/Graph3D"))
const GraphMermaid = lazy(() => import("@/components/graph/GraphMermaid"))

export function GraphCanvasView({
    isModal = false,
    onExpand,
}: {
    isModal?: boolean
    onExpand?: () => void
}) {
    const t = useT()
    const { authoritativeFilterOptionsPending, bridgeBaseUrl, selectedPage } = useDesktopShellContext()
    const graphData = useGraphStore((s) => s.graphData)
    const graphScope = useGraphStore((s) => s.graphScope)
    const graphPresentationEpoch = useGraphStore((s) => s.graphPresentationEpoch)
    const pendingGraphData = useGraphStore((s) => s.pendingGraphData)
    const graphMode = useGraphStore((s) => s.graphMode)
    const graphStale = useGraphStore((s) => s.graphStale)
    const setGraphMode = useGraphStore((s) => s.setGraphMode)
    const requestGraphRefresh = useGraphStore((s) => s.requestGraphRefresh)
    const requestGraphRebuildFromSelection = useGraphStore((s) => s.requestGraphRebuildFromSelection)
    const filters = useGraphFiltersStore()

    const [viewMenuOpen, setViewMenuOpen] = useState(false)
    const [isSavingMermaidAttachment, setIsSavingMermaidAttachment] = useState(false)
    const [mermaidAttachmentError, setMermaidAttachmentError] = useState("")
    const [savedMermaidAttachmentFilename, setSavedMermaidAttachmentFilename] = useState("")
    const mermaidSvgCaptureRef = useRef<SimpleMermaidViewerHandle>(null)

    const {
        graphView,
        graphDepth,
        showNodeLabels,
        showTagNodes,
        isOrbitEnabled,
        setGraphDepth,
        zoomToFitRequestId,
        setGraphView,
        toggleNodeLabels,
        toggleTagNodes,
        toggleOrbit,
        requestZoomToFit,
        usedContextLayerEnabled,
        fetchedContextLayerEnabled,
    } = useSourcesToolbarStore()

    const fetchedGraphData = useGraphStore((s) => s.fetchedGraphData)
    const previewGraphData = useMemo(() => {
        if (graphScope?.kind !== "smart-folder") {
            return null
        }
        if ((fetchedGraphData.nodes?.length ?? 0) === 0) {
            return null
        }
        return fetchedGraphData
    }, [fetchedGraphData, graphScope])

    const effectiveGraphData = useMemo(() => {
        if (previewGraphData) {
            return previewGraphData
        }
        return buildEffectiveGraphData({
            graphData,
            pendingGraphData,
            fetchedGraphData,
            usedContextLayerEnabled,
            fetchedContextLayerEnabled,
        })
    }, [
        fetchedContextLayerEnabled,
        fetchedGraphData,
        graphData,
        pendingGraphData,
        previewGraphData,
        usedContextLayerEnabled,
    ])

    const scopeFilterOptions = useScopeFilterOptions(effectiveGraphData.nodes, {
        preserveStoreOptions: authoritativeFilterOptionsPending,
    })

    const filteredGraphData = useMemo(() => {
        return applyScopeGraphFilter(effectiveGraphData, graphScope, filters, scopeFilterOptions)
    }, [effectiveGraphData, filters, graphScope, scopeFilterOptions])

    const canvasGraphData = useMemo(() => {
        if (!showTagNodes) {
            return filteredGraphData
        }
        return expandGraphWithTagNodes(filteredGraphData)
    }, [filteredGraphData, showTagNodes])

    const graphCanvasInstanceKey = useMemo(
        () => buildGraphCanvasInstanceKey(graphScope, graphPresentationEpoch),
        [graphPresentationEpoch, graphScope],
    )

    const mermaidGraph = useMemo(() => {
        return buildMermaidGraph(filteredGraphData, {
            direction: "LR",
        })
    }, [filteredGraphData])
    const effectiveGraphMode = graphMode
    const freezeGraphButtonTitle = isModal
        ? effectiveGraphMode === "frozen"
            ? t("graph.canvas.unfreezeExpanded")
            : t("graph.canvas.freezeExpanded")
        : effectiveGraphMode === "frozen"
          ? t("graph.canvas.unfreeze")
          : t("graph.canvas.freeze")
    const graphViewDisplay =
        graphView === "mermaid"
            ? t("graph.canvas.graphViewMermaid")
            : graphView.toUpperCase()

    useEffect(() => {
        setMermaidAttachmentError("")
        setSavedMermaidAttachmentFilename("")
    }, [mermaidGraph.diagram])

    async function saveMermaidAttachment() {
        if (!bridgeBaseUrl || mermaidGraph.nodeCount === 0 || isSavingMermaidAttachment) {
            return
        }
        setIsSavingMermaidAttachment(true)
        setMermaidAttachmentError("")
        setSavedMermaidAttachmentFilename("")
        try {
            const visibleSvgElement = mermaidSvgCaptureRef.current?.getVisibleSvgElement()
            if (!visibleSvgElement) {
                setMermaidAttachmentError(t("graph.canvas.couldNotCaptureMermaidSvg"))
                return
            }
            const filename = `${buildMermaidAttachmentStem(selectedPage?.title)}.svg`
            const saved = await saveAttachment(bridgeBaseUrl, {
                data_b64: encodeTextBase64(serializeSvgElement(visibleSvgElement)),
                filename,
            })
            setSavedMermaidAttachmentFilename(saved.filename)
        } catch (error) {
            setMermaidAttachmentError(
                error instanceof Error ? error.message : t("graph.canvas.couldNotCaptureMermaidSvg"),
            )
        } finally {
            setIsSavingMermaidAttachment(false)
        }
    }

    return (
        <div className="bg-background relative h-full w-full overflow-hidden">
            <div className="absolute inset-0">
                <Suspense
                    fallback={
                        <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                            {t("graph.canvas.loadingGraphView")}
                        </div>
                    }
                >
                    {graphView === "2d" ? (
                        <Graph2D
                            key={graphCanvasInstanceKey}
                            showNodeLabels={showNodeLabels}
                            zoomToFitRequestId={zoomToFitRequestId}
                            filteredGraphData={canvasGraphData}
                        />
                    ) : graphView === "3d" ? (
                        <Graph3D
                            key={graphCanvasInstanceKey}
                            showNodeLabels={showNodeLabels}
                            isOrbitEnabled={isOrbitEnabled}
                            zoomToFitRequestId={zoomToFitRequestId}
                            filteredGraphData={canvasGraphData}
                        />
                    ) : (
                        <GraphMermaid
                            alignStatusToRight={isModal}
                            graphData={filteredGraphData}
                            showNodeLabels
                            showTruncationNotice={isModal}
                            svgCaptureRef={mermaidSvgCaptureRef}
                            zoomToFitRequestId={zoomToFitRequestId}
                        />
                    )}
                </Suspense>
            </div>

            <div className="absolute top-3 end-3 start-3 z-10">
                <div className="flex items-center justify-start ps-[5px]">
                    <div className="flex items-center gap-2">
                        <Popover open={viewMenuOpen} onOpenChange={setViewMenuOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="bg-panel-background/80 border-border text-foreground hover:text-primary flex h-8 min-w-[40px] cursor-pointer items-center justify-center gap-0.5 rounded-lg border ps-1 text-xs backdrop-blur-sm transition-all duration-200"
                                    aria-label={t("graph.canvas.graphViewLabel", { view: graphViewDisplay })}
                                    title={t("graph.canvas.changeGraphView")}
                                >
                                    {graphView === "mermaid" ? <MermaidIcon className="h-4 w-4" /> : <span>{graphView.toUpperCase()}</span>}
                                    <LuChevronDown className="h-3 w-3 text-foreground/70" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="min-w-0 w-[40px] p-1" align="left" side="bottom">
                                <div className="space-y-1">
                                    {(["2d", "3d", "mermaid"] as const).map((value) => {
                                        const optionLabel = value === "mermaid"
                                            ? t("graph.canvas.graphViewMermaid")
                                            : value.toUpperCase()
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                data-cy={`graph-view-option-${value}`}
                                                title={`Switch graph view to ${optionLabel}`}
                                                onClick={() => {
                                                    setGraphView(value)
                                                    setViewMenuOpen(false)
                                                }}
                                                className={cn(
                                                    "flex w-full cursor-pointer items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                                                    graphView === value
                                                        ? "bg-primary text-primary-foreground"
                                                        : "hover:text-primary text-foreground",
                                                )}
                                            >
                                                {value === "mermaid" ? (
                                                    <>
                                                        <MermaidIcon className="h-4 w-4" />
                                                        <span className="sr-only">{t("graph.canvas.graphViewMermaid")}</span>
                                                    </>
                                                ) : (
                                                    <span>{value.toUpperCase()}</span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <div className="flex items-center gap-1">
                            <GraphCanvasTooltipButton
                                tooltip={freezeGraphButtonTitle}
                                onClick={() => {
                                    setGraphMode(effectiveGraphMode === "frozen" ? "synced" : "frozen")
                                }}
                                isActive={effectiveGraphMode === "frozen"}
                                aria-pressed={effectiveGraphMode === "frozen"}
                            >
                                <FreezeGraphIcon className="h-4 w-4" />
                            </GraphCanvasTooltipButton>
                            {effectiveGraphMode === "frozen" ? (
                                <>
                                    <GraphCanvasTooltipButton
                                        tooltip={t("graph.canvas.refreshScope")}
                                        onClick={requestGraphRefresh}
                                    >
                                        <RefreshGraphIcon className="h-4 w-4" />
                                    </GraphCanvasTooltipButton>
                                    <GraphCanvasTooltipButton
                                        tooltip={t("graph.canvas.rebuildFromSelection")}
                                        onClick={requestGraphRebuildFromSelection}
                                    >
                                        <RebuildGraphIcon className="h-4 w-4" />
                                    </GraphCanvasTooltipButton>
                                    {graphStale ? (
                                        <Tooltip content={t("graph.canvas.stale")}>
                                            <span className="text-amber-700 bg-amber-500/10 border-amber-500/20 inline-flex h-7 w-7 items-center justify-center rounded-md border dark:text-amber-300">
                                                <GraphStaleIcon className="h-4 w-4" />
                                            </span>
                                        </Tooltip>
                                    ) : null}
                                </>
                            ) : null}
                        </div>

                        <div className="flex items-center gap-1">
                            {graphView !== "mermaid" ? (
                                <>
                                    <GraphCanvasTooltipButton
                                        tooltip={showNodeLabels ? t("graph.canvas.hideNodeLabels") : t("graph.canvas.showNodeLabels")}
                                        onClick={toggleNodeLabels}
                                        isActive={showNodeLabels}
                                    >
                                        <LuLetterText className="h-3.5 w-3.5" />
                                    </GraphCanvasTooltipButton>

                                    <GraphCanvasTooltipButton
                                        tooltip={showTagNodes ? t("graph.canvas.hideTagNodes") : t("graph.canvas.showTagNodes")}
                                        onClick={toggleTagNodes}
                                        isActive={showTagNodes}
                                    >
                                        <LuTag className="h-3.5 w-3.5" />
                                    </GraphCanvasTooltipButton>
                                </>
                            ) : null}

                            {graphView === "3d" && (
                                <GraphCanvasTooltipButton
                                    tooltip={isOrbitEnabled ? t("graph.canvas.disableCameraOrbit") : t("graph.canvas.enableCameraOrbit")}
                                    onClick={toggleOrbit}
                                    isActive={isOrbitEnabled}
                                >
                                    <LuGlobe className={`h-3.5 w-3.5 ${isOrbitEnabled ? "animate-spin" : ""}`} />
                                </GraphCanvasTooltipButton>
                            )}

                            {!isModal && (
                                <GraphCanvasTooltipButton tooltip={t("graph.canvas.expandFullScreen")} onClick={onExpand}>
                                    <LuExpand className="h-3.5 w-3.5" />
                                </GraphCanvasTooltipButton>
                            )}

                            <GraphCanvasTooltipButton tooltip={t("graph.canvas.zoomToFitAll")} onClick={requestZoomToFit}>
                                <LuFullscreen className="h-3.5 w-3.5" />
                            </GraphCanvasTooltipButton>
                            {graphView === "mermaid" ? (
                                <GraphCanvasTooltipButton
                                    tooltip={
                                        isSavingMermaidAttachment
                                            ? t("graph.canvas.savingMermaidAttachment")
                                            : t("graph.canvas.saveMermaidAttachment")
                                    }
                                    onClick={() => {
                                        void saveMermaidAttachment()
                                    }}
                                    disabled={!bridgeBaseUrl || mermaidGraph.nodeCount === 0 || isSavingMermaidAttachment}
                                >
                                    <LuDownload className="h-3.5 w-3.5" />
                                </GraphCanvasTooltipButton>
                            ) : null}
                            <div className="border-border bg-background/80 flex h-7 items-center gap-2 rounded-md border px-2 backdrop-blur-sm">
                                <span className="text-muted-foreground text-[10px] tabular-nums">{graphDepth}</span>
                                <input
                                    type="range"
                                    min={1}
                                    max={5}
                                    step={1}
                                    value={graphDepth}
                                    onChange={(event) => setGraphDepth(Number(event.target.value))}
                                    aria-label={t("graph.canvas.depthAriaLabel")}
                                    title={t("graph.canvas.depthTitle", { depth: graphDepth })}
                                    className="accent-primary h-4 w-16 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                    {graphView === "mermaid" && (mermaidAttachmentError || savedMermaidAttachmentFilename) ? (
                        <div className="bg-background/85 border-border mt-2 inline-flex max-w-[440px] items-center rounded-md border px-2 py-1 text-[11px] backdrop-blur-sm">
                            {mermaidAttachmentError ? (
                                <span className="text-red-500">{mermaidAttachmentError}</span>
                            ) : (
                                <span className="text-muted-foreground">
                                    {t("graph.canvas.savedMermaidAttachment")}
                                    <a
                                        className="text-foreground underline underline-offset-2"
                                        href={getAttachmentUrl(bridgeBaseUrl, savedMermaidAttachmentFilename)}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        {savedMermaidAttachmentFilename}
                                    </a>
                                </span>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

function buildMermaidAttachmentStem(title: string | undefined): string {
    const normalizedTitle = (title ?? "locram-graph")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    return `${normalizedTitle || "locram-graph"}-graph`
}

interface GraphCanvasControlButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode
    isActive?: boolean
}

interface GraphCanvasTooltipButtonProps extends GraphCanvasControlButtonProps {
    tooltip: string
}

const GraphCanvasControlButton = forwardRef<HTMLButtonElement, GraphCanvasControlButtonProps>(
    ({ children, className, isActive, title, type = "button", ...props }, ref) => {
        return (
            <button
                {...props}
                ref={ref}
                type={type}
                aria-label={props["aria-label"] ?? title}
                className={cn(
                    "border-border flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border transition-all duration-200 hover:scale-110 active:scale-90",
                    isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background/80 text-foreground hover:text-primary backdrop-blur-sm",
                    className,
                )}
            >
                {children}
            </button>
        )
    },
)

function GraphCanvasTooltipButton({
    tooltip,
    children,
    ...props
}: GraphCanvasTooltipButtonProps) {
    return (
        <Tooltip content={tooltip}>
            <GraphCanvasControlButton {...props} title={tooltip}>
                {children}
            </GraphCanvasControlButton>
        </Tooltip>
    )
}

GraphCanvasControlButton.displayName = "GraphCanvasControlButton"
