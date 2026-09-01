import { useEffect, useState } from "react"

import type { GraphResponseNode } from "@/types/graph/Graph"

import { getPrimaryLabel } from "@/lib/graph/labels"
import { getNodeColorHex } from "@/lib/graph2d/render"
import { cn } from "@/lib/utils/cn"
import { useGraphStore } from "@/stores/graphStore"

import { ChevronUpIcon, CircleCloseIcon, CircleExpandIcon } from "@/components/icons/Icons"
import Badge from "@/components/ui/Badge"
import CopyableId from "@/components/ui/CopyableId"
import Tooltip from "@/components/ui/Tooltip"
import { useT } from "@/i18n/useT"
import type { Translator } from "@/i18n/translate"
import type { DictionaryKey } from "@/i18n/dictionaries/en"
import type { LocaleCode } from "@/i18n/types"
import { useUiPreferencesStore } from "@/stores/uiPreferencesStore"

interface NodeCardProps {
    node: GraphResponseNode
    isSelected?: boolean
    className?: string
    selectable?: boolean
    childCount?: number
    isChildrenExpanded?: boolean
    onToggleChildren?: () => void
    contentIndentPx?: number
}

function formatTimestamp(
    value: string | null | undefined,
    t: Translator,
    locale: LocaleCode,
): string {
    if (!value) {
        return t("common.none")
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date)
}

const STATUS_LABEL_KEYS: Record<string, DictionaryKey> = {
    active: "nodeCard.status.active",
    archived: "nodeCard.status.archived",
    to_delete: "nodeCard.status.toDelete",
}

const TYPE_LABEL_KEYS: Record<string, DictionaryKey> = {
    fleeting: "nodeCard.type.fleeting",
    "note-taking": "nodeCard.type.noteTaking",
    permanent: "nodeCard.type.permanent",
    structure: "nodeCard.type.structure",
    hub: "nodeCard.type.hub",
    tag: "nodeCard.type.tag",
    Node: "nodeCard.type.node",
}

function StatusText({ status, t }: { status: string; t: Translator }) {
    const className =
        status === "archived"
            ? "text-amber-700 dark:text-amber-300"
            : status === "to_delete"
              ? "text-rose-700 dark:text-rose-300"
              : "text-emerald-700 dark:text-emerald-300"

    const labelKey = STATUS_LABEL_KEYS[status]
    const label = labelKey ? t(labelKey) : status

    return <span className={cn("font-medium", className)}>{label}</span>
}

function MetadataRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-muted-foreground flex items-center gap-2 text-[11px] leading-5">
            <span>{label}</span>
            <span className="text-foreground">{value}</span>
        </div>
    )
}

