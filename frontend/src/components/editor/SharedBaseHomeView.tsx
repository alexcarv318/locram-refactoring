import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  backupRecipientBaseShare,
  fetchDesktopActivation,
  fetchRecipientBaseShareView,
  removeRecipientBaseShare,
  renameRecipientBaseShare,
  setRecipientBaseShareMcpVisibility,
} from "@/api";
import {
  AgentVisibilityOffIcon,
  AgentVisibilityOnIcon,
  CheckIcon,
  DatabaseIcon,
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  InformationIcon,
  LinkBridgeIcon,
  NoteIcon,
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
  fileHomeHeaderActivateButtonClassName,
  formatFileHomeBytes,
  formatFileHomeTimestamp,
  normalizeFileHomeLabel,
} from "@/components/editor/FileHomeBlocks";
import InlineConfirm from "@/components/tree/InlineConfirm";
import InlineItemEditor from "@/components/tree/InlineItemEditor";
import CopyableId from "@/components/ui/CopyableId";
import { useT } from "@/i18n/useT";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import { useUiPreferencesStore } from "@/stores/uiPreferencesStore";
import type { SourceTabMode } from "@/types/editor/EditorTabItem";
import type { SharedBaseSource } from "@/types/source";

type SharedBaseHomeViewProps = {
  bridgeBaseUrl: string;
  mode?: SourceTabMode;
  onClose: () => void;
  source: SharedBaseSource;
};

type PendingManagementAction = "backup" | "toggle-mcp";

