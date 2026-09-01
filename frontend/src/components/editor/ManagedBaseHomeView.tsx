import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchBases, refreshManagedBase, runManualEmbed } from "@/api";
import {
  CopyIcon,
  CopySuccessIcon,
  DatabaseIcon,
  InformationIcon,
  LinkBridgeIcon,
  NoteIcon,
  WarningIcon,
} from "@/components/icons/Icons";
import {
  FileHomeLayout,
  FileHomeLocaleSelect,
  FileHomeManagementButton,
  FileHomeManagementPanel,
  FileHomeNotice,
  HomeDetailsSection,
  HomeFeedbackStack,
  HomeStatisticsSection,
  fileHomeDetailValue,
  fileHomeHeaderActivateButtonClassName,
  formatFileHomeBytes,
  formatFileHomeTimestamp,
  normalizeFileHomeLabel,
} from "@/components/editor/FileHomeBlocks";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import ActionButton from "@/components/ui/ActionButton";
import { useT } from "@/i18n/useT";
import { useUiPreferencesStore } from "@/stores/uiPreferencesStore";
import { useNotesTreeStore } from "@/stores/notesTreeStore";
import type { ManagedBaseSummary } from "@/types";
import { managedBaseDisplayLabelKey } from "@/types/source";
import type { ManagedBaseSource } from "@/types/source";

type ManagedBaseHomeViewProps = {
  bridgeBaseUrl: string;
  onClose: () => void;
  source: ManagedBaseSource;
};

function basesQueryKey(baseUrl: string) {
  return ["bases", baseUrl] as const;
}