export default function NodeCard({
    node,
    isSelected = false,
    className,
    selectable = true,
    childCount,
    isChildrenExpanded,
    onToggleChildren,
    contentIndentPx = 0,
}: NodeCardProps) {
    const t = useT()
    const locale = useUiPreferencesStore((state) => state.locale)
    const [isExpanded, setIsExpanded] = useState(false)
    const selectSingleNode = useGraphStore((state) => state.selectSingleNode)
    const focusNode = useGraphStore((state) => state.focusNode)
    const requestPageSelection = useGraphStore((state) => state.requestPageSelection)

    useEffect(() => {
        setIsExpanded(isSelected)
    }, [isSelected])

    const labels = Array.isArray(node.labels) ? node.labels : []
    const rawTypeLabel = getPrimaryLabel(labels)
    const typeLabelKey = TYPE_LABEL_KEYS[rawTypeLabel]
    const typeLabel = typeLabelKey ? t(typeLabelKey) : rawTypeLabel
    const title = String(node.title || node.heading || node.name || t("nodeCard.title.untitled"))
    const status = node.status || "active"
    const topics = Array.isArray(node.subject) ? node.subject : []
    const concepts = Array.isArray(node.tags) ? node.tags : []
    const updatedAt = formatTimestamp(node.updated_at, t, locale)
    const createdAt = formatTimestamp(node.created_at, t, locale)
    const reviewedAt = formatTimestamp(node.reviewed_at, t, locale)
    const reviewInterval = node.review_interval_days != null
        ? t("nodeCard.reviewInterval.days", { count: node.review_interval_days })
        : t("common.none")
    const nodeColor = getNodeColorHex(node)
    const shortId = String(node.id).slice(-6)
    const hasChildren = typeof onToggleChildren === "function"
    const childToggleLabel = hasChildren
        ? isChildrenExpanded
            ? t("nodeCard.collapseGroup")
            : t("nodeCard.expandGroup")
        : ""
    const handleCardOpen = () => {
        if (selectable) {
            selectSingleNode(String(node.id))
            focusNode(String(node.id))
            requestPageSelection(String(node.id))
        }
    }

    return (
        <div
            data-node-id={node.id}
            className={cn("w-full hover:bg-muted/30 transition-colors", className)}
        >
            <div className="flex w-full items-start gap-3 px-4 py-3" style={{ paddingInlineStart: `${16 + contentIndentPx}px` }}>
                <div className="flex min-h-10 shrink-0 items-start pt-1">
                    <span
                        className="mt-2 h-2 w-2 rounded-full ring-2 ring-background"
                        style={{ backgroundColor: nodeColor }}
                    />
                </div>

                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                        aria-label={t("nodeCard.openNode")}
                        role="button"
                        tabIndex={0}
                        onClick={handleCardOpen}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                handleCardOpen()
                            }
                        }}
                        className="min-w-0 flex-1 cursor-pointer"
                    >
                        <div
                            className={cn(
                                "min-w-0 break-words text-sm leading-snug font-semibold",
                                isSelected ? "text-primary" : "text-foreground",
                            )}
                        >
                            {title}
                        </div>

                        <div className="mt-1 flex w-full items-start justify-between gap-3 text-[11px]">
                            <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1.5">
                                <StatusText status={status} t={t} />
                                <span>&middot;</span>
                                <span className="text-foreground/60 uppercase">{typeLabel}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-1">
                        <CopyableId
                            kind="note"
                            value={String(node.id)}
                            displayValue={shortId}
                            stopPropagation
                            className="shrink-0 text-foreground/60"
                            textClassName="font-mono"
                            buttonClassName="text-foreground/60 hover:text-foreground"
                        />
                        {typeof childCount === "number" ? (
                            <Tooltip content={childToggleLabel}>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        onToggleChildren?.()
                                    }}
                                    className={cn(
                                        "group flex min-w-0 items-center gap-1.5 font-mono text-[11px] leading-5 transition-colors",
                                        hasChildren
                                            ? isChildrenExpanded
                                                ? "text-foreground/70 hover:text-destructive cursor-pointer"
                                                : "text-foreground/70 hover:text-primary cursor-pointer"
                                            : "text-foreground/70",
                                    )}
                                    aria-label={hasChildren ? childToggleLabel : undefined}
                                    disabled={!hasChildren}
                                >
                                    <span className="shrink-0 rounded p-0.5">
                                        <span className="flex h-3.5 w-3.5 items-center justify-center">
                                            {hasChildren ? (
                                                isChildrenExpanded ? (
                                                    <CircleCloseIcon className="h-3 w-3 text-destructive" />
                                                ) : (
                                                    <CircleExpandIcon className="h-3 w-3 text-primary" />
                                                )
                                            ) : null}
                                        </span>
                                    </span>
                                    <span className="min-w-0 truncate text-start">
                                        {childCount === 1
                                            ? t("nodeCard.itemsCountOne", { count: childCount })
                                            : t("nodeCard.itemsCount", { count: childCount })}
                                    </span>
                                </button>
                            </Tooltip>
                        ) : null}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation()
                        if (isSelected) {
                            return
                        }
                        setIsExpanded((prev) => !prev)
                    }}
                    className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 cursor-pointer transition-colors"
                    aria-label={isExpanded ? t("nodeCard.collapseMetadata") : t("nodeCard.expandMetadata")}
                >
                    <ChevronUpIcon
                        className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            !isExpanded && "rotate-180",
                        )}
                    />
                </button>
            </div>

            {isExpanded && (
                <div className="px-4 pb-4" style={{ paddingInlineStart: `${16 + contentIndentPx}px` }}>
                    <div className="border-border/70 border-t pt-3">
                        <div className="flex flex-col gap-2">
                            <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
                                <MetadataRow label={t("nodeCard.metadata.updated")} value={updatedAt} />
                                <MetadataRow label={t("nodeCard.metadata.created")} value={createdAt} />
                            </div>
                            <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
                                <MetadataRow label={t("nodeCard.metadata.reviewed")} value={reviewedAt} />
                                <MetadataRow label={t("nodeCard.metadata.reviewIn")} value={reviewInterval} />
                            </div>
                        </div>

                        {(topics.length > 0 || concepts.length > 0) && (
                            <div className="mt-3 flex flex-col gap-2">
                                {topics.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {topics.map((topic) => (
                                            <Badge
                                                key={`${node.id}-topic-${topic}`}
                                                tone="info"
                                            >
                                                {topic}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                {concepts.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {concepts.map((concept) => (
                                            <Badge
                                                key={`${node.id}-concept-${concept}`}
                                                tone="success"
                                            >
                                                {concept}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
