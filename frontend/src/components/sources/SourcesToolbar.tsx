import { type ReactNode } from "react"
import { LuChevronDown, LuChevronUp, LuFilter, LuPencil, LuX } from "react-icons/lu"

import { useT } from "@/i18n/useT"
import { countActiveGraphFilters, type GraphFilterOptions } from "@/lib/graph/filter-state/index"
import { resolveActivePresetDisplayName } from "@/lib/tree/folderScopes"
import { useGraphFiltersStore } from "@/stores/graphFiltersStore"
import { usePresetsStore } from "@/stores/presetsStore"
import { useSourcesToolbarStore } from "@/stores/sourcesToolbarStore"

import ActiveScopeBadge from "@/components/filters/ActiveScopeBadge"
import { ReloadIcon } from "@/components/icons/Icons"
import { useDesktopShellContext } from "@/components/shell/desktopShellContext"
import ActionButton from "@/components/ui/ActionButton"

type SourcesToolbarVariant = "chat" | "context"

export function SourcesToolbar({
    variant = "chat",
    extraActions,
    borderless = false,
    filterOptionsOverride,
    showGraphToggle = true,
}: {
    variant?: SourcesToolbarVariant
    extraActions?: ReactNode
    borderless?: boolean
    filterOptionsOverride?: GraphFilterOptions
    showGraphToggle?: boolean
}) {
    const t = useT()
    const presets = usePresetsStore((state) => state.presets)
    const { onClearSmartFolderScope } = useDesktopShellContext()
    const { isGraphCollapsed, isFiltersOpen, toggleGraph, toggleFilters, isEditMode, toggleEditMode } =
        useSourcesToolbarStore()
    const {
        selectionEncoding,
        searchQuery,
        types,
        statuses,
        subjects,
        tags,
        metadataRuleGroups,
        linkTypes,
        createdAt,
        updatedAt,
        reviewedAt,
        options,
        setSearchQuery,
        resetAllFilters,
        clearScope,
        activePresetId,
        activePresetName,
        activePresetFilter,
    } = useGraphFiltersStore()
    const resolvedOptions = filterOptionsOverride ?? options
    const activeScopeDisplayName = resolveActivePresetDisplayName(
        activePresetId,
        activePresetName,
        presets,
        t,
    )
    const currentFilters = {
        selectionEncoding,
        searchQuery,
        types,
        statuses,
        subjects,
        tags,
        metadataRuleGroups,
        linkTypes,
        createdAt,
        updatedAt,
        reviewedAt,
        options: resolvedOptions,
    }
    const rawFiltersCount = countActiveGraphFilters(currentFilters, resolvedOptions)
    const presetBaselineCount = activePresetFilter
        ? countActiveGraphFilters({ ...activePresetFilter, options }, resolvedOptions)
        : 0
    const activeFiltersCount = Math.max(0, rawFiltersCount - presetBaselineCount)

    // When a preset is active but user has further narrowed filters, show a refinement indicator.
    // When exactly at preset baseline, show just the preset name pill.
    const hasRefinement = Boolean(activePresetFilter && activeFiltersCount > 0)

    const handleClearActiveScope = () => {
        clearScope(resolvedOptions)
        onClearSmartFolderScope()
    }

    return (
        <div className={borderless ? "bg-background flex min-w-0 items-center gap-2 px-2 py-1.5 sm:px-3" : "bg-background border-border flex min-w-0 items-center gap-2 border-b px-2 py-1.5 sm:px-3"}>
            <div className="relative min-w-0 flex-1">
                <input
                    aria-label={t("sources.toolbar.search.label")}
                    type="text"
                    placeholder={t("sources.toolbar.search.placeholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="
                        border-input bg-background placeholder:text-muted-foreground
                        focus:border-border/80
                        focus-visible:ring-ring/25 focus-visible:ring-1 focus-visible:ring-offset-0
                        h-7 w-full min-w-0 rounded-md border px-2 pe-7 text-xs
                        outline-none focus-visible:outline-none sm:px-3 sm:pe-8
                    "
                />
                {searchQuery ? (
                    <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        aria-label={t("sources.toolbar.search.clear")}
                        className="text-text-secondary hover:text-foreground absolute top-1/2 end-1 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm transition-colors"
                    >
                        <LuX className="h-3.5 w-3.5" />
                    </button>
                ) : null}
            </div>

            {/* Active preset pill — shows preset name and a clear button */}
            {activePresetId && activeScopeDisplayName ? (
                <ActiveScopeBadge
                    name={activeScopeDisplayName}
                    onClear={handleClearActiveScope}
                    className="max-w-[132px] sm:max-w-[180px]"
                    textClassName="max-w-[96px] sm:max-w-[144px]"
                />
            ) : null}

            <div className="ms-auto flex shrink-0 items-center gap-1">
                {variant === "context" && (
                    <ActionButton
                        className="h-7 w-7"
                        icon={<LuPencil className="h-3.5 w-3.5" />}
                        onClick={toggleEditMode}
                        title={isEditMode ? t("sources.toolbar.edit.exit") : t("sources.toolbar.edit.enter")}
                    />
                )}

                {showGraphToggle ? (
                    <ActionButton
                        className="h-7 w-7"
                        icon={
                            isGraphCollapsed ? (
                                <LuChevronDown className="h-3.5 w-3.5" />
                            ) : (
                                <LuChevronUp className="h-3.5 w-3.5" />
                            )
                        }
                        onClick={toggleGraph}
                        title={isGraphCollapsed ? t("sources.toolbar.graph.show") : t("sources.toolbar.graph.hide")}
                    />
                ) : null}

                <ActionButton
                    className="h-7 w-7"
                    icon={<ReloadIcon className="h-3.5 w-3.5" />}
                    onClick={() => resetAllFilters(resolvedOptions)}
                    title={
                        activePresetId && hasRefinement && activeScopeDisplayName
                            ? t("sources.toolbar.filters.returnToPreset", { name: activeScopeDisplayName })
                            : t("sources.toolbar.filters.reset")
                    }
                />

                <div className="relative">
                    <ActionButton
                        active={isFiltersOpen}
                        icon={<LuFilter className="h-3.5 w-3.5" />}
                        onClick={toggleFilters}
                        title={t("sources.toolbar.filters.toggle")}
                        className="h-7 w-7"
                    />
                    {activeFiltersCount > 0 && (
                        <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[10px] font-bold">
                            {activeFiltersCount}
                        </span>
                    )}
                </div>

                {extraActions}
            </div>
        </div>
    )
}
