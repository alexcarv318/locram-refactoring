import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LuPlus } from "react-icons/lu";

import { fetchDesktopActivation, fetchNotesSummaries, notesSummariesQueryKey } from "@/api";
import { workingBaseReadOptions } from "@/lib/workingBaseReadOptions";
import { useT } from "@/i18n/useT";
import type { Translator } from "@/i18n/translate";
import {
  captureSmartFolderSnapshot,
  createDefaultGraphFilters,
  deriveGraphFilterOptionsFromSources,
  filterPageSummaries,
  type FilterPreset,
} from "@/lib/graph/filter-state/index";
import { cn } from "@/lib/utils/cn";
import {
  buildBuiltInFolderPreset,
  filterBuiltInFolderQuickAccess,
  resolveActivePresetDisplayName,
} from "@/lib/tree/folderScopes";
import { useGraphFiltersStore } from "@/stores/graphFiltersStore";
import { usePresetsStore } from "@/stores/presetsStore";
import { useSmartFolderModalStore } from "@/stores/smartFolderModalStore";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import type { ActiveSource } from "@/types/source";

import ActionButton from "@/components/ui/ActionButton";
import ActiveScopeBadge from "@/components/filters/ActiveScopeBadge";
import CopyableId from "@/components/ui/CopyableId";
import { ArrowLeftIcon, DeleteIcon, EditIcon, FilterIcon, StarIcon, SubgraphExportIcon } from "@/components/icons/Icons";
import InlineConfirm from "@/components/tree/InlineConfirm";
import TreeHeader from "@/components/tree/TreeHeader";
import TreeItem from "@/components/tree/TreeItem";

type SmartFoldersSectionProps = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  extraActions?: ReactNode;
};

function FolderBranchRow({
  children,
  expanded,
  label,
  onToggle,
  t,
}: {
  children: ReactNode;
  expanded: boolean;
  label: string;
  onToggle: () => void;
  t: Translator;
}) {
  return (
    <div className="mb-1">
      <button
        aria-label={t("smartFolders.branch.toggle", { label })}
        className="group flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1 text-start text-sm leading-none font-normal tracking-wider text-foreground transition-colors hover:bg-menu-hover-bg"
        onClick={onToggle}
        type="button"
      >
        <ArrowLeftIcon
          className={cn(
            "text-text-secondary h-3 w-3 shrink-0 rotate-180 transition-transform rtl:-scale-x-100",
            expanded && "rotate-270",
          )}
        />
        <span>{label}</span>
      </button>
      {expanded ? <div className="mt-0.5 ms-5 space-y-0.5">{children}</div> : null}
    </div>
  );
}

