import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchDesktopActivation, runManualEmbed } from "@/api";
import {
  createBackup,
  deleteBase,
  fetchBases,
  inspectArtifact,
  renameBase,
  setBaseAgentAccessMode,
  switchBase,
  unregisterBase,
} from "@/api/baseManagementApi";
import {
  AgentVisibilityOffIcon,
  AgentVisibilityOnIcon,
  CheckIcon,
  CopyIcon,
  CopySuccessIcon,

  CircleCloseIcon,
  DatabaseIcon,
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  InformationIcon,
  LinkBridgeIcon,
  MergeIntoBaseIcon,
  NoteIcon,
  ShareBaseIcon,
  WarningIcon,
  XIcon,
} from "@/components/icons/Icons";
import {
  HomeDetailsSection,
  HomeFeedbackStack,
  HomeStatisticsSection,
  FILE_HOME_MANAGEMENT_GRID_CLASS,
  FileHomeLayout,
  FileHomeManagementButton,
  FileHomeManagementPanel,
  FileHomeNotice,
  fileHomeCompatibilityLabel,
  fileHomeHeaderActivateButtonClassName,
  fileHomeDetailValue,
  formatFileHomeBytes,
  formatFileHomeTimestamp,
  normalizeFileHomeLabel,
} from "@/components/editor/FileHomeBlocks";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import InlineConfirm from "@/components/tree/InlineConfirm";
import InlineItemEditor from "@/components/tree/InlineItemEditor";
import CopyableId from "@/components/ui/CopyableId";
import type { Translator } from "@/i18n/translate";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils/cn";
import { useUiPreferencesStore } from "@/stores/uiPreferencesStore";
import { useEditorStore } from "@/stores/editorStore";
import { useSharingStore } from "@/stores/sharingStore";
import type { AgentAccessMode, ArtifactInspection, BaseRegistryEntry } from "@/types";
import type { SourceInspectContext, SourceTabMode } from "@/types/editor/EditorTabItem";
import type { LocalBaseSource } from "@/types/source";

type LocalBaseHomeViewProps = {
  bridgeBaseUrl: string;
  inspectContext?: SourceInspectContext;
  mode?: SourceTabMode;
  onClose: () => void;
  source: LocalBaseSource;
};

type PendingManagementAction = "backup" | "merge" | "share" | "cycle-agent-access";

function resolveAgentAccessMode(entry: BaseRegistryEntry): AgentAccessMode {
  if (
    entry.agent_access_mode === "write"
    || entry.agent_access_mode === "read"
    || entry.agent_access_mode === "hidden"
  ) {
    return entry.agent_access_mode;
  }
  return entry.visible_in_mcp === false ? "hidden" : "write";
}

function nextAgentAccessMode(mode: AgentAccessMode): AgentAccessMode {
  if (mode === "write") {
    return "read";
  }
  if (mode === "read") {
    return "hidden";
  }
  return "write";
}

function agentAccessActionLabel(mode: AgentAccessMode, translate: Translator): string {
  if (mode === "read") {
    return translate("bases.tooltips.agentAccessRead");
  }
  if (mode === "hidden") {
    return translate("bases.tooltips.agentAccessHidden");
  }
  return translate("bases.tooltips.agentAccessWrite");
}

