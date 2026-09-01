import { useEffect, useMemo, useRef, type ReactNode } from "react"

import { FiltersPanel } from "@/components/filters/FiltersPanel"
import { useDesktopShellContext } from "@/components/shell/desktopShellContext"
import ParentGroupCard from "@/components/sources/ParentGroupCard"
import { SourcesToolbar } from "@/components/sources/SourcesToolbar"
import { buildEffectiveGraphData } from "@/lib/graph/effectiveGraphData"
import { applyScopeGraphFilter } from "@/lib/graph/scopeGraphFilter"
import { groupNodesByParent } from "@/lib/graph/grouping"
import { useScopeFilterOptions } from "@/hooks/useScopeFilterOptions"
import { useGraphFiltersStore } from "@/stores/graphFiltersStore"
import { useGraphStore } from "@/stores/graphStore"
import { useSourcesToolbarStore } from "@/stores/sourcesToolbarStore"

export default function SourcesListPanel({
    toolbarActions,
    borderlessToolbar = false,
    showGraphToggle = true,
}: {
    toolbarActions?: ReactNode
    borderlessToolbar?: boolean
    showGraphToggle?: boolean
}) {
    const { authoritativeFilterOptionsPending } = useDesktopShellContext()
    const graphData = useGraphStore((state) => state.graphData)
    const graphScope = useGraphStore((state) => state.graphScope)
    const pendingGraphData = useGraphStore((state) => state.pendingGraphData)
    const fetchedGraphData = useGraphStore((state) => state.fetchedGraphData)
    const focusedNodeId = useGraphStore((state) => state.focusedNodeId)
    const selectedNodeIds = useGraphStore((state) => state.selectedNodeIds)
    const filters = useGraphFiltersStore()
    const isFiltersOpen = useSourcesToolbarStore((state) => state.isFiltersOpen)
    const usedContextLayerEnabled = useSourcesToolbarStore((state) => state.usedContextLayerEnabled)
    const fetchedContextLayerEnabled = useSourcesToolbarStore((state) => state.fetchedContextLayerEnabled)
    const listRef = useRef<HTMLDivElement | null>(null)

    const listFetchedGraphData = graphScope?.kind === "smart-folder" ? null : fetchedGraphData

    const effectiveGraphData = useMemo(
        () =>
            buildEffectiveGraphData({
                graphData,
                pendingGraphData,
                fetchedGraphData: listFetchedGraphData,
                usedContextLayerEnabled,
                fetchedContextLayerEnabled,
            }),
        [fetchedContextLayerEnabled, graphData, listFetchedGraphData, pendingGraphData, usedContextLayerEnabled],
    )

    const scopeFilterOptions = useScopeFilterOptions(effectiveGraphData.nodes, {
        preserveStoreOptions: authoritativeFilterOptionsPending,
    })

    const filteredGraphData = useMemo(
        () => applyScopeGraphFilter(effectiveGraphData, graphScope, filters, scopeFilterOptions),
        [effectiveGraphData, filters, graphScope, scopeFilterOptions],
    )

    const groups = useMemo(
        () => groupNodesByParent(filteredGraphData.nodes, filteredGraphData.links),
        [filteredGraphData.links, filteredGraphData.nodes],
    )

    useEffect(() => {
        if (!focusedNodeId) {
            return
        }

        const container = listRef.current
        if (!container) {
            return
        }

        const element = container.querySelector(`[data-node-id="${CSS.escape(focusedNodeId)}"]`)
        if (element instanceof HTMLElement) {
            element.scrollIntoView({ block: "nearest", behavior: "smooth" })
        }
    }, [focusedNodeId])

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <SourcesToolbar
                extraActions={toolbarActions}
                borderless={borderlessToolbar}
                filterOptionsOverride={scopeFilterOptions}
                showGraphToggle={showGraphToggle}
            />
            <div className={isFiltersOpen ? "bg-background px-3 py-3" : ""}>
                <FiltersPanel open={isFiltersOpen} optionsOverride={scopeFilterOptions} />
            </div>
            <div className="flex-1 overflow-x-hidden overflow-y-auto">
                <div className="h-full w-full overflow-y-auto" ref={listRef}>
                    {groups.length === 0 && effectiveGraphData.nodes.length > 0 ? (
                        <div className="text-text-secondary px-4 py-6 text-center text-sm">No displayable sources</div>
                    ) : null}
                    {groups.map((group) => (
                        <ParentGroupCard group={group} key={group.parentId ?? "__other__"} selectedNodeIds={selectedNodeIds} />
                    ))}
                </div>
            </div>
        </div>
    )
}
