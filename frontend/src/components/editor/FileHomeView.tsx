import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useUiPreferencesStore } from "@/stores/uiPreferencesStore";
import { fetchDesktopActivation } from "@/api";
import {
  deleteBackup,
  deleteExport,
  executeMerge,
  fetchMergePlan,
  fetchBases,
  inspectArtifact,
  registerBase,
  renameBackup,
  renameExport,
  restoreBackup,
} from "@/api/baseManagementApi";
import {
  CheckIcon,
  CopyIcon,
  CopySuccessIcon,
  DatabaseIcon,
  DeleteIcon,
  EditIcon,
  InformationIcon,
  LinkBridgeIcon,
  MergeIntoBaseIcon,
  NoteIcon,
  RegisterBaseIcon,
  WarningIcon,
  XIcon,
} from "@/components/icons/Icons";
import ActionButton from "@/components/ui/ActionButton";
import InlineConfirm from "@/components/tree/InlineConfirm";
import InlineItemEditor from "@/components/tree/InlineItemEditor";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import { useT } from "@/i18n/useT";
import { workingBaseReadOptions } from "@/lib/workingBaseReadOptions";
import { useEditorStore } from "@/stores/editorStore";
import type { MergePlanSummary, RestoreResult } from "@/types";
import type { FileHomeSource } from "@/types/source";
import {
  FileHomeDetailField,
  FileHomeDetailsGrid,
  FILE_HOME_MANAGEMENT_GRID_CLASS,
  FileHomeSection,
  HomeDetailsSection,
  HomeFeedbackStack,
  HomeStatisticsSection,
  FileHomeLayout,
  FileHomeManagementButton,
  FileHomeManagementPanel,
  FileHomeNotice,
  fileHomeClassLabel,
  fileHomeCompatibilityLabel,
  fileHomeDetailValue,
  formatFileHomeBytes,
  formatFileHomeTimestamp,
  normalizeFileHomeLabel,
} from "@/components/editor/FileHomeBlocks";

type FileHomeViewProps = {
  bridgeBaseUrl: string;
  onClose: () => void;
  source: FileHomeSource;
};

function MergePlanCard({ plan }: { plan: MergePlanSummary }) {
  return (
    <FileHomeSection
      description={`Merge into ${plan.target_display_name}.`}
      title="Merge Plan"
    >
      <FileHomeDetailsGrid className="md:grid-cols-3">
        <FileHomeDetailField label="New Pages" value={String(plan.new_page_count)} />
        <FileHomeDetailField label="New Edges" value={String(plan.new_link_count)} />
        <FileHomeDetailField label="Already Present" value={String(plan.already_present_count)} />
        <FileHomeDetailField label="Incoming" value={String(plan.incoming_page_count)} />
        <FileHomeDetailField label="Duplicate Candidates" value={String(plan.duplicate_candidate_count)} />
        <FileHomeDetailField label="Blocked Conflicts" value={String(plan.blocked_conflict_count)} />
      </FileHomeDetailsGrid>
      {plan.provenance_coverage_summary ? (
        <p className="text-muted-foreground mt-3 text-xs">{plan.provenance_coverage_summary}</p>
      ) : null}
    </FileHomeSection>
  );
}