export default function LocalBaseHomeView({
  bridgeBaseUrl,
  inspectContext,
  mode = "active",
  onClose,
  source,
}: LocalBaseHomeViewProps) {
  const t = useT();
  const locale = useUiPreferencesStore((state) => state.locale);
  const { activeSource, onActivateSource } = useDesktopShellContext();
  const openBaseSharing = useEditorStore((state) => state.openBaseSharing);
  const requestBaseSharePanelFocus = useSharingStore((state) => state.requestBaseSharePanelFocus);
  const openSourceTab = useEditorStore((state) => state.openSource);
  const queryClient = useQueryClient();
  const [isRenaming, setIsRenaming] = useState(false);
  const [isConfirmingUnregister, setIsConfirmingUnregister] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [pendingManagementAction, setPendingManagementAction] = useState<PendingManagementAction | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copiedBaseId, setCopiedBaseId] = useState(false);
  const isInspectMode = mode === "inspect";

  const basesQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["bases", bridgeBaseUrl] as const,
    queryFn: () => fetchBases(bridgeBaseUrl),
    refetchInterval: 30_000,
  });
  const desktopActivationQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-activation", bridgeBaseUrl] as const,
    queryFn: () => fetchDesktopActivation(bridgeBaseUrl),
    retry: false,
    staleTime: 10_000,
  });
  const activeBaseEntry = useMemo<BaseRegistryEntry | null>(() => {
    const activeBase = basesQuery.data?.active_base ?? null;
    if (activeBase?.entry_id === source.entryId) {
      return activeBase;
    }
    return basesQuery.data?.items.find((entry) => entry.entry_id === source.entryId) ?? null;
  }, [basesQuery.data?.active_base, basesQuery.data?.items, source.entryId]);

  const baseStats = activeBaseEntry?.stats ?? source.stats ?? null;
  const resolvedPath = inspectContext?.path ?? activeBaseEntry?.path ?? null;
  const notesMetricValue =
    baseStats?.active_page_count !== null && baseStats?.active_page_count !== undefined
      ? String(baseStats.active_page_count)
      : baseStats?.page_count !== null && baseStats?.page_count !== undefined
        ? String(baseStats.page_count)
        : t("common.unavailable");
  const notesMetricDetail =
    baseStats?.page_count !== null && baseStats?.page_count !== undefined
      ? t("fileHome.metricDetail.notesActiveTotal", {
          active: baseStats.active_page_count ?? baseStats.page_count,
          total: baseStats.page_count,
        })
      : basesQuery.isPending
        ? t("fileHome.metricDetail.notesLoading")
        : t("fileHome.metricDetail.notesUnavailable");
  const inspectSummaryQuery = useQuery<ArtifactInspection>({
    enabled: bridgeBaseUrl.length > 0 && resolvedPath !== null,
    queryKey: ["base-home-inspect-summary", bridgeBaseUrl, resolvedPath] as const,
    queryFn: () => inspectArtifact(bridgeBaseUrl, resolvedPath ?? ""),
    retry: false,
  });
  const inspectSummary = inspectSummaryQuery.data ?? null;
  const isShownBaseActive = activeBaseEntry?.is_active ?? inspectContext?.isActive ?? false;
  const usableCapabilities = desktopActivationQuery.data?.usableCapabilities;
  const multiBaseUsable = usableCapabilities?.multiBase === true;
  const shareBaseUsable = usableCapabilities?.shareBase === true;
  const mcpVisibilityUsable = usableCapabilities?.managedPublicMcp === true;
  const agentAccessMode = activeBaseEntry
    ? resolveAgentAccessMode(activeBaseEntry)
    : "write";
  const nextAgentAccessModeValue = nextAgentAccessMode(agentAccessMode);
  const sourceLabel = activeBaseEntry?.display_name ?? source.label;
  const compatibilityLabel = fileHomeCompatibilityLabel(inspectSummary?.compatibility, t);
  const coverageLabel = normalizeFileHomeLabel(
    inspectSummary?.attachment_coverage_label,
    t("common.unavailable"),
  );
  const unembeddedNotesCount =
    baseStats?.unembedded_count !== null && baseStats?.unembedded_count !== undefined
      ? String(baseStats.unembedded_count)
      : t("common.unavailable");
  const orphanedNotesCount =
    baseStats?.orphan_count !== null && baseStats?.orphan_count !== undefined
      ? String(baseStats.orphan_count)
      : t("common.unavailable");
  const dueReviewNotesCount =
    baseStats?.due_for_review_count !== null && baseStats?.due_for_review_count !== undefined
      ? String(baseStats.due_for_review_count)
      : t("common.unavailable");
  const headerSubtitle = isInspectMode
    ? t("fileHome.layout.subtitle.localBaseInspect")
    : t("fileHome.layout.subtitle.localBaseActive");
  const manualEmbedMutation = useMutation({
    mutationFn: () =>
      runManualEmbed(bridgeBaseUrl, { baseRef: `local:${source.entryId}` }),
    onSuccess: async () => {
      await refreshBaseRegistry();
      if (resolvedPath !== null) {
        await queryClient.invalidateQueries({
          queryKey: ["base-home-inspect-summary", bridgeBaseUrl, resolvedPath] as const,
        });
      }
      setActionError(null);
      setActionNotice(t("fileHome.embedAction.success", { label: sourceLabel }));
    },
    onError: (error) => {
      setActionNotice(null);
      setActionError(error instanceof Error ? error.message : t("fileHome.embedAction.failed"));
    },
  });
  const detailLeftFields = [
    {
      action: resolvedPath ? (
        <CopyableId
          ariaLabel={t("fileHome.detail.copyPath")}
          iconOnly
          title={t("fileHome.detail.copyPath")}
          value={resolvedPath}
        />
      ) : null,
      label: t("fileHome.detail.path"),
      mono: true,
      value: resolvedPath ?? t("fileHome.detail.loadingRegistry"),
    },
    {
      label: t("fileHome.detail.provenance"),
      compactValue: true,
      value: fileHomeDetailValue(inspectSummary?.provenance_summary, t),
    },
  ];
  const detailRightFields = [
    {
      label: t("fileHome.detail.kind"),
      value: inspectSummaryQuery.isPending
        ? t("fileHome.detail.loadingShort")
        : t("fileHome.classLabel.localBase"),
    },
    { label: t("fileHome.detail.compatibility"), value: compatibilityLabel },
    {
      label: t("fileHome.detail.registered"),
      value: fileHomeDetailValue(
        formatFileHomeTimestamp(activeBaseEntry?.registered_at, t, locale),
        t,
      ),
    },
    {
      label: t("fileHome.detail.lastOpened"),
      value: fileHomeDetailValue(
        formatFileHomeTimestamp(activeBaseEntry?.last_opened_at, t, locale),
        t,
      ),
    },
  ];
  const detailAdvancedFields = [
    {
      label: t("fileHome.detail.baseId"),
      mono: true,
      value: fileHomeDetailValue(inspectSummary?.base_id ?? source.baseId, t),
    },
    {
      label: t("fileHome.detail.artifactId"),
      mono: true,
      value: fileHomeDetailValue(inspectSummary?.artifact_id, t),
    },
    {
      label: t("fileHome.detail.sourceBaseId"),
      mono: true,
      value: fileHomeDetailValue(inspectSummary?.source_base_id, t),
    },
    {
      label: t("fileHome.detail.packageLabel"),
      value: fileHomeDetailValue(inspectSummary?.package_label, t),
    },
    { label: t("fileHome.detail.attachmentCoverage"), value: coverageLabel },
    {
      label: t("fileHome.detail.created"),
      value: fileHomeDetailValue(
        formatFileHomeTimestamp(inspectSummary?.created_at, t, locale),
        t,
      ),
    },
    {
      label: t("fileHome.detail.artifactSchemaFamily"),
      value: fileHomeDetailValue(inspectSummary?.artifact_schema_family, t),
    },
    {
      label: t("fileHome.detail.artifactSchemaVersion"),
      value:
        inspectSummary?.artifact_schema_version !== null &&
        inspectSummary?.artifact_schema_version !== undefined
          ? String(inspectSummary.artifact_schema_version)
          : t("common.unavailable"),
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
      detail: t("fileHome.metricDetail.edgesInBase"),
      icon: <LinkBridgeIcon className="h-4 w-4" />,
      label: t("fileHome.metric.edges"),
      value: String(baseStats?.link_count ?? t("common.unavailable")),
    },
    {
      detail: t("fileHome.metricDetail.sqliteSize"),
      icon: <DatabaseIcon className="h-4 w-4" />,
      label: t("fileHome.metric.size"),
      value: formatFileHomeBytes(baseStats?.size_bytes, t),
    },
  ];
  const secondaryMetrics = [
    {
      detail: t("fileHome.metricDetail.unembedded"),
      icon: <NoteIcon className="h-4 w-4" />,
      label: t("fileHome.metric.unembedded"),
      valueAction:
        baseStats?.unembedded_count && baseStats.unembedded_count > 0 ? (
          <FileHomeManagementButton
            className="px-2.5 py-1.5 text-xs leading-4"
            disabled={manualEmbedMutation.isPending || !source.entryId}
            onClick={() => {
              void manualEmbedMutation.mutateAsync();
            }}
            title={t("fileHome.embedAction.tooltip")}
          >
            {manualEmbedMutation.isPending
              ? t("fileHome.embedAction.running")
              : t("fileHome.embedAction.fix")}
          </FileHomeManagementButton>
        ) : undefined,
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

  async function refreshBaseRegistry() {
    await queryClient.invalidateQueries({
      queryKey: ["bases", bridgeBaseUrl],
    });
  }

  async function ensureShellActiveBase(): Promise<boolean> {
    if (!activeBaseEntry) {
      return false;
    }
    if (activeBaseEntry.is_active) {
      if (activeSource?.id !== source.id) {
        await onActivateSource(source, { preserveCurrentTab: isInspectMode });
      }
      return false;
    }
    const switchedEntry = await switchBase(bridgeBaseUrl, activeBaseEntry.entry_id);
    await refreshBaseRegistry();
    const switchedSource: LocalBaseSource = {
      ...source,
      label: switchedEntry.display_name,
      baseId: switchedEntry.base_id,
      stats: switchedEntry.stats ?? source.stats,
    };
    await onActivateSource(switchedSource, { preserveCurrentTab: isInspectMode });
    return true;
  }

  async function handleBackupNow() {
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const switched = await ensureShellActiveBase();
      await createBackup(bridgeBaseUrl, "manual");
      await refreshBaseRegistry();
      setActionNotice(
        switched
          ? `Switched to ${source.label} and created a manual backup.`
          : `Created a manual backup for ${source.label}.`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create backup");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleCycleAgentAccess() {
    if (!activeBaseEntry || !mcpVisibilityUsable) {
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      await setBaseAgentAccessMode(
        bridgeBaseUrl,
        activeBaseEntry.entry_id,
        nextAgentAccessMode(agentAccessMode),
      );
      await refreshBaseRegistry();
      setActionNotice(
        t("fileHome.management.noticeAgentAccessUpdated", {
          name: source.label,
          mode: agentAccessActionLabel(nextAgentAccessModeValue, t),
        }),
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update agent access");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleOpenBaseSharing() {
    if (!shareBaseUsable) {
      setActionError("Sharing requires an active Pro entitlement.");
      setActionNotice(null);
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const switched = await ensureShellActiveBase();
      requestBaseSharePanelFocus("create");
      openBaseSharing();
      if (switched) {
        setActionNotice(`Switched to ${source.label} and opened base sharing.`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to prepare base sharing");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  function handleOpenMergeBase() {
    if (!resolvedPath || isShownBaseActive) {
      return;
    }
    openSourceTab(
      {
        kind: "file-home",
        id: `merge-base:${resolvedPath}`,
        label: sourceLabel,
        path: resolvedPath,
        sizeBytes: baseStats?.size_bytes ?? null,
        subjectKind: "export_artifact",
        managementScope: "external_file",
      },
      {
        mode: "inspect",
      },
    );
  }

  function stageManagementAction(action: PendingManagementAction) {
    setIsRenaming(false);
    setIsConfirmingUnregister(false);
    setIsConfirmingDelete(false);
    setActionError(null);
    setActionNotice(null);
    setPendingManagementAction(action);
  }

  async function confirmPendingManagementAction() {
    if (pendingManagementAction === null) {
      return;
    }
    const action = pendingManagementAction;
    setPendingManagementAction(null);
    if (action === "merge") {
      handleOpenMergeBase();
      return;
    }
    if (action === "share") {
      await handleOpenBaseSharing();
      return;
    }
    if (action === "backup") {
      await handleBackupNow();
      return;
    }
    await handleCycleAgentAccess();
  }

  const pendingAgentAccessLabel =
    nextAgentAccessModeValue === "read"
      ? t("fileHome.management.pendingAgentAccessToRead", { name: sourceLabel })
      : nextAgentAccessModeValue === "hidden"
        ? t("fileHome.management.pendingAgentAccessToHidden", { name: sourceLabel })
        : t("fileHome.management.pendingAgentAccessToWrite", { name: sourceLabel });
  const pendingAgentAccessDetail =
    nextAgentAccessModeValue === "read"
      ? t("fileHome.management.pendingAgentAccessToReadDetail")
      : nextAgentAccessModeValue === "hidden"
        ? t("fileHome.management.pendingAgentAccessToHiddenDetail")
        : t("fileHome.management.pendingAgentAccessToWriteDetail");
  const pendingAgentAccessConfirmLabel =
    nextAgentAccessModeValue === "read"
      ? t("fileHome.management.confirmAgentAccessToRead")
      : nextAgentAccessModeValue === "hidden"
        ? t("fileHome.management.confirmAgentAccessToHidden")
        : t("fileHome.management.confirmAgentAccessToWrite");

  const pendingManagementLabel =
    pendingManagementAction === "merge"
      ? t("fileHome.management.pendingMerge", { name: sourceLabel })
      : pendingManagementAction === "share"
        ? t("fileHome.management.pendingShare", { name: sourceLabel })
        : pendingManagementAction === "backup"
          ? t("fileHome.management.pendingBackup", { name: sourceLabel })
          : pendingManagementAction === "cycle-agent-access"
            ? pendingAgentAccessLabel
            : null;
  const pendingManagementDetail =
    pendingManagementAction === "merge"
      ? t("fileHome.management.pendingMergeDetail")
      : pendingManagementAction === "share"
        ? t("fileHome.management.pendingShareDetail")
        : pendingManagementAction === "backup"
          ? t("fileHome.management.pendingBackupDetail")
          : pendingManagementAction === "cycle-agent-access"
            ? pendingAgentAccessDetail
            : null;
  const pendingManagementConfirmLabel =
    pendingManagementAction === "merge"
      ? t("fileHome.management.confirmOpenMergeFlow")
      : pendingManagementAction === "share"
        ? t("fileHome.management.confirmShareBase")
        : pendingManagementAction === "backup"
          ? t("fileHome.management.confirmBackup")
          : pendingManagementAction === "cycle-agent-access"
            ? pendingAgentAccessConfirmLabel
            : t("fileHome.management.confirmGeneric");

  async function handleCopyBaseId() {
    setActionError(null);
    setActionNotice(null);
    try {
      await navigator.clipboard.writeText(source.baseId);
      setCopiedBaseId(true);
      setActionNotice("Copied base_id to clipboard.");
      window.setTimeout(() => {
        setCopiedBaseId(false);
      }, 1200);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to copy base_id");
    }
  }

  async function handleRenameBase(displayName: string) {
    if (!activeBaseEntry) {
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const renamedEntry = await renameBase(bridgeBaseUrl, activeBaseEntry.entry_id, displayName);
      const renamedSource: LocalBaseSource = {
        ...source,
        label: renamedEntry.display_name,
        baseId: renamedEntry.base_id,
        stats: renamedEntry.stats ?? source.stats,
      };
      await refreshBaseRegistry();
      openSourceTab(renamedSource, {
        inspectContext: isInspectMode
          ? {
              entryId: renamedEntry.entry_id,
              isActive: renamedEntry.is_active,
              openedFrom: inspectContext?.openedFrom ?? "base-tree-inspect",
              path: renamedEntry.path,
            }
          : undefined,
        mode,
      });
      if (activeSource?.id === source.id) {
        await onActivateSource(renamedSource, { preserveCurrentTab: true });
      }
      setIsRenaming(false);
      setActionNotice(`Renamed base to ${displayName}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to rename base");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleUnregisterBase() {
    if (!activeBaseEntry || isShownBaseActive) {
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      await unregisterBase(bridgeBaseUrl, activeBaseEntry.entry_id);
      await refreshBaseRegistry();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to unregister base");
    } finally {
      setIsSubmittingAction(false);
      setIsConfirmingUnregister(false);
    }
  }

  async function handleDeleteBase() {
    if (!activeBaseEntry || isShownBaseActive) {
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      await deleteBase(bridgeBaseUrl, activeBaseEntry.entry_id);
      await refreshBaseRegistry();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete base");
    } finally {
      setIsSubmittingAction(false);
      setIsConfirmingDelete(false);
    }
  }

  async function handleActivateBase() {
    if (!activeBaseEntry || isShownBaseActive) {
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const switchedEntry = await switchBase(bridgeBaseUrl, activeBaseEntry.entry_id);
      const activatedSource: LocalBaseSource = {
        ...source,
        label: switchedEntry.display_name,
        baseId: switchedEntry.base_id,
        stats: switchedEntry.stats ?? source.stats,
      };
      await refreshBaseRegistry();
      await onActivateSource(activatedSource, { preserveCurrentTab: true });
      setActionNotice(`Activated ${switchedEntry.display_name}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to activate base");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  return (
    <FileHomeLayout
      badgeLabel={t("fileHome.layout.badge.localBase")}
      headerAction={
        <button
          type="button"
          disabled={isSubmittingAction || isShownBaseActive || !multiBaseUsable || !activeBaseEntry}
          onClick={() => {
            void handleActivateBase();
          }}
          className={fileHomeHeaderActivateButtonClassName(isShownBaseActive)}
        >
          {isShownBaseActive ? t("fileHome.action.active") : t("fileHome.action.activate")}
        </button>
      }
      management={
        <FileHomeManagementPanel>
          <div className={FILE_HOME_MANAGEMENT_GRID_CLASS}>
          {multiBaseUsable ? (
            <FileHomeManagementButton
              disabled={isSubmittingAction || !resolvedPath || isShownBaseActive}
              onClick={() => {
                stageManagementAction("merge");
              }}
            >
              <MergeIntoBaseIcon className="h-4 w-4" />
              <span>{t("fileHome.management.action.mergeBase")}</span>
            </FileHomeManagementButton>
          ) : null}
          {shareBaseUsable ? (
            <FileHomeManagementButton
              disabled={isSubmittingAction || !shareBaseUsable}
              onClick={() => {
                stageManagementAction("share");
              }}
            >
              <ShareBaseIcon className="h-4 w-4" />
              <span>{t("fileHome.management.action.shareBase")}</span>
            </FileHomeManagementButton>
          ) : null}
          <FileHomeManagementButton
            disabled={isSubmittingAction}
            onClick={() => {
              stageManagementAction("backup");
            }}
          >
            <DownloadIcon className="h-4 w-4" />
            <span>{t("fileHome.management.action.backupNow")}</span>
          </FileHomeManagementButton>
          {mcpVisibilityUsable ? (
            <FileHomeManagementButton
              disabled={isSubmittingAction || !activeBaseEntry}
              onClick={() => {
                stageManagementAction("cycle-agent-access");
              }}
            >
              {agentAccessMode === "hidden" ? (
                <AgentVisibilityOffIcon className="h-4 w-4" />
              ) : (
                <AgentVisibilityOnIcon
                  className={cn(
                    "h-4 w-4",
                    agentAccessMode === "read"
                      ? "text-amber-500 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400",
                  )}
                />
              )}
              <span>{agentAccessActionLabel(agentAccessMode, t)}</span>
            </FileHomeManagementButton>
          ) : null}
          <FileHomeManagementButton
            onClick={() => {
              void handleCopyBaseId();
            }}
          >
            {copiedBaseId ? <CopySuccessIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            <span>
              {copiedBaseId
                ? t("fileHome.management.action.copyBaseIdCopied")
                : t("fileHome.management.action.copyBaseId")}
            </span>
          </FileHomeManagementButton>
          {multiBaseUsable ? (
            <FileHomeManagementButton
              disabled={isSubmittingAction || !activeBaseEntry}
              onClick={() => {
                setPendingManagementAction(null);
                setIsConfirmingUnregister(false);
                setIsConfirmingDelete(false);
                setIsRenaming((current) => !current);
              }}
            >
              <EditIcon className="h-4 w-4" />
              <span>
                {isRenaming
                  ? t("fileHome.management.action.cancelRename")
                  : t("fileHome.management.action.rename")}
              </span>
            </FileHomeManagementButton>
          ) : null}
          {multiBaseUsable ? (
            <FileHomeManagementButton
              disabled={isSubmittingAction || !activeBaseEntry || isShownBaseActive}
              onClick={() => {
                setPendingManagementAction(null);
                setIsRenaming(false);
                setIsConfirmingDelete(false);
                setIsConfirmingUnregister((current) => !current);
              }}
              title={
                isShownBaseActive
                  ? t("bases.tooltips.switchBeforeUnregister")
                  : t("bases.tooltips.unregister")
              }
            >
              <CircleCloseIcon className="h-4 w-4" />
              <span>
                {isConfirmingUnregister
                  ? t("fileHome.management.action.cancelUnregister")
                  : t("fileHome.management.action.unregister")}
              </span>
            </FileHomeManagementButton>
          ) : null}
          <FileHomeManagementButton
            disabled={isSubmittingAction || !multiBaseUsable || !activeBaseEntry || isShownBaseActive}
            onClick={() => {
              setPendingManagementAction(null);
              setIsRenaming(false);
              setIsConfirmingUnregister(false);
              setIsConfirmingDelete((current) => !current);
            }}
            title={isShownBaseActive ? t("bases.tooltips.switchBeforeDelete") : t("bases.tooltips.deleteBase")}
          >
            <DeleteIcon className="h-4 w-4" />
            <span>
              {isConfirmingDelete
                ? t("fileHome.management.action.cancelDelete")
                : t("fileHome.management.action.deleteBase")}
            </span>
          </FileHomeManagementButton>
          </div>

          {multiBaseUsable && isRenaming && activeBaseEntry ? (
            <InlineItemEditor
              confirmLabel={t("fileHome.management.action.rename")}
              cancelLabel={t("common.cancel")}
              icon={<EditIcon className="h-3.5 w-3.5" />}
              initialValue={activeBaseEntry.display_name}
              isSubmitting={isSubmittingAction}
              onCancel={() => {
                setIsRenaming(false);
              }}
              onConfirm={(value) => {
                void handleRenameBase(value);
              }}
              placeholder={t("fileHome.management.placeholderBaseName")}
              tone="danger"
            />
          ) : null}

          {pendingManagementAction && pendingManagementLabel && pendingManagementDetail ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300">
              <div className="flex items-start gap-3">
                <WarningIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {pendingManagementLabel}
                  </div>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{pendingManagementDetail}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-amber-600/40 bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/40 dark:bg-amber-500 dark:hover:bg-amber-400"
                  disabled={isSubmittingAction}
                  onClick={() => {
                    void confirmPendingManagementAction();
                  }}
                  type="button"
                >
                  <CheckIcon className="h-4 w-4" />
                  <span>{pendingManagementConfirmLabel}</span>
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-800 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300"
                  disabled={isSubmittingAction}
                  onClick={() => {
                    setPendingManagementAction(null);
                  }}
                  type="button"
                >
                  <XIcon className="h-4 w-4" />
                  <span>{t("common.cancel")}</span>
                </button>
              </div>
            </div>
          ) : null}

          {multiBaseUsable && isConfirmingUnregister && activeBaseEntry && !isShownBaseActive ? (
            <InlineConfirm
              actionName={t("fileHome.confirm.unregisterAction")}
              confirmLabel={t("fileHome.confirm.unregisterAction")}
              icon={<CircleCloseIcon className="h-3.5 w-3.5" />}
              isSubmitting={isSubmittingAction}
              label={t("fileHome.confirm.unregisterPrompt", { name: activeBaseEntry.display_name })}
              subjectIcon={<DatabaseIcon />}
              subjectName={activeBaseEntry.display_name}
              onCancel={() => {
                setIsConfirmingUnregister(false);
              }}
              onConfirm={() => {
                void handleUnregisterBase();
              }}
              tone="danger"
            />
          ) : null}

          {multiBaseUsable && isConfirmingDelete && activeBaseEntry && !isShownBaseActive ? (
            <InlineConfirm
              actionName={t("fileHome.confirm.deleteBaseAction")}
              confirmLabel={t("fileHome.confirm.deleteBaseAction")}
              isSubmitting={isSubmittingAction}
              label={t("fileHome.confirm.deleteBasePrompt", { name: activeBaseEntry.display_name })}
              subjectIcon={<DatabaseIcon />}
              subjectName={activeBaseEntry.display_name}
              onCancel={() => {
                setIsConfirmingDelete(false);
              }}
              onConfirm={() => {
                void handleDeleteBase();
              }}
              tone="danger"
            />
          ) : null}

          <HomeFeedbackStack error={actionError} notice={actionNotice} />
        </FileHomeManagementPanel>
      }
      subtitle={headerSubtitle}
      title={sourceLabel}
    >
      {basesQuery.error ? (
        <FileHomeNotice tone="error">
          {basesQuery.error instanceof Error
            ? basesQuery.error.message
            : "Could not load active base registry metadata."}
        </FileHomeNotice>
      ) : null}

      {inspectSummaryQuery.error ? (
        <FileHomeNotice tone="error">
          {inspectSummaryQuery.error instanceof Error
            ? inspectSummaryQuery.error.message
            : "Could not load base inspection summary."}
        </FileHomeNotice>
      ) : null}

      <HomeDetailsSection
        advancedFields={detailAdvancedFields}
        detailsLayout="local-base"
        leftFields={detailLeftFields}
        rightFields={detailRightFields}
      />

      <HomeStatisticsSection
        primaryMetrics={primaryMetrics}
        secondaryMetrics={secondaryMetrics}
      />


    </FileHomeLayout>
  );
}
