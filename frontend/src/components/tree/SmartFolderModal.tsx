import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { LuBookmark, LuCheck, LuX } from "react-icons/lu";

import { fetchDesktopActivation, notesSummariesQueryKey } from "@/api";
import {
  buildCurrentSmartFolderFilter,
  deriveGraphFilterOptionsFromSources,
  filterPageSummaries,
} from "@/lib/graph/filter-state/index";
import { exportSubgraph } from "@/api/baseManagementApi";
import { fetchPages } from "@/api/pagesApi";
import type { PageSummary } from "@/types";
import Input from "@/components/ui/Input";
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { FiltersPanel } from "@/components/filters/FiltersPanel";
import { FilterIcon } from "@/components/icons/Icons";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import { cn } from "@/lib/utils/cn";
import { useGraphFiltersStore } from "@/stores/graphFiltersStore";
import { usePresetsStore } from "@/stores/presetsStore";
import { useSmartFolderModalStore } from "@/stores/smartFolderModalStore";
import { useT } from "@/i18n/useT";

function deriveModalOptions(
  pages: Array<{
    type: string;
    status: string;
    subject?: string[];
    tags?: string[];
  }>,
) {
  return deriveGraphFilterOptionsFromSources(
    pages.map((page) => ({
      type: page.type,
      status: page.status,
      subject: page.subject ?? [],
      tags: page.tags ?? [],
    })),
  );
}


