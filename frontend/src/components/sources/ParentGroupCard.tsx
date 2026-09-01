import { useEffect, useMemo, useState } from "react"

import type { GraphResponseNode } from "@/types/graph/Graph"

import type { NodeGroup, NodeTreeItem } from "@/lib/graph/grouping"
import { useGraphStore } from "@/stores/graphStore"
import { useSourcesToolbarStore } from "@/stores/sourcesToolbarStore"

import { Checkbox } from "@/components/ui/Checkbox"
import NodeCard from "@/components/sources/NodeCard"
import { useT } from "@/i18n/useT"

interface ParentGroupCardProps {
    group: NodeGroup
    selectedNodeIds: Set<string>
    isEditMode?: boolean
    renderChildWrapper?: (node: GraphResponseNode, card: React.ReactNode, depth: number) => React.ReactNode
    onToggleChildrenSelection?: (childIds: string[]) => void
}

interface TreeNodeBranchProps {
    item: NodeTreeItem
    selectedNodeIds: Set<string>
    isEditMode: boolean
    focusedNodeId: string | null
    renderChildWrapper?: (node: GraphResponseNode, card: React.ReactNode, depth: number) => React.ReactNode
}

function flattenTreeItems(items: NodeTreeItem[]): NodeTreeItem[] {
    return items.flatMap((item) => [item, ...flattenTreeItems(item.children)])
}

function TreeNodeBranch({
    item,
    selectedNodeIds,
    isEditMode,
    focusedNodeId,
    renderChildWrapper,
}: TreeNodeBranchProps) {
    const [isChildrenExpanded, setIsChildrenExpanded] = useState(item.children.length > 0)
    const flatChildren = useMemo(() => flattenTreeItems(item.children), [item.children])

    useEffect(() => {
        if (!focusedNodeId) {
            return
        }

        const hasNavigatedDescendant = flatChildren.some((child) => String(child.node.id) === focusedNodeId)
        if (hasNavigatedDescendant) {
            setIsChildrenExpanded(true)
        }
    }, [flatChildren, focusedNodeId])

    const card = (
        <div key={String(item.node.id)}>
            <NodeCard
                node={item.node}
                isSelected={selectedNodeIds.has(String(item.node.id))}
                selectable={!isEditMode}
                className="border-border border-b last:border-b-0"
                childCount={flatChildren.length > 0 ? flatChildren.length : undefined}
                isChildrenExpanded={isChildrenExpanded}
                onToggleChildren={flatChildren.length > 0 ? () => setIsChildrenExpanded((prev) => !prev) : undefined}
                contentIndentPx={item.depth * 10}
            />
            {isChildrenExpanded && item.children.length > 0 ? (
                <div className="border-border border-t">
                    {item.children.map((child) => (
                        <TreeNodeBranch
                            key={String(child.node.id)}
                            item={child}
                            selectedNodeIds={selectedNodeIds}
                            isEditMode={isEditMode}
                            focusedNodeId={focusedNodeId}
                            renderChildWrapper={renderChildWrapper}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    )

    if (renderChildWrapper) {
        return renderChildWrapper(item.node, card, item.depth)
    }

    return card
}

export default function ParentGroupCard({
    group,
    selectedNodeIds,
    isEditMode = false,
    renderChildWrapper,
    onToggleChildrenSelection,
}: ParentGroupCardProps) {
    const t = useT()
    const [isChildrenExpanded, setIsChildrenExpanded] = useState(group.parentNode === null || group.children.length > 0)
    const focusedNodeId = useGraphStore((state) => state.focusedNodeId)
    const isToolbarEditMode = useSourcesToolbarStore((state) => state.isEditMode)
    const flatChildren = useMemo(() => flattenTreeItems(group.children), [group.children])
    const childCount = flatChildren.length
    const selectedCount = isEditMode ? flatChildren.filter((item) => selectedNodeIds.has(String(item.node.id))).length : 0
    const childIds = flatChildren.map((item) => String(item.node.id))
    const allChildrenSelected = isEditMode && childIds.length > 0 && childIds.every((id) => selectedNodeIds.has(id))

    useEffect(() => {
        if (!focusedNodeId) {
            return
        }

        const hasChild = flatChildren.some((item) => String(item.node.id) === String(focusedNodeId))
        if (hasChild) {
            setIsChildrenExpanded(true)
        }
    }, [flatChildren, focusedNodeId])

    return (
        <div className="border-border border-b">
            {group.parentNode ? (
                <div className="flex w-full items-start">
                    {isEditMode && onToggleChildrenSelection ? (
                        <div
                            className="flex w-10 shrink-0 items-start justify-center pt-4"
                            onClick={(event) => {
                                event.stopPropagation()
                            }}
                        >
                            <Checkbox
                                checked={allChildrenSelected}
                                onCheckedChange={() => {
                                    onToggleChildrenSelection(childIds)
                                }}
                            />
                        </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                        <NodeCard
                            node={group.parentNode}
                            isSelected={group.parentId !== null && String(focusedNodeId) === String(group.parentId)}
                            selectable={!isEditMode && !isToolbarEditMode}
                            childCount={childCount}
                            isChildrenExpanded={isChildrenExpanded}
                            onToggleChildren={() => setIsChildrenExpanded((prev) => !prev)}
                        />
                        {selectedCount > 0 ? (
                            <div className="text-primary px-4 pb-2 text-[11px] font-medium">
                                {t("parentGroupCard.selectedCount", { count: selectedCount })}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {!group.parentNode && childCount > 0 ? (
                <button
                    type="button"
                    onClick={() => setIsChildrenExpanded((prev) => !prev)}
                    className="text-muted-foreground w-full px-4 py-3 text-start text-[11px]"
                >
                    {t("parentGroupCard.other")}
                </button>
            ) : null}

            {isChildrenExpanded ? (
                <div className="border-border border-t">
                    {group.children.map((item) => (
                        <TreeNodeBranch
                            key={String(item.node.id)}
                            item={item}
                            selectedNodeIds={selectedNodeIds}
                            isEditMode={isEditMode || isToolbarEditMode}
                            focusedNodeId={focusedNodeId}
                            renderChildWrapper={renderChildWrapper}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    )
}