export default function SmartFoldersSection({ expanded, onExpandedChange, extraActions }: SmartFoldersSectionProps) {
  const t = useT();
  const { activeSource, bridgeBaseUrl, notes, notesScopeKey, onClearSmartFolderScope, onSelectSmartFolderScope } =
    useDesktopShellContext();
  const queryClient = useQueryClient();
  const { presets, isLoading, loadPresets, removePreset } = usePresetsStore();
  const { activePresetId, activePresetName, clearScope } = useGraphFiltersStore();
  const openCreateModal = useSmartFolderModalStore((state) => state.openCreateModal);
  const openEditModal = useSmartFolderModalStore((state) => state.openEditModal);
  const openExportModal = useSmartFolderModalStore((state) => state.openExportModal);
  const desktopActivationQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-activation", bridgeBaseUrl],
    queryFn: () => fetchDesktopActivation(bridgeBaseUrl),
    retry: false,
    staleTime: 10_000,
  });
  const artifactUsable =
    desktopActivationQuery.data?.usableCapabilities.multiBase === true;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isQuickAccessExpanded, setIsQuickAccessExpanded] = useState(true);
  const [isCreatedExpanded, setIsCreatedExpanded] = useState(true);
  const [isModifiedExpanded, setIsModifiedExpanded] = useState(true);
  const [isCustomScopeExpanded, setIsCustomScopeExpanded] = useState(true);
  const loadedRef = useRef(false);
  const safePresets = presets ?? [];

  const summariesQuery = useQuery({
    enabled: expanded && bridgeBaseUrl.length > 0 && notesScopeKey.length > 0,
    queryKey: notesSummariesQueryKey(bridgeBaseUrl, notesScopeKey),
    queryFn: () =>
      fetchNotesSummaries(bridgeBaseUrl, workingBaseReadOptions(activeSource)),
    retry: false,
    staleTime: 60_000,
  });

  const summaryPages = summariesQuery.data?.items;
  const builtInCounts = summariesQuery.data?.builtInCounts ?? null;
  const presetCounts = summariesQuery.data?.presetCounts ?? null;
  const quickAccessEntries = useMemo(
    () =>
      filterBuiltInFolderQuickAccess(
        summariesQuery.data?.quickAccessScopeIds ?? [],
      ),
    [summariesQuery.data?.quickAccessScopeIds],
  );
  const createdBranch = quickAccessEntries.find(
    (entry) => entry.kind === "branch" && entry.id === "builtin-folder-group-created",
  );
  const modifiedBranch = quickAccessEntries.find(
    (entry) => entry.kind === "branch" && entry.id === "builtin-folder-group-modified",
  );
  const standaloneEntries = quickAccessEntries.filter((entry) => entry.kind === "leaf");

  const summaryFilterOptions = useMemo(() => {
    if (!summaryPages) {
      return null;
    }
    return deriveGraphFilterOptionsFromSources(
      summaryPages.map((page) => ({
        type: page.type,
        status: page.status,
        subject: page.subject ?? [],
        tags: page.tags ?? [],
      })),
    );
  }, [summaryPages]);

  // Load presets once when the folders section is first expanded.
  useEffect(() => {
    if (expanded && !loadedRef.current) {
      loadedRef.current = true;
      void loadPresets(bridgeBaseUrl);
    }
  }, [expanded, bridgeBaseUrl, loadPresets]);

  // Reload when the base changes while the folders section is visible.
  useEffect(() => {
    if (expanded && loadedRef.current) {
      void loadPresets(bridgeBaseUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeBaseUrl, expanded]);

  function handleActivatePreset(preset: FilterPreset) {
    if (activePresetId === preset.id) {
      handleClearActiveScope();
    } else {
      void onSelectSmartFolderScope(preset);
    }
  }

  function handleClearActiveScope() {
    clearScope();
    onClearSmartFolderScope();
  }

  function handleCreateCustomScope() {
    const snapshot = captureSmartFolderSnapshot(useGraphFiltersStore.getState());
    const notesOptions = deriveGraphFilterOptionsFromSources(
      notes.map((page) => ({
        type: page.type,
        status: page.status,
        subject: page.subject ?? [],
        tags: page.tags ?? [],
      })),
    );
    useGraphFiltersStore.setState({
      ...createDefaultGraphFilters(notesOptions),
      options: notesOptions,
      activePresetId: null,
      activePresetName: null,
      activePresetFilter: null,
    });
    openCreateModal(snapshot);
  }

  function handleActivateBuiltInScope(scopeId: string) {
    const preset = buildBuiltInFolderPreset(scopeId, t);
    if (!preset) {
      return;
    }
    handleActivatePreset(preset);
  }

  function renderItemActions(preset: FilterPreset) {
    if (deletingId === preset.id) {
      return undefined;
    }
    return (
      <>
        {artifactUsable && (
          <ActionButton
            ariaLabel={t("smartFolders.export.subgraph")}
            icon={<SubgraphExportIcon className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e?.stopPropagation();
              openExportModal(captureSmartFolderSnapshot(useGraphFiltersStore.getState()));
            }}
            title={t("smartFolders.export.subgraphTitle")}
          />
        )}
        <CopyableId
          value={preset.id}
          iconOnly
          stopPropagation
          title={t("smartFolders.preset.copyId")}
          copiedTitle={t("smartFolders.preset.copyIdCopiedTitle")}
          ariaLabel={t("smartFolders.preset.copyId")}
          copiedAriaLabel={t("smartFolders.preset.copyIdCopiedAria")}
        />
        <ActionButton
          ariaLabel={t("smartFolders.preset.edit")}
          icon={<EditIcon className="h-3.5 w-3.5" />}
          onClick={(e) => {
            e?.stopPropagation();
            openEditModal(preset, captureSmartFolderSnapshot(useGraphFiltersStore.getState()));
          }}
          title={t("smartFolders.preset.edit")}
        />
        <ActionButton
          ariaLabel={t("smartFolders.preset.delete")}
          className="group"
          icon={<DeleteIcon className="group-hover:text-destructive h-3.5 w-3.5" />}
          onClick={(e) => {
            e?.stopPropagation();
            setDeletingId(preset.id);
          }}
          title={t("smartFolders.preset.delete")}
        />
      </>
    );
  }

  function renderPreset(preset: FilterPreset) {
    const isActive = activePresetId === preset.id;

    if (deletingId === preset.id) {
      return (
        <div className="mb-0.5" key={preset.id}>
          <InlineConfirm
            isSubmitting={false}
            label={t("smartFolders.preset.deleteConfirmLabel", { name: preset.name })}
            actionName={t("common.delete")}
            subjectName={preset.name}
            subjectIcon={<FilterIcon />}
            onCancel={() => setDeletingId(null)}
            onConfirm={() => {
              setDeletingId(null);
              if (activePresetId === preset.id) {
                handleClearActiveScope();
              }
              void removePreset(bridgeBaseUrl, preset.id).then(() => {
                void queryClient.invalidateQueries({
                  queryKey: notesSummariesQueryKey(bridgeBaseUrl, notesScopeKey),
                });
              });
            }}
            confirmLabel={t("common.delete")}
            cancelLabel={t("common.cancel")}
            tone="danger"
          />
        </div>
      );
    }

    const count =
      presetCounts?.[preset.id] ??
      (summaryPages && summaryFilterOptions
        ? filterPageSummaries(summaryPages, preset.filter, summaryFilterOptions).length
        : undefined);

    return (
      <TreeItem
        key={preset.id}
        icon={<FilterIcon />}
        label={preset.name}
        isActive={false}
        isIconActive={isActive}
        count={count}
        hideZeroCount={false}
        onClick={() => handleActivatePreset(preset)}
        actions={renderItemActions(preset)}
      />
    );
  }

  function renderQuickAccessItem(scopeId: string, label: string) {
    const count = builtInCounts?.[scopeId];
    const isActive = activePresetId === scopeId;
    return (
      <TreeItem
        key={scopeId}
        icon={<StarIcon />}
        label={label}
        isActive={false}
        isIconActive={isActive}
        count={count}
        hideZeroCount={false}
        onClick={() => handleActivateBuiltInScope(scopeId)}
      />
    );
  }

  const emptyCustomScopeContent =
    isLoading ? (
      <p className="text-text-secondary px-2 py-4 text-center text-xs">{t("common.loading")}</p>
    ) : (
      <p className="text-text-secondary px-2 py-4 text-center text-xs">
        {t("smartFolders.customScope.empty")}
      </p>
    );

  const createCustomScopeLabel = t("smartFolders.customScope.create");
  const headerActions = extraActions;
  const customScopeActions = (
    <ActionButton
      ariaLabel={createCustomScopeLabel}
      icon={<LuPlus className="h-3.5 w-3.5" />}
      onClick={(e) => {
        e?.stopPropagation();
        handleCreateCustomScope();
      }}
      title={createCustomScopeLabel}
    />
  );

  const headerStatusName = resolveActivePresetDisplayName(
    activePresetId,
    activePresetName,
    safePresets,
    t,
  );

  return (
    <TreeHeader
      title={t("smartFolders.section.title")}
      actions={headerActions}
      status={
        headerStatusName ? (
          <ActiveScopeBadge
            name={headerStatusName}
            onClear={handleClearActiveScope}
            className="max-w-[150px] sm:max-w-[200px]"
            textClassName="max-w-[110px] sm:max-w-[160px]"
            clearLabel={t("smartFolders.scope.clearLabel", { name: headerStatusName })}
          />
        ) : undefined
      }
      expanded={expanded}
      onToggle={() => onExpandedChange(!expanded)}
    >
      <div className="flex min-h-0 flex-col overflow-hidden ps-3">
        <TreeHeader
          uppercaseTitle={false}
          expanded={isQuickAccessExpanded}
          onToggle={() => setIsQuickAccessExpanded((previous) => !previous)}
          title={t("smartFolders.section.quickAccess")}
        >
          <div className="px-2 py-1">
            {createdBranch?.kind === "branch" ? (
              <FolderBranchRow
                expanded={isCreatedExpanded}
                label={t(createdBranch.labelKey)}
                onToggle={() => setIsCreatedExpanded((previous) => !previous)}
                t={t}
              >
                {createdBranch.items.map((item) => renderQuickAccessItem(item.id, t(item.labelKey)))}
              </FolderBranchRow>
            ) : null}
            {modifiedBranch?.kind === "branch" ? (
              <FolderBranchRow
                expanded={isModifiedExpanded}
                label={t(modifiedBranch.labelKey)}
                onToggle={() => setIsModifiedExpanded((previous) => !previous)}
                t={t}
              >
                {modifiedBranch.items.map((item) => renderQuickAccessItem(item.id, t(item.labelKey)))}
              </FolderBranchRow>
            ) : null}
            {standaloneEntries.map((entry) => renderQuickAccessItem(entry.id, t(entry.labelKey)))}
          </div>
        </TreeHeader>
        <TreeHeader
          uppercaseTitle={false}
          expanded={isCustomScopeExpanded}
          onToggle={() => setIsCustomScopeExpanded((previous) => !previous)}
          title={t("smartFolders.section.customScope")}
          actions={customScopeActions}
        >
          <div className="px-2 py-1">
            {safePresets.length === 0 ? emptyCustomScopeContent : safePresets.map((preset) => renderPreset(preset))}
          </div>
        </TreeHeader>
      </div>
    </TreeHeader>
  );
}