export default function SmartFolderModal() {
  const t = useT();
  const { bridgeBaseUrl, notes, notesScopeKey, onSelectSmartFolderScope } = useDesktopShellContext();
  const queryClient = useQueryClient();
  const closeModal = useSmartFolderModalStore((state) => state.closeModal);
  const draftName = useSmartFolderModalStore((state) => state.draftName);
  const exportStepOpen = useSmartFolderModalStore((state) => state.exportStepOpen);
  const isOpen = useSmartFolderModalStore((state) => state.isOpen);
  const mode = useSmartFolderModalStore((state) => state.mode);
  const presetId = useSmartFolderModalStore((state) => state.presetId);
  const setDraftName = useSmartFolderModalStore((state) => state.setDraftName);
  const snapshot = useSmartFolderModalStore((state) => state.snapshot);
  const desktopActivationQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-activation", bridgeBaseUrl],
    queryFn: () => fetchDesktopActivation(bridgeBaseUrl),
    retry: false,
    staleTime: 10_000,
  });
  const artifactUsable =
    desktopActivationQuery.data?.usableCapabilities.multiBase === true;

  const addPreset = usePresetsStore((state) => state.addPreset);
  const presets = usePresetsStore((state) => state.presets);
  const savePreset = usePresetsStore((state) => state.savePreset);
  const presetErrorMessage = usePresetsStore((state) => state.errorMessage);
  const clearPresetError = usePresetsStore((state) => state.clearError);

  const setActivePreset = useGraphFiltersStore((state) => state.setActivePreset);
  const filterFields = useGraphFiltersStore(
    useShallow((state) => ({
      createdAt: state.createdAt,
      linkTypes: state.linkTypes,
      metadataRuleGroups: state.metadataRuleGroups,
      reviewedAt: state.reviewedAt,
      selectionEncoding: state.selectionEncoding,
      statuses: state.statuses,
      subjects: state.subjects,
      tags: state.tags,
      types: state.types,
      updatedAt: state.updatedAt,
    })),
  );
  const currentFilter = buildCurrentSmartFolderFilter(filterFields);

  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStep, setExportStep] = useState(false);
  const [exportLabel, setExportLabel] = useState("");
  const [exportDone, setExportDone] = useState<{ path: string; page_count: number } | null>(null);
  const [allPagesCache, setAllPagesCache] = useState<PageSummary[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const exportLabelRef = useRef<HTMLInputElement>(null);

  const title = mode === "edit" ? t("smartFolder.modal.titleEdit") : t("smartFolder.modal.titleCreate");
  const description = mode === "edit"
    ? t("smartFolder.modal.descriptionEdit")
    : t("smartFolder.modal.descriptionCreate");

  const modalOptions = useMemo(() => deriveModalOptions(notes), [notes]);

  const exportFilterOptions = useMemo(
    () => deriveGraphFilterOptionsFromSources(allPagesCache.map((p) => ({
      type: p.type,
      status: p.status,
      subject: p.subject ?? [],
      tags: p.tags ?? [],
    }))),
    [allPagesCache],
  );

  const filteredExportPageIds = useMemo(() => {
    if (!exportStep || allPagesCache.length === 0) return [];
    return filterPageSummaries(allPagesCache, currentFilter, exportFilterOptions).map((p) => p.id);
  }, [exportStep, allPagesCache, currentFilter, exportFilterOptions]);
  const editingPreset = useMemo(
    () => (mode === "edit" && presetId ? presets.find((preset) => preset.id === presetId) ?? null : null),
    [mode, presetId, presets],
  );

  useEffect(() => {
    if (!isOpen) {
      setIsSaving(false);
      setSaveErrorMessage("");
      setExportStep(false);
      setExportLabel("");
      setExportDone(null);
      setAllPagesCache([]);
      clearPresetError();
      return;
    }
    setSaveErrorMessage("");
    if (exportStepOpen) {
      setExportStep(true);
    }
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, [clearPresetError, exportStepOpen, isOpen]);

  useEffect(() => {
    if (!exportStep || allPagesCache.length > 0) return;
    fetchPages(bridgeBaseUrl)
      .then(setAllPagesCache)
      .catch(() => undefined);
  }, [exportStep, bridgeBaseUrl, allPagesCache.length]);

  useEffect(() => {
    if (!isOpen || mode !== "edit" || !editingPreset) {
      return;
    }
    setActivePreset(editingPreset);
  }, [editingPreset, isOpen, mode, setActivePreset]);

  function restoreSnapshotAndClose() {
    if (snapshot) {
      useGraphFiltersStore.getState().restoreSnapshot(snapshot);
    }
    closeModal();
  }

  async function handleSubmit() {
    const trimmedName = draftName.trim();
    if (!trimmedName || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage("");
    try {
      if (mode === "edit" && presetId) {
        const preset = await savePreset(bridgeBaseUrl, presetId, trimmedName, currentFilter);
        const wasActive = snapshot?.activePresetId === presetId;
        if (wasActive) {
          await onSelectSmartFolderScope(preset);
        }
        void queryClient.invalidateQueries({
          queryKey: notesSummariesQueryKey(bridgeBaseUrl, notesScopeKey),
        });
      } else {
        const preset = await addPreset(bridgeBaseUrl, trimmedName, currentFilter);
        await onSelectSmartFolderScope(preset);
        void queryClient.invalidateQueries({
          queryKey: notesSummariesQueryKey(bridgeBaseUrl, notesScopeKey),
        });
      }
      closeModal();
    } catch (error) {
      setSaveErrorMessage(error instanceof Error ? error.message : t("smartFolder.modal.couldNotSave"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExport() {
    if (isExporting || filteredExportPageIds.length === 0) return;
    setIsExporting(true);
    setSaveErrorMessage("");
    try {
      const result = await exportSubgraph(bridgeBaseUrl, {
        page_ids: filteredExportPageIds,
        preset_id: presetId ?? undefined,
        filter: currentFilter,
        package_label: exportLabel.trim() || undefined,
      });
      setExportDone({ path: result.output_path, page_count: result.page_count });
    } catch (err) {
      setSaveErrorMessage(err instanceof Error ? err.message : t("smartFolder.modal.exportFailed"));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && restoreSnapshotAndClose()}>
      <ModalContent className="flex h-auto max-h-[90vh] max-w-4xl flex-col">
        <ModalCloseButton
          className="text-text-secondary hover:text-foreground hover:bg-menu-hover-bg flex size-7 cursor-pointer items-center justify-center rounded-md bg-transparent p-1 transition-all duration-150"
        >
          <LuX className="size-3.5" />
        </ModalCloseButton>

        <ModalHeader>
          <div className="flex min-w-0 items-start gap-3 pe-8">
            <span className="bg-menu-hover-bg text-menu-active-fg mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <FilterIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <ModalTitle>{title}</ModalTitle>
              <ModalDescription>{description}</ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="min-h-0 overflow-auto">
          <div className="space-y-5 p-4 sm:p-5">
            <section className="space-y-2">
              <div className="text-text-secondary text-xs font-semibold tracking-wider uppercase">
                {t("smartFolder.modal.sectionName")}
              </div>
              <Input
                ref={nameInputRef}
                placeholder={t("smartFolder.modal.namePlaceholder")}
                value={draftName}
                onValueChange={setDraftName}
                className="h-9 rounded-xl px-3 text-sm"
              />
            </section>

            <section className="space-y-2">
              <FiltersPanel
                open
                optionsOverride={modalOptions}
                showSaveAsPreset={false}
                className="max-h-none px-0 py-0"
              />
            </section>

            {saveErrorMessage || presetErrorMessage ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                {saveErrorMessage || presetErrorMessage}
              </div>
            ) : null}
          </div>
        </ModalBody>

        {artifactUsable && exportStep && (
          <div className="border-border bg-panel-background border-t px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{t("smartFolder.modal.exportTitle")}</p>
              <button
                type="button"
                className="text-text-secondary hover:text-foreground text-xs"
                onClick={() => { setExportStep(false); setExportDone(null); setSaveErrorMessage(""); }}
              >
                ✕
              </button>
            </div>
            {exportDone ? (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm">
                <p className="font-semibold text-green-600">
                  {t("smartFolder.modal.exportComplete", { count: exportDone.page_count })}
                </p>
                <p className="text-text-secondary mt-0.5 font-mono text-xs truncate">{exportDone.path}</p>
              </div>
            ) : (
              <>
                <p className="text-text-secondary text-xs">
                  {allPagesCache.length === 0
                    ? t("smartFolder.modal.loadingPages")
                    : t("smartFolder.modal.filterMatchCount", {
                        matched: filteredExportPageIds.length,
                        total: allPagesCache.length,
                      })}
                  {allPagesCache.length > 0 && filteredExportPageIds.length === 0 && t("smartFolder.modal.adjustFilter")}
                </p>
                <Input
                  ref={exportLabelRef}
                  placeholder={t("smartFolder.modal.packageLabelPlaceholder")}
                  value={exportLabel}
                  onValueChange={setExportLabel}
                  className="h-8 rounded-lg px-3 text-sm"
                />
                <button
                  type="button"
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    filteredExportPageIds.length > 0 && !isExporting
                      ? "bg-menu-active-bg text-menu-active-fg"
                      : "bg-panel-muted text-text-secondary cursor-not-allowed",
                  )}
                  onClick={() => void handleExport()}
                  disabled={isExporting || filteredExportPageIds.length === 0}
                >
                  <LuCheck className="h-3.5 w-3.5" />
                  {isExporting
                    ? t("smartFolder.modal.exporting")
                    : t("smartFolder.modal.exportButton", { count: filteredExportPageIds.length })}
                </button>
              </>
            )}
          </div>
        )}

        <ModalFooter className="border-0 pt-3">
          <div
            className={cn(
              "flex items-center gap-3",
              artifactUsable ? "justify-between" : "justify-end",
            )}
          >
            {artifactUsable && (
              <button
                type="button"
                className={cn(
                  "border-border rounded-lg border px-3 py-2 text-sm transition-colors",
                  exportStep
                    ? "bg-menu-active-bg/10 text-menu-active-fg border-menu-active-bg/30"
                    : "text-text-secondary hover:bg-menu-hover-bg cursor-pointer",
                )}
                onClick={() => { setExportStep((prev) => !prev); setExportDone(null); }}
              >
                {t("smartFolder.modal.createSubgraphExport")}
              </button>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="border-border hover:bg-menu-hover-bg cursor-pointer rounded-lg border px-3 py-2 text-sm"
                onClick={restoreSnapshotAndClose}
                disabled={isSaving}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className={cn(
                  "flex min-w-[100px] cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  draftName.trim()
                    ? "bg-menu-active-bg text-menu-active-fg"
                    : "bg-panel-muted text-text-secondary cursor-not-allowed",
                )}
                onClick={() => void handleSubmit()}
                disabled={isSaving || !draftName.trim()}
              >
                <LuBookmark className="h-3.5 w-3.5" />
                {isSaving
                  ? t("smartFolder.modal.saving")
                  : mode === "edit"
                    ? t("smartFolder.modal.save")
                    : t("smartFolder.modal.createSmartFolderAction")}
              </button>
            </div>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