export default function SharedBaseHomeView({
  bridgeBaseUrl,
  mode = "active",
  onClose,
  source,
}: SharedBaseHomeViewProps) {
  const t = useT();
  const activeSource = useDesktopShellContext().activeSource;
  const locale = useUiPreferencesStore((state) => state.locale);
  const queryClient = useQueryClient();
  const desktopActivationQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-activation", bridgeBaseUrl] as const,
    queryFn: () => fetchDesktopActivation(bridgeBaseUrl),
    retry: false,
    staleTime: 10_000,
  });
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [pendingManagementAction, setPendingManagementAction] =
    useState<PendingManagementAction | null>(null);
  const [renamedLabelOverride, setRenamedLabelOverride] = useState<string | null>(null);
  const [visibleInMcpOverride, setVisibleInMcpOverride] = useState<boolean | null>(null);

  const recipientShareViewQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0 && source.recipientActorRef.length > 0,
    queryKey: [
      "recipient-base-share-view",
      bridgeBaseUrl,
      source.recipientActorRef,
      source.grantId,
    ] as const,
    queryFn: async () => {
      const items = await fetchRecipientBaseShareView(bridgeBaseUrl, {
        recipientActorRef: source.recipientActorRef,
        includeInactive: true,
      });
      return items.find((item) => item.grant_id === source.grantId) ?? null;
    },
    retry: false,
    staleTime: 10_000,
  });
  const baseStats =
    recipientShareViewQuery.data?.base_stats ?? source.baseStats ?? null;
  const sharedGrantView = recipientShareViewQuery.data;
  const remoteStatsUnavailable =
    recipientShareViewQuery.isFetched &&
    baseStats === null &&
    sharedGrantView != null &&
    sharedGrantView.authority_available !== true;
  const hasAdminAccess = source.permission === "admin";
  const authorityPath = source.authorityDbPath ?? null;
  const backupAvailable = hasAdminAccess && authorityPath !== null;
  const currentLabel = renamedLabelOverride ?? source.label;
  const isShownBaseActive =
    mode === "active" &&
    activeSource?.kind === "shared-base" &&
    activeSource.grantId === source.grantId;
  const headerSubtitle = isShownBaseActive
    ? t("fileHome.layout.subtitle.sharedBaseActive")
    : t("fileHome.layout.subtitle.sharedBaseInspect");
  const isMcpVisible = visibleInMcpOverride ?? (source.visibleInMcp !== false);
  const mcpVisibilityUsable =
    desktopActivationQuery.data?.usableCapabilities.managedPublicMcp === true;

  useEffect(() => {
    setRenamedLabelOverride(null);
    setVisibleInMcpOverride(null);
  }, [source.grantId, source.label, source.visibleInMcp]);

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
      : t("fileHome.metricDetail.notesInSharedBase");
  const unembeddedNotesCount =
    baseStats?.unembedded_count !== null && baseStats?.unembedded_count !== undefined
      ? String(baseStats.unembedded_count)
      : t("common.unavailable");
  const orphanedNotesCount =
    baseStats?.orphan_count !== null && baseStats?.orphan_count !== undefined
      ? String(baseStats.orphan_count)
      : t("common.unavailable");
  const dueReviewNotesCount =
    baseStats?.due_for_review_count !== null &&
    baseStats?.due_for_review_count !== undefined
      ? String(baseStats.due_for_review_count)
      : t("common.unavailable");
  const pendingManagementLabel =
    pendingManagementAction === "backup"
      ? t("fileHome.management.pendingBackup", { name: currentLabel })
      : pendingManagementAction === "toggle-mcp"
        ? isMcpVisible
          ? t("fileHome.management.pendingHide", { name: currentLabel })
          : t("fileHome.management.pendingShow", { name: currentLabel })
        : null;
  const pendingManagementDetail =
    pendingManagementAction === "backup"
      ? t("fileHome.management.pendingBackupDetailShared")
      : pendingManagementAction === "toggle-mcp"
        ? isMcpVisible
          ? t("fileHome.management.pendingHideDetailShared")
          : t("fileHome.management.pendingShowDetailShared")
        : null;
  const pendingManagementConfirmLabel =
    pendingManagementAction === "backup"
      ? t("fileHome.management.confirmBackup")
      : pendingManagementAction === "toggle-mcp"
        ? isMcpVisible
          ? t("fileHome.management.confirmHideFromAgent")
          : t("fileHome.management.confirmShowToAgent")
        : t("fileHome.management.confirmGeneric");
  function copyableIdentityAction(
    rawValue: string | null | undefined,
    label: string,
  ) {
    const copyValue = rawValue?.trim();
    if (!copyValue) {
      return undefined;
    }
    return (
      <CopyableId
        ariaLabel={t("common.copyAction", { label })}
        iconOnly
        title={t("common.copyAction", { label })}
        value={copyValue}
      />
    );
  }
  const detailIdentityFields = [
    {
      action: copyableIdentityAction(source.shareBaseId, t("fileHome.detail.baseId")),
      label: t("fileHome.detail.baseId"),
      value: source.shareBaseId,
      mono: true,
    },
    {
      action: copyableIdentityAction(source.entryId, t("fileHome.detail.entryId")),
      label: t("fileHome.detail.entryId"),
      value: source.entryId ?? t("common.unavailable"),
      mono: true,
    },
    {
      action: copyableIdentityAction(source.grantId, t("fileHome.detail.grantId")),
      label: t("fileHome.detail.grantId"),
      value: source.grantId,
      mono: true,
    },
    {
      action: copyableIdentityAction(source.ownerActorRef, t("fileHome.detail.owner")),
      label: t("fileHome.detail.owner"),
      value: source.ownerActorRef,
      mono: true,
    },
  ];
  const detailMetaFields = [
    {
      label: t("fileHome.detail.created"),
      value: source.createdAt
        ? formatFileHomeTimestamp(source.createdAt, t, locale)
        : t("common.unavailable"),
    },
    {
      label: t("fileHome.detail.activated"),
      value: source.activatedAt
        ? formatFileHomeTimestamp(source.activatedAt, t, locale)
        : t("common.unavailable"),
    },
    {
      label: t("fileHome.detail.expires"),
      value: source.expiresAt
        ? formatFileHomeTimestamp(source.expiresAt, t, locale)
        : t("fileHome.detail.openEnded"),
    },
    { label: t("fileHome.detail.access"), value: source.permission.toUpperCase() },
    {
      label: t("fileHome.detail.visibility"),
      value: isMcpVisible
        ? t("fileHome.detail.visibleToAgent")
        : t("fileHome.detail.hiddenFromAgent"),
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
      detail: t("fileHome.metricDetail.edgesInSharedBase"),
      icon: <LinkBridgeIcon className="h-4 w-4" />,
      label: t("fileHome.metric.edges"),
      value: String(baseStats?.link_count ?? t("common.unavailable")),
    },
    {
      detail: t("fileHome.metricDetail.sharedBaseSize"),
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

  async function refreshSharedBaseView(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: ["recipient-base-share-view", bridgeBaseUrl],
    });
  }

  async function handleRenameSharedBase(value: string): Promise<void> {
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const item = await renameRecipientBaseShare(bridgeBaseUrl, source.grantId, value);
      setRenamedLabelOverride(item.share_base_title);
      setIsRenaming(false);
      setActionNotice(
        t("fileHome.management.noticeSharedBaseRenamed", {
          name: item.share_base_title,
        }),
      );
      await refreshSharedBaseView();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("bases.error.renameSharedBase"),
      );
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleRemoveSharedBase(): Promise<void> {
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      await removeRecipientBaseShare(bridgeBaseUrl, source.grantId);
      await refreshSharedBaseView();
      onClose();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("bases.error.removeSharedBase"),
      );
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleBackupSharedBase(): Promise<void> {
    setPendingManagementAction(null);
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const backup = await backupRecipientBaseShare(bridgeBaseUrl, source.grantId, "manual");
      setActionNotice(
        t("fileHome.management.noticeSharedBaseBackupCreated", {
          filename: backup.filename,
        }),
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("bases.error.backupSharedBase"),
      );
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleToggleMcpVisibility(): Promise<void> {
    setPendingManagementAction(null);
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const item = await setRecipientBaseShareMcpVisibility(
        bridgeBaseUrl,
        source.grantId,
        !isMcpVisible,
      );
      const nextVisibleInMcp = item.visible_in_mcp !== false;
      setVisibleInMcpOverride(nextVisibleInMcp);
      setActionNotice(
        nextVisibleInMcp
          ? t("fileHome.management.noticeSharedBaseVisibleToAgent", {
              name: currentLabel,
            })
          : t("fileHome.management.noticeSharedBaseHiddenFromAgent", {
              name: currentLabel,
            }),
      );
      await refreshSharedBaseView();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : t("bases.error.updateSharedMcpVisibility"),
      );
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function confirmPendingManagementAction(): Promise<void> {
    if (pendingManagementAction === "backup") {
      await handleBackupSharedBase();
      return;
    }
    if (pendingManagementAction === "toggle-mcp") {
      await handleToggleMcpVisibility();
    }
  }

  return (
    <FileHomeLayout
      badgeLabel={t("fileHome.layout.badge.sharedBase")}
      headerAction={
        isShownBaseActive ? (
          <button
            type="button"
            disabled
            className={fileHomeHeaderActivateButtonClassName(true)}
          >
            {t("fileHome.action.active")}
          </button>
        ) : undefined
      }
      management={
        <FileHomeManagementPanel>
          <div className={FILE_HOME_MANAGEMENT_GRID_CLASS}>
            {backupAvailable ? (
              <FileHomeManagementButton
                disabled={isSubmittingAction}
                onClick={() => {
                  setIsRenaming(false);
                  setIsConfirmingRemove(false);
                  setPendingManagementAction("backup");
                }}
              >
                <DownloadIcon className="h-4 w-4" />
                <span>{t("fileHome.management.action.backupNow")}</span>
              </FileHomeManagementButton>
            ) : null}
            {mcpVisibilityUsable ? (
              <FileHomeManagementButton
                disabled={isSubmittingAction}
                onClick={() => {
                  setIsRenaming(false);
                  setIsConfirmingRemove(false);
                  setPendingManagementAction("toggle-mcp");
                }}
              >
                {isMcpVisible ? (
                  <AgentVisibilityOffIcon className="h-4 w-4" />
                ) : (
                  <AgentVisibilityOnIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>
                  {isMcpVisible
                    ? t("fileHome.management.action.hideFromAgent")
                    : t("fileHome.management.action.showToAgent")}
                </span>
              </FileHomeManagementButton>
            ) : null}
            <FileHomeManagementButton
              disabled={isSubmittingAction}
              onClick={() => {
                setPendingManagementAction(null);
                setIsConfirmingRemove(false);
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
            <FileHomeManagementButton
              disabled={isSubmittingAction}
              onClick={() => {
                setPendingManagementAction(null);
                setIsRenaming(false);
                setIsConfirmingRemove((current) => !current);
              }}
            >
              <DeleteIcon className="h-4 w-4" />
              <span>
                {isConfirmingRemove
                  ? t("fileHome.management.action.cancelRemoveSharedBase")
                  : t("fileHome.management.action.removeSharedBase")}
              </span>
            </FileHomeManagementButton>
          </div>

          {isRenaming ? (
            <InlineItemEditor
              confirmLabel={t("fileHome.management.action.rename")}
              icon={<EditIcon className="h-3.5 w-3.5" />}
              initialValue={currentLabel}
              isSubmitting={isSubmittingAction}
              onCancel={() => {
                setIsRenaming(false);
              }}
              onConfirm={(value) => {
                void handleRenameSharedBase(value);
              }}
              placeholder={t("fileHome.management.placeholderSharedBaseName")}
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
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    {pendingManagementDetail}
                  </p>
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

          {isConfirmingRemove ? (
            <InlineConfirm
              actionName={t("fileHome.management.action.removeSharedBase")}
              confirmLabel={t("fileHome.management.action.removeSharedBase")}
              isSubmitting={isSubmittingAction}
              label={t("fileHome.management.removeSharedBasePrompt", { name: currentLabel })}
              subjectIcon={<DatabaseIcon />}
              subjectName={currentLabel}
              onCancel={() => {
                setIsConfirmingRemove(false);
              }}
              onConfirm={() => {
                void handleRemoveSharedBase();
              }}
              tone="danger"
            />
          ) : null}

          <HomeFeedbackStack error={actionError} notice={actionNotice} />
        </FileHomeManagementPanel>
      }
      subtitle={headerSubtitle}
      title={currentLabel}
    >
      <HomeDetailsSection
        detailsLayout="shared-base"
        enableAdvancedDetails={false}
        leftFields={detailIdentityFields}
        rightFields={detailMetaFields}
      />

      {remoteStatsUnavailable ? (
        <FileHomeNotice tone="warning">
          {t("fileHome.sharedBase.statsRemoteUnavailable")}
        </FileHomeNotice>
      ) : null}

      <HomeStatisticsSection
        primaryMetrics={primaryMetrics}
        secondaryMetrics={secondaryMetrics}
      />

    </FileHomeLayout>
  );
}
