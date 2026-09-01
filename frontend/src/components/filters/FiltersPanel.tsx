import { LuBookmark } from "react-icons/lu";

import {
  captureSmartFolderSnapshot,
  countActiveGraphFilters,
  normalizeGraphFilters,
  PAGE_STATUS_ORDER,
} from "@/lib/graph/filter-state/index";
import MetadataRulesBuilder from "@/components/filters/MetadataRulesBuilder";
import { CheckboxGrid, DateFieldCard } from "@/components/filters/FiltersPanelParts";
import { cn } from "@/lib/utils/cn";
import { useGraphFiltersStore } from "@/stores/graphFiltersStore";
import { useSmartFolderModalStore } from "@/stores/smartFolderModalStore";
import type { GraphFilterOptions } from "@/lib/graph/filter-state/index";
import { useT } from "@/i18n/useT";
import { resolveActivePresetDisplayName } from "@/lib/tree/folderScopes";
import { usePresetsStore } from "@/stores/presetsStore";

interface FiltersPanelProps {
  open: boolean;
  className?: string;
  optionsOverride?: GraphFilterOptions;
  showSaveAsPreset?: boolean;
}

export function FiltersPanel({
  open,
  className,
  optionsOverride,
  showSaveAsPreset = true,
}: FiltersPanelProps) {
  const {
    metadataRuleGroups,
    options,
    selectionEncoding,
    types,
    statuses,
    subjects,
    tags,
    createdAt,
    updatedAt,
    reviewedAt,
    setMetadataRuleGroups,
    setTypes,
    setStatuses,
    setLinkTypes,
    setCreatedAtFrom,
    setCreatedAtTo,
    setUpdatedAtFrom,
    setUpdatedAtTo,
    setReviewedAtFrom,
    setReviewedAtTo,
    activePresetId,
    activePresetName,
    searchQuery,
    linkTypes,
  } = useGraphFiltersStore();
  const presets = usePresetsStore((state) => state.presets);
  const openCreateModal = useSmartFolderModalStore((state) => state.openCreateModal);
  const t = useT();
  const activeScopeDisplayName = resolveActivePresetDisplayName(
    activePresetId,
    activePresetName,
    presets,
    t,
  );

  const resolvedOptions = optionsOverride ?? options;
  const rawFilters = {
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
  };
  const normalizedFilters = normalizeGraphFilters(rawFilters, resolvedOptions);
  const activeFiltersCount = countActiveGraphFilters(rawFilters, resolvedOptions);

  if (!open) {
    return null;
  }

  function openSaveForm() {
    openCreateModal(
      captureSmartFolderSnapshot(useGraphFiltersStore.getState()),
      activeScopeDisplayName ? `${activeScopeDisplayName} copy` : "",
    );
  }

  return (
    <div className={cn("bg-background w-full max-h-[46vh] space-y-2.5 overflow-y-auto rounded-md px-2 py-2", className)}>
      <section className="space-y-3 rounded-2xl border border-border/60 bg-background/25 p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <CheckboxGrid
            title={t("filters.title.type")}
            category="type"
            values={["fleeting", "note-taking", "permanent", "hub", "structure"]}
            availableValues={resolvedOptions.types}
            selectedValues={normalizedFilters.types}
            onSetAll={(values) => setTypes(values, resolvedOptions)}
            columns={3}
            minColumnWidth={150}
          />

          <CheckboxGrid
            title={t("filters.title.status")}
            category="status"
            values={PAGE_STATUS_ORDER}
            availableValues={resolvedOptions.statuses}
            selectedValues={normalizedFilters.statuses}
            onSetAll={(values) => setStatuses(values, resolvedOptions)}
            columns={3}
            minColumnWidth={108}
          />
        </div>

        <CheckboxGrid
          title={t("filters.title.relations")}
          category="link"
          values={resolvedOptions.linkTypes}
          availableValues={resolvedOptions.linkTypes}
          selectedValues={normalizedFilters.linkTypes}
          onSetAll={(values) => setLinkTypes(values, resolvedOptions)}
          columns={3}
          minColumnWidth={140}
        />
      </section>

      <MetadataRulesBuilder
        groups={metadataRuleGroups}
        subjectOptions={resolvedOptions.subjects}
        tagOptions={resolvedOptions.tags}
        onChange={(groups) => setMetadataRuleGroups(groups, resolvedOptions)}
      />

      <div className="space-y-2">
        <DateFieldCard
          title={t("filters.title.created")}
          from={createdAt.from}
          to={createdAt.to}
          onChangeFrom={(value) => setCreatedAtFrom(value, resolvedOptions)}
          onChangeTo={(value) => setCreatedAtTo(value, resolvedOptions)}
        />
        <DateFieldCard
          title={t("filters.title.updated")}
          from={updatedAt.from}
          to={updatedAt.to}
          onChangeFrom={(value) => setUpdatedAtFrom(value, resolvedOptions)}
          onChangeTo={(value) => setUpdatedAtTo(value, resolvedOptions)}
        />
        <DateFieldCard
          title={t("filters.title.reviewed")}
          from={reviewedAt.from}
          to={reviewedAt.to}
          onChangeFrom={(value) => setReviewedAtFrom(value, resolvedOptions)}
          onChangeTo={(value) => setReviewedAtTo(value, resolvedOptions)}
        />
      </div>

      {showSaveAsPreset && activeFiltersCount > 0 ? (
        <button
          type="button"
          onClick={openSaveForm}
          className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <LuBookmark className="h-3 w-3 shrink-0" />
          {t("filters.saveAsSmartFolder")}
        </button>
      ) : null}
    </div>
  );
}