export default function FileHomeView({ bridgeBaseUrl, onClose, source }: FileHomeViewProps) {
  const t = useT();
  const locale = useUiPreferencesStore((state) => state.locale);
  const { activeSource } = useDesktopShellContext();
  const workingBaseRef = workingBaseReadOptions(activeSource)?.baseRef;
  const basesQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["bases", bridgeBaseUrl],
    queryFn: () => fetchBases(bridgeBaseUrl),
  });
  const activeLocalBaseRef =
    basesQuery.data?.active_base === undefined
      ? undefined
      : `local:${basesQuery.data.active_base.entry_id}`;
  const artifactBaseRef = source.sourceBaseRef ?? workingBaseRef;
  const targetBaseRef = activeLocalBaseRef ?? workingBaseRef;
  const queryClient = useQueryClient();
  const retargetFileHomeSource = useEditorStore((state) => state.retargetFileHomeSource);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const [pendingManagementAction, setPendingManagementAction] = useState<
    "delete" | "merge" | "register" | "restore" | null
  >(null);
  const [hasAutoExpandedRestore, setHasAutoExpandedRestore] = useState(false);
  const [isRenamingArtifact, setIsRenamingArtifact] = useState(false);
  const [mergePlan, setMergePlan] = useState<MergePlanSummary | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [allowBaseReplacement, setAllowBaseReplacement] = useState(false);
  const hasInspectablePath = source.path.trim().length > 0;

  const inspectionQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0 && hasInspectablePath,
    queryKey: ["artifact-inspection", bridgeBaseUrl, source.path] as const,
    queryFn: () => inspectArtifact(bridgeBaseUrl, source.path),
    retry: false,
  });
  const desktopActivationQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-activation", bridgeBaseUrl] as const,
    queryFn: () => fetchDesktopActivation(bridgeBaseUrl),
    retry: false,
    staleTime: 10_000,
  });

  const inspection = inspectionQuery.data ?? null;
  const multiBaseUsable = desktopActivationQuery.data?.usableCapabilities.multiBase === true;
  const canRegister = multiBaseUsable && (inspection?.valid_actions.includes("register_as_base") ?? false);
  const canMerge = multiBaseUsable && (inspection?.valid_actions.includes("merge_into_active") ?? false);
  const canRestore = inspection?.valid_actions.includes("restore") ?? false;
  const canDelete =
    source.managementScope === "managed_backup" || source.managementScope === "managed_export";
  const canRename = canDelete;
  const isCompatible = inspection?.compatibility === "ready";
  const shouldAutoExpandRestore =
    !multiBaseUsable && source.managementScope === "external_file" && canRestore;
  const artifactId = inspection?.artifact_id ?? null;
  const artifactTitle =
    source.subjectKind === "export_artifact"
      ? inspection?.package_label ?? source.label
      : source.filename ?? source.label;
  const headerTitle = artifactTitle || inspection?.display_name || source.label;
  const headerBadgeLabel = fileHomeClassLabel(inspection?.artifact_class, source.subjectKind, t);
  const compatibilityLabel = fileHomeCompatibilityLabel(inspection?.compatibility, t);
  const coverageLabel = normalizeFileHomeLabel(
    inspection?.attachment_coverage_label,
    t("common.unavailable"),
  );
  const unembeddedNotesCount =
    inspection?.unembedded_count !== null && inspection?.unembedded_count !== undefined
      ? String(inspection.unembedded_count)
      : t("common.unavailable");
  const orphanedNotesCount =
    inspection?.orphan_count !== null && inspection?.orphan_count !== undefined
      ? String(inspection.orphan_count)
      : t("common.unavailable");
  const dueReviewNotesCount =
    inspection?.due_for_review_count !== null && inspection?.due_for_review_count !== undefined
      ? String(inspection.due_for_review_count)
      : t("common.unavailable");
  const summaryText =
    inspection?.summary ??
    (!hasInspectablePath
      ? "This file home is missing a resolved filesystem path, so inspect details are unavailable until the runtime provides one."
      : "Inspect file-level classification, compatibility, provenance, and allowed actions without switching the active base.");
  const notesMetricValue =
    inspection?.active_page_count !== null && inspection?.active_page_count !== undefined
      ? String(inspection.active_page_count)
      : String(inspection?.page_count ?? t("common.unavailable"));
  const notesMetricDetail =
    inspection?.page_count !== null && inspection?.page_count !== undefined
      ? t("fileHome.metricDetail.notesActiveTotal", {
          active: inspection?.active_page_count ?? inspection.page_count,
          total: inspection.page_count,
        })
      : t("fileHome.metricDetail.notesInFile");
  const detailLeftFields = [
    {
      action: (
        <ActionButton
          ariaLabel={copiedPath ? t("fileHome.detail.pathCopied") : t("fileHome.detail.copyPath")}
          icon={
            copiedPath ? (
              <CopySuccessIcon className="h-3.5 w-3.5" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5" />
            )
          }
          onClick={copyPath}
          title={copiedPath ? t("fileHome.detail.pathCopied") : t("fileHome.detail.copyPath")}
        />
      ),
      label: t("fileHome.detail.path"),
      mono: true,
      value: source.path,
    },
    {
      label: t("fileHome.detail.provenance"),
      compactValue: true,
      value: fileHomeDetailValue(inspection?.provenance_summary, t),
    },
  ];
  const detailRightFields = [
    { label: t("fileHome.detail.kind"), value: headerBadgeLabel },
    { label: t("fileHome.detail.compatibility"), value: compatibilityLabel },
    {
      label: t("fileHome.detail.created"),
      compactValue: true,
      value: fileHomeDetailValue(formatFileHomeTimestamp(inspection?.created_at, t, locale), t),
    },
    {
      label: t("fileHome.detail.packageLabel"),
      value: fileHomeDetailValue(inspection?.package_label, t),
    },
  ];
  const detailAdvancedFields = [
    { label: t("fileHome.detail.baseId"), mono: true, value: fileHomeDetailValue(inspection?.base_id, t) },
    { label: t("fileHome.detail.artifactId"), mono: true, value: fileHomeDetailValue(inspection?.artifact_id, t) },
    {
      label: t("fileHome.detail.sourceBaseId"),
      mono: true,
      value: fileHomeDetailValue(inspection?.source_base_id, t),
    },
    {
      label: t("fileHome.detail.schemaVersion"),
      value: inspection?.schema_version ? String(inspection.schema_version) : t("common.unavailable"),
    },
    { label: t("fileHome.detail.attachmentCoverage"), value: coverageLabel },
    {
      label: t("fileHome.detail.artifactSchemaFamily"),
      value: fileHomeDetailValue(inspection?.artifact_schema_family, t),
    },
    {
      label: t("fileHome.detail.artifactSchemaVersion"),
      value:
        inspection?.artifact_schema_version !== null &&
        inspection?.artifact_schema_version !== undefined
          ? String(inspection.artifact_schema_version)
          : t("common.unavailable"),
    },
    {
      label: t("fileHome.detail.errors"),
      value: inspection && inspection.errors.length > 0 ? inspection.errors.join(" | ") : t("common.none"),
    },
  ];
  const primaryMetrics = [
    {
      detail: notesMetricDetail,
      icon: <NoteIcon className="h-4 w-4" />,
      label: t("fileHome.metric.notes"),
      value: notesMetricValue,
    },
    {
      detail: t("fileHome.metricDetail.edgesInFile"),
      icon: <LinkBridgeIcon className="h-4 w-4" />,
      label: t("fileHome.metric.edges"),
      value: String(inspection?.link_count ?? t("common.unavailable")),
    },
    {
      detail: t("fileHome.metricDetail.sqliteSize"),
      icon: <DatabaseIcon className="h-4 w-4" />,
      label: t("fileHome.metric.size"),
      value: formatFileHomeBytes(source.sizeBytes, t),
    },
  ];
  const secondaryMetrics = [
    {
      detail: t("fileHome.metricDetail.unembedded"),
      icon: <NoteIcon className="h-4 w-4" />,
      label: t("fileHome.metric.unembedded"),
      value: unembeddedNotesCount,
    },
    {
      detail: t("fileHome.metricDetail.orphaned"),
      icon: <WarningIcon className="h-4 w-4" />,
      label: t("fileHome.metric.orphaned"),
      value: orphanedNotesCount,
    },
    {
      detail: t("fileHome.metricDetail.dueReview"),
      icon: <InformationIcon className="h-4 w-4" />,
      label: t("fileHome.metric.dueReview"),
      value: dueReviewNotesCount,
    },
  ];

  useEffect(() => {
    setHasAutoExpandedRestore(false);
  }, [source.path]);

  useEffect(() => {
    if (hasAutoExpandedRestore || !shouldAutoExpandRestore || pendingManagementAction !== null) {
      return;
    }
    setPendingManagementAction("restore");
    setHasAutoExpandedRestore(true);
  }, [hasAutoExpandedRestore, pendingManagementAction, shouldAutoExpandRestore]);

  async function refreshAfterMutation(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: ["bases", bridgeBaseUrl],
    });
    await queryClient.invalidateQueries({
      queryKey: ["backups", bridgeBaseUrl],
    });
    await queryClient.invalidateQueries({
      queryKey: ["exports", bridgeBaseUrl],
    });
    await inspectionQuery.refetch();
  }

  async function markCachesStaleAfterRestore(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: ["bases", bridgeBaseUrl],
      refetchType: "none",
    });
    await queryClient.invalidateQueries({
      queryKey: ["backups", bridgeBaseUrl],
      refetchType: "none",
    });
    await queryClient.invalidateQueries({
      queryKey: ["exports", bridgeBaseUrl],
      refetchType: "none",
    });
  }

  async function handleRegister(): Promise<void> {
    if (!inspection || !canRegister) {
      return;
    }
    setPendingManagementAction(null);
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const entry = await registerBase(bridgeBaseUrl, {
        path: source.path,
        display_name: inspection.package_label ?? inspection.display_name ?? source.label,
        activate: false,
      });
      setActionNotice(`Registered as base "${entry.display_name}".`);
      await refreshAfterMutation();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleLoadMergePlan(): Promise<void> {
    if (!canMerge || !isCompatible) {
      return;
    }
    setPendingManagementAction("merge");
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const plan = await fetchMergePlan(bridgeBaseUrl, source.path, targetBaseRef);
      setMergePlan(plan);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Merge planning failed");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleExecuteMerge(): Promise<void> {
    if (!mergePlan) {
      return;
    }
    setPendingManagementAction(null);
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const outcome = await executeMerge(bridgeBaseUrl, source.path, targetBaseRef);
      setMergePlan(null);
      setActionNotice(
        `Merged ${outcome.inserted_page_count} pages and ${outcome.inserted_link_count} edges into the active base.`,
      );
      await refreshAfterMutation();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Merge failed");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleRestoreBackup(): Promise<void> {
    if (!canRestore) {
      return;
    }
    setPendingManagementAction(null);
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    setRestoreResult(null);
    try {
      const result = await restoreBackup(
        bridgeBaseUrl,
        { path: source.path, filename: source.filename ?? undefined, allowBaseReplacement },
        false,
        targetBaseRef,
      );
      setRestoreResult(result);
      setActionNotice(`Restored the active base from ${source.filename ?? headerTitle}.`);
      await markCachesStaleAfterRestore();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleRenameArtifact(nextName: string): Promise<void> {
    if (!canRename || !source.filename) {
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      let nextPath = source.path;
      let nextFilename = nextName;
      if (source.managementScope === "managed_backup") {
        const renamed = await renameBackup(
          bridgeBaseUrl,
          source.filename,
          nextName,
          artifactBaseRef,
        );
        nextPath = renamed.path ?? source.path;
        nextFilename = renamed.filename;
      } else if (source.managementScope === "managed_export") {
        const renamed = await renameExport(
          bridgeBaseUrl,
          source.filename,
          nextName,
          artifactBaseRef,
        );
        nextPath = renamed.path;
        nextFilename = renamed.filename;
      }
      const nextSourceId =
        source.managementScope === "managed_backup"
          ? `backup:${nextPath}`
          : source.managementScope === "managed_export"
            ? `export:${nextPath}`
            : `external-file:${nextPath}`;
      const nextSource: FileHomeSource = {
        ...source,
        id: nextSourceId,
        label: nextFilename,
        filename: nextFilename,
        path: nextPath,
      };
      retargetFileHomeSource(source.path, nextSource);
      setIsRenamingArtifact(false);
      setActionNotice(`Renamed artifact to "${nextFilename}".`);
      await refreshAfterMutation();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Rename failed");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleDeleteArtifact(): Promise<void> {
    if (!canDelete || !source.filename) {
      return;
    }
    setPendingManagementAction(null);
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      if (source.managementScope === "managed_backup") {
        await deleteBackup(bridgeBaseUrl, source.filename, artifactBaseRef);
      } else if (source.managementScope === "managed_export") {
        await deleteExport(bridgeBaseUrl, source.filename, artifactBaseRef);
      }
      await refreshAfterMutation();
      onClose();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  function copyArtifactId(): void {
    if (!artifactId) {
      return;
    }
    void navigator.clipboard.writeText(artifactId);
    setActionError(null);
    setActionNotice("Copied artifact_id.");
  }

  function copyPath(): void {
    void navigator.clipboard.writeText(source.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 1500);
  }

  return (
    <FileHomeLayout
      badgeLabel={headerBadgeLabel}
      management={
        inspection ? (
          <FileHomeManagementPanel>
            <p className="text-muted-foreground text-xs leading-5">
              {t("fileHome.management.descriptionArtifact")}
            </p>
            <div className={FILE_HOME_MANAGEMENT_GRID_CLASS}>
              {multiBaseUsable ? (
                <FileHomeManagementButton
                  disabled={isSubmittingAction || !canRegister}
                  onClick={() => {
                    setIsRenamingArtifact(false);
                    setMergePlan(null);
                    setPendingManagementAction((current) =>
                      current === "register" ? null : "register",
                    );
                  }}
                >
                  <RegisterBaseIcon className="h-4 w-4" />
                  <span>{t("fileHome.management.action.registerNewDb")}</span>
                </FileHomeManagementButton>
              ) : null}
              <FileHomeManagementButton
                disabled={isSubmittingAction || !canRestore}
                onClick={() => {
                  setIsRenamingArtifact(false);
                  setMergePlan(null);
                  setPendingManagementAction((current) =>
                    current === "restore" ? null : "restore",
                  );
                }}
              >
                <DatabaseIcon className="h-4 w-4" />
                <span>{t("fileHome.management.action.replaceActiveDb")}</span>
              </FileHomeManagementButton>
              {multiBaseUsable ? (
                <FileHomeManagementButton
                  disabled={isSubmittingAction || !canMerge || !isCompatible}
                  onClick={() => {
                    setIsRenamingArtifact(false);
                    if (pendingManagementAction === "merge" && mergePlan) {
                      setPendingManagementAction(null);
                      setMergePlan(null);
                      return;
                    }
                    void handleLoadMergePlan();
                  }}
                >
                  <MergeIntoBaseIcon className="h-4 w-4" />
                  <span>{t("fileHome.management.action.mergeIntoActiveDb")}</span>
                </FileHomeManagementButton>
              ) : null}
              <FileHomeManagementButton
                disabled={!artifactId}
                onClick={copyArtifactId}
              >
                <CopyIcon className="h-4 w-4" />
                <span>{t("fileHome.management.action.copyArtifactId")}</span>
              </FileHomeManagementButton>
              <FileHomeManagementButton
                disabled={isSubmittingAction || !canRename}
                onClick={() => {
                  setPendingManagementAction(null);
                  setMergePlan(null);
                  setIsRenamingArtifact((current) => !current);
                }}
              >
                <EditIcon className="h-4 w-4" />
                <span>{t("fileHome.management.action.rename")}</span>
              </FileHomeManagementButton>
              <FileHomeManagementButton
                disabled={isSubmittingAction || !canDelete}
                onClick={() => {
                  setIsRenamingArtifact(false);
                  setMergePlan(null);
                  setPendingManagementAction((current) =>
                    current === "delete" ? null : "delete",
                  );
                }}
              >
                <DeleteIcon className="h-4 w-4" />
                <span>{t("fileHome.management.action.delete")}</span>
              </FileHomeManagementButton>
            </div>
            {pendingManagementAction === "restore" && canRestore ? (
              <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-destructive">
                <div className="flex items-start gap-3">
                  <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      Replace the active DB with {source.filename ?? headerTitle}?
                    </div>
                    <p className="mt-1 text-sm text-destructive/90">
                      Restore replaces the current active base contents. A pre-restore safety backup is created automatically first.
                    </p>
                    <label className="mt-3 flex items-start gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={allowBaseReplacement}
                        onChange={(event) => setAllowBaseReplacement(event.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        Allow replacing the current base even if this snapshot belongs to a different base identity.
                      </span>
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRestoreBackup()}
                    disabled={isSubmittingAction}
                    className="inline-flex items-center gap-2 rounded-md border border-destructive/35 bg-destructive px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckIcon className="h-4 w-4" />
                    <span>{isSubmittingAction ? "Replacing…" : "Confirm Replace Active DB"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingManagementAction(null)}
                    disabled={isSubmittingAction}
                    className="inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive transition hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XIcon className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : null}
            {pendingManagementAction === "register" && canRegister ? (
              <InlineConfirm
                actionName={
                  isSubmittingAction
                    ? t("fileHome.confirm.registerPending")
                    : t("fileHome.confirm.registerAction")
                }
                label={t("fileHome.confirm.registerAsNewDb", { name: headerTitle })}
                confirmLabel={
                  isSubmittingAction
                    ? t("fileHome.confirm.registerPending")
                    : t("fileHome.confirm.registerAction")
                }
                cancelLabel={t("common.cancel")}
                icon={<WarningIcon className="h-3.5 w-3.5" />}
                isSubmitting={isSubmittingAction}
                subjectName={headerTitle}
                onConfirm={() => void handleRegister()}
                onCancel={() => setPendingManagementAction(null)}
                tone="warning"
              />
            ) : null}
            {pendingManagementAction === "delete" && canDelete ? (
              <InlineConfirm
                actionName={
                  isSubmittingAction
                    ? t("fileHome.confirm.deletePending")
                    : t("fileHome.confirm.deleteAction")
                }
                label={t("fileHome.confirm.deleteArtifact", { name: source.filename ?? headerTitle })}
                confirmLabel={
                  isSubmittingAction
                    ? t("fileHome.confirm.deletePending")
                    : t("fileHome.confirm.deleteAction")
                }
                cancelLabel={t("common.cancel")}
                icon={<WarningIcon className="h-3.5 w-3.5" />}
                isSubmitting={isSubmittingAction}
                subjectName={source.filename ?? headerTitle}
                onConfirm={() => void handleDeleteArtifact()}
                onCancel={() => setPendingManagementAction(null)}
                tone="danger"
              />
            ) : null}
            {pendingManagementAction === "merge" && mergePlan ? (
              <InlineConfirm
                actionName={
                  isSubmittingAction
                    ? t("fileHome.confirm.mergePending")
                    : t("fileHome.confirm.mergeAction")
                }
                label={t("fileHome.confirm.mergePlan", {
                  pages: mergePlan.incoming_page_count,
                  edges: mergePlan.new_link_count,
                  target: mergePlan.target_display_name,
                })}
                confirmLabel={
                  isSubmittingAction
                    ? t("fileHome.confirm.mergePending")
                    : t("fileHome.confirm.mergeAction")
                }
                cancelLabel={t("common.cancel")}
                icon={<WarningIcon className="h-3.5 w-3.5" />}
                isSubmitting={isSubmittingAction}
                subjectName={mergePlan.target_display_name}
                onConfirm={() => void handleExecuteMerge()}
                onCancel={() => {
                  setPendingManagementAction(null);
                  setMergePlan(null);
                }}
                tone="danger"
              />
            ) : null}
            {isRenamingArtifact && canRename ? (
              <InlineItemEditor
                initialValue={source.filename ?? headerTitle}
                placeholder={t("fileHome.confirm.renameArtifactPlaceholder")}
                confirmLabel={
                  isSubmittingAction
                    ? t("fileHome.confirm.renamePending")
                    : t("fileHome.confirm.renameAction")
                }
                cancelLabel={t("common.cancel")}
                isSubmitting={isSubmittingAction}
                onConfirm={(value) => void handleRenameArtifact(value)}
                onCancel={() => setIsRenamingArtifact(false)}
                tone="warning"
              />
            ) : null}
            {!multiBaseUsable ? (
              <p className="text-muted-foreground text-xs leading-5">
                Free edition keeps a single working DB. You can inspect this file and replace the
                current DB, but registering or merging another DB requires multi-base capability.
              </p>
            ) : null}
            <HomeFeedbackStack error={actionError} notice={actionNotice} />
          </FileHomeManagementPanel>
        ) : null
      }
      subtitle={summaryText}
      title={headerTitle}
    >
      {inspectionQuery.isLoading ? (
        <FileHomeNotice tone="warning">Inspecting file…</FileHomeNotice>
      ) : null}

      {!hasInspectablePath ? (
        <FileHomeNotice tone="error">
          Could not resolve a filesystem path for this file. Refresh the runtime or reopen the row after the bridge serves backup paths.
        </FileHomeNotice>
      ) : null}

      {inspectionQuery.error ? (
        <FileHomeNotice tone="error">
          {inspectionQuery.error instanceof Error ? inspectionQuery.error.message : "Inspection failed"}
        </FileHomeNotice>
      ) : null}

      {inspection ? (
        <>
          <HomeDetailsSection
            advancedFields={detailAdvancedFields}
            leftFields={detailLeftFields}
            rightFields={detailRightFields}
          />

          <HomeStatisticsSection
            primaryMetrics={primaryMetrics}
            secondaryMetrics={secondaryMetrics}
          />

          {restoreResult ? (
            <FileHomeSection className="border-emerald-500/25 bg-emerald-500/10" title="Restore Complete">
              <FileHomeDetailsGrid>
                <FileHomeDetailField label="Restored From" value={restoreResult.restored_from} mono />
                <FileHomeDetailField
                  label="Restored From Path"
                  value={fileHomeDetailValue(restoreResult.restored_from_path)}
                  mono
                />
                <FileHomeDetailField
                    label="Pre-Restore Backup"
                    value={fileHomeDetailValue(restoreResult.pre_restore_backup)}
                    mono
                  />
              </FileHomeDetailsGrid>
            </FileHomeSection>
          ) : null}

          {mergePlan ? <MergePlanCard plan={mergePlan} /> : null}
        </>
      ) : null}
    </FileHomeLayout>
  );
}