export default function ManagedBaseHomeView({
  bridgeBaseUrl,
  onClose: _onClose,
  source,
}: ManagedBaseHomeViewProps) {
  const t = useT();
  const locale = useUiPreferencesStore((state) => state.locale);
  const queryClient = useQueryClient();
  const { activeSource, onActivateSource } = useDesktopShellContext();
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<string>("");
  const [isSubmittingActivate, setIsSubmittingActivate] = useState(false);
  const [isReloadingSummary, setIsReloadingSummary] = useState(false);

  const basesQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: basesQueryKey(bridgeBaseUrl),
    queryFn: () => fetchBases(bridgeBaseUrl),
    refetchInterval: 30_000,
  });
  const summary = useMemo(
    () =>
      basesQuery.data?.built_in_bases.find(
        (item) => item.kind === source.managedBaseKind,
      ) ?? null,
    [basesQuery.data?.built_in_bases, source.managedBaseKind],
  );

  useEffect(() => {
    if (source.managedBaseKind !== "documentation") {
      if (selectedLocale !== "") {
        setSelectedLocale("");
      }
      return;
    }
    const nextLocale =
      summary?.locale ??
      summary?.available_locales[0] ??
      "";
    if (nextLocale !== selectedLocale) {
      setSelectedLocale(nextLocale);
    }
  }, [
    source.managedBaseKind,
    summary?.available_locales,
    summary?.locale,
  ]);

  const refreshMutation = useMutation({
    mutationFn: async () =>
      refreshManagedBase(
        bridgeBaseUrl,
        source.managedBaseKind,
        source.managedBaseKind === "documentation" && selectedLocale
          ? selectedLocale
          : undefined,
      ),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({
        queryKey: basesQueryKey(bridgeBaseUrl),
      });
      useNotesTreeStore.getState().invalidateChildren(bridgeBaseUrl, source.id);
      setActionError(null);
      setActionNotice(
        t("fileHome.management.managedRefreshSuccess", { label: updated.label }),
      );
      if (activeSource?.id === source.id) {
        await onActivateSource(source, {
          forceRefresh: true,
          preserveCurrentTab: true,
        });
      }
    },
    onError: (error) => {
      setActionNotice(null);
      setActionError(
        error instanceof Error ? error.message : t("fileHome.management.managedRefreshError"),
      );
    },
  });
  const manualEmbedMutation = useMutation({
    mutationFn: () =>
      runManualEmbed(
        bridgeBaseUrl,
        summary?.base_id
          ? { baseId: summary.base_id }
          : { baseRef: source.baseRef },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: basesQueryKey(bridgeBaseUrl),
      });
      useNotesTreeStore.getState().invalidateChildren(bridgeBaseUrl, source.id);
      setActionError(null);
      setActionNotice(t("fileHome.embedAction.success", { label: displayTitle }));
      if (activeSource?.id === source.id) {
        await onActivateSource(source, {
          forceRefresh: true,
          preserveCurrentTab: true,
        });
      }
    },
    onError: (error) => {
      setActionNotice(null);
      setActionError(error instanceof Error ? error.message : t("fileHome.embedAction.failed"));
    },
  });

  const stats = summary?.stats ?? null;
  const unavailableLabel = t("common.unavailable");
  const localeSelectionEnabled =
    source.managedBaseKind === "documentation" &&
    (summary?.available_locales.length ?? 0) > 1;
  const notesMetricValue =
    stats?.active_page_count !== null && stats?.active_page_count !== undefined
      ? String(stats.active_page_count)
      : stats?.page_count !== null && stats?.page_count !== undefined
        ? String(stats.page_count)
        : unavailableLabel;
  const notesMetricDetail =
    stats?.page_count !== null && stats?.page_count !== undefined
      ? t("fileHome.metricDetail.notesActiveTotal", {
          active: stats.active_page_count ?? stats.page_count,
          total: stats.page_count,
        })
      : basesQuery.isPending
        ? t("fileHome.metricDetail.notesLoading")
        : t("fileHome.metricDetail.notesUnavailable");
  const unembeddedNotesCount =
    stats?.unembedded_count !== null && stats?.unembedded_count !== undefined
      ? String(stats.unembedded_count)
      : unavailableLabel;
  const orphanedNotesCount =
    stats?.orphan_count !== null && stats?.orphan_count !== undefined
      ? String(stats.orphan_count)
      : unavailableLabel;
  const dueReviewNotesCount =
    stats?.due_for_review_count !== null && stats?.due_for_review_count !== undefined
      ? String(stats.due_for_review_count)
      : unavailableLabel;
  const versionValue = fileHomeDetailValue(summary?.mounted_version, t);
  const updatedValue = fileHomeDetailValue(
    formatFileHomeTimestamp(summary?.updated_at, t, locale),
    t,
  );
  const provenanceValue =
    summary?.source_url && summary?.refresh_configured
      ? t("fileHome.detail.provenanceManagedRemote")
      : t("fileHome.detail.provenanceManagedPackaged");
  const isManagedSourceActive = activeSource?.id === source.id;
  const headerSubtitle = isManagedSourceActive
    ? t("fileHome.layout.subtitle.managedBaseActive")
    : t("fileHome.layout.subtitle.managedBaseInspect");
  const displayTitle = t(managedBaseDisplayLabelKey(source.managedBaseKind));
  const managedUpdateChannelNote = summary?.refresh_configured
    ? t("fileHome.management.managedUpdateChannelNoteRemote")
    : t("fileHome.management.managedUpdateChannelNoteLocal");

  async function handleCopyPath() {
    if (!summary?.path) {
      return;
    }
    setActionError(null);
    setActionNotice(null);
    try {
      await navigator.clipboard.writeText(summary.path);
      setCopiedPath(true);
      window.setTimeout(() => {
        setCopiedPath(false);
      }, 1200);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("fileHome.detail.copyPathError"),
      );
    }
  }

  async function handleRefreshSummary() {
    setIsReloadingSummary(true);
    setActionError(null);
    setActionNotice(null);
    try {
      await queryClient.invalidateQueries({
        queryKey: basesQueryKey(bridgeBaseUrl),
      });
      await basesQuery.refetch();
      useNotesTreeStore.getState().invalidateChildren(bridgeBaseUrl, source.id);
      if (activeSource?.id === source.id) {
        await onActivateSource(source, {
          forceRefresh: true,
          preserveCurrentTab: true,
        });
      }
      setActionNotice(
        t("fileHome.management.managedSummaryReloadSuccess", { label: displayTitle }),
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : t("fileHome.management.managedSummaryReloadError"),
      );
    } finally {
      setIsReloadingSummary(false);
    }
  }

  async function handleActivateManagedBase() {
    if (isManagedSourceActive) {
      return;
    }
    setIsSubmittingActivate(true);
    setActionError(null);
    setActionNotice(null);
    try {
      await onActivateSource(source, { preserveCurrentTab: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("fileHome.management.managedActivateError"));
    } finally {
      setIsSubmittingActivate(false);
    }
  }

  return (
    <FileHomeLayout
      badgeLabel={t("fileHome.layout.badge.builtIn")}
      headerAction={
        <button
          type="button"
          className={fileHomeHeaderActivateButtonClassName(isManagedSourceActive)}
          disabled={
            isSubmittingActivate ||
            isManagedSourceActive ||
            refreshMutation.isPending ||
            isReloadingSummary
          }
          onClick={() => {
            void handleActivateManagedBase();
          }}
        >
          {isManagedSourceActive ? t("fileHome.action.active") : t("fileHome.action.activate")}
        </button>
      }
      management={
        <FileHomeManagementPanel>
          <div className="flex flex-wrap items-center gap-2">
            {localeSelectionEnabled ? (
              <FileHomeLocaleSelect
                ariaLabel={t("fileHome.management.localeLabel")}
                disabled={
                  refreshMutation.isPending ||
                  isReloadingSummary ||
                  !(summary?.refresh_configured ?? false)
                }
                onChange={setSelectedLocale}
                options={summary?.available_locales ?? []}
                value={selectedLocale}
              />
            ) : null}
            <FileHomeManagementButton
              disabled={refreshMutation.isPending || isReloadingSummary}
              onClick={() => {
                void handleRefreshSummary();
              }}
            >
              {isReloadingSummary
                ? t("fileHome.management.actionManagedSummaryRefreshPending")
                : t("fileHome.management.actionManagedSummaryRefresh")}
            </FileHomeManagementButton>
            <FileHomeManagementButton
              disabled={
                refreshMutation.isPending ||
                isReloadingSummary ||
                !(summary?.refresh_configured ?? false)
              }
              onClick={() => {
                setActionNotice(null);
                setActionError(null);
                void refreshMutation.mutateAsync();
              }}
            >
              {refreshMutation.isPending
                ? t("fileHome.management.actionManagedUpdatePending")
                : t("fileHome.management.actionManagedUpdate")}
            </FileHomeManagementButton>
          </div>
          <p className="text-muted-foreground text-xs leading-5">{managedUpdateChannelNote}</p>
          <HomeFeedbackStack error={actionError} notice={actionNotice} />
        </FileHomeManagementPanel>
      }
      subtitle={headerSubtitle}
      title={displayTitle}
    >
      {basesQuery.error ? (
        <FileHomeNotice tone="error">
          {basesQuery.error instanceof Error
            ? basesQuery.error.message
            : t("fileHome.management.basesRegistryLoadError")}
        </FileHomeNotice>
      ) : null}

      <HomeDetailsSection
        enableAdvancedDetails={false}
        leftFields={[
          {
            action: summary?.path ? (
              <ActionButton
                ariaLabel={copiedPath ? t("fileHome.detail.pathCopied") : t("fileHome.detail.copyPath")}
                icon={
                  copiedPath ? (
                    <CopySuccessIcon className="h-3.5 w-3.5" />
                  ) : (
                    <CopyIcon className="h-3.5 w-3.5" />
                  )
                }
                onClick={() => {
                  void handleCopyPath();
                }}
                title={copiedPath ? t("fileHome.detail.pathCopied") : t("fileHome.detail.copyPath")}
              />
            ) : null,
            label: t("fileHome.detail.path"),
            mono: true,
            value: fileHomeDetailValue(summary?.path, t),
          },
          {
            label: t("fileHome.detail.provenance"),
            compactValue: true,
            value: provenanceValue,
          },
        ]}
        rightFields={[
          {
            label: t("fileHome.detail.kind"),
            value: basesQuery.isPending
              ? t("fileHome.detail.loadingShort")
              : t("fileHome.classLabel.builtInBase"),
          },
          {
            label: t("fileHome.detail.visibility"),
            value: normalizeFileHomeLabel(summary?.visibility, unavailableLabel),
          },
          {
            label: t("fileHome.detail.managedVersion"),
            value: versionValue,
          },
          {
            label: t("fileHome.detail.managedUpdated"),
            compactValue: true,
            value: updatedValue,
          },
        ]}
      />

      <HomeStatisticsSection
        primaryMetrics={[
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
            value:
              stats?.link_count !== null && stats?.link_count !== undefined
                ? String(stats.link_count)
                : unavailableLabel,
          },
          {
            detail: t("fileHome.metricDetail.sqliteSize"),
            icon: <DatabaseIcon className="h-4 w-4" />,
            label: t("fileHome.metric.size"),
            value: formatFileHomeBytes(stats?.size_bytes, t),
          },
        ]}
        secondaryMetrics={[
          {
            detail: t("fileHome.metricDetail.unembedded"),
            icon: <NoteIcon className="h-4 w-4" />,
            label: t("fileHome.metric.unembedded"),
            valueAction:
              stats?.unembedded_count && stats.unembedded_count > 0 ? (
                <FileHomeManagementButton
                  className="px-2.5 py-1.5 text-xs leading-4"
                  disabled={manualEmbedMutation.isPending || !summary?.base_id}
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
        ]}
      />


    </FileHomeLayout>
  );
}
