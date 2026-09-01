import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteBaseShareGrant,
  fetchAccessIdentity,
  fetchDesktopActivation,
  fetchOwnerBaseShareManagement,
  revokeBaseShareGrant,
} from "@/api";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import {
  AddIcon,
  CircleCloseIcon,
  CopyIcon,
  CopySuccessIcon,
  DatabaseIcon,
  DeleteIcon,
  ReloadIcon,
} from "@/components/icons/Icons";
import type { DictionaryKey } from "@/i18n/dictionaries/en";
import { useT } from "@/i18n/useT";
import ActionButton from "@/components/ui/ActionButton";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import TreeHeader from "@/components/tree/TreeHeader";
import TreeItem from "@/components/tree/TreeItem";
import { useEditorStore } from "@/stores/editorStore";
import { useSharingStore } from "@/stores/sharingStore";
import type {
  AccessIdentitySummary,
  DesktopActivationStatus,
  OwnerBaseShareManagementItem,
} from "@/types";

function accessIdentityQueryKey(baseUrl: string) {
  return ["access-identity", baseUrl] as const;
}

function ownerBaseGrantsQueryKey(baseUrl: string, ownerActorRef: string | null) {
  return ["owner-base-share-management", baseUrl, ownerActorRef] as const;
}

const GRANT_STATE_LABEL_KEYS: Record<string, DictionaryKey> = {
  active: "network.grantState.active",
  expired: "network.grantState.expired",
  revoked: "network.grantState.revoked",
};

const PERMISSION_LABEL_KEYS: Record<string, DictionaryKey> = {
  read: "network.permission.read",
  write: "network.permission.write",
  admin: "network.permission.admin",
};

function GrantStateBadge({ grantState }: { grantState: string }) {
  const t = useT();
  const tone: BadgeTone =
    grantState === "active"
      ? "success"
      : grantState === "expired"
        ? "warning"
        : grantState === "revoked"
          ? "danger"
          : "neutral";
  const labelKey = GRANT_STATE_LABEL_KEYS[grantState];
  const label = labelKey ? t(labelKey) : grantState;
  return <Badge tone={tone} uppercase>{label}</Badge>;
}

function CapabilityBadge({ permission }: { permission: OwnerBaseShareManagementItem["permission"] }) {
  const t = useT();
  const tone: BadgeTone =
    permission === "read"
      ? "info"
      : permission === "write"
        ? "warning"
        : permission === "admin"
          ? "danger"
          : "neutral";
  const labelKey = PERMISSION_LABEL_KEYS[permission];
  const label = labelKey ? t(labelKey) : permission;
  return <Badge tone={tone} uppercase>{label}</Badge>;
}

function shouldShowActivationStateBadge(
  activationState: OwnerBaseShareManagementItem["activation_state"],
) {
  return Boolean(activationState && activationState !== "active");
}

export default function NetworkTree() {
  const t = useT();
  const { bridgeBaseUrl } = useDesktopShellContext();
  const queryClient = useQueryClient();
  const openBaseSharing = useEditorStore((state) => state.openBaseSharing);
  const requestBaseSharePanelFocus = useSharingStore((state) => state.requestBaseSharePanelFocus);
  const selectedBaseShareGrantId = useSharingStore((state) => state.selectedBaseShareGrantId);
  const setSelectedBaseShareGrantId = useSharingStore(
    (state) => state.setSelectedBaseShareGrantId,
  );

  const [expandedGrantIds, setExpandedGrantIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isManageExpanded, setIsManageExpanded] = useState(true);

  const accessIdentityQuery = useQuery<AccessIdentitySummary>({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: accessIdentityQueryKey(bridgeBaseUrl),
    queryFn: () => fetchAccessIdentity(bridgeBaseUrl),
    refetchInterval: 30_000,
    retry: false,
  });
  const desktopActivationQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-activation", bridgeBaseUrl],
    queryFn: () => fetchDesktopActivation(bridgeBaseUrl),
    retry: false,
    staleTime: 10_000,
  });

  const ownerActorRef = accessIdentityQuery.data?.owner_actor_ref ?? null;
  const shareBaseUsable =
    desktopActivationQuery.data?.usableCapabilities.shareBase === true;

  const ownerBaseShareManagementQuery = useQuery<OwnerBaseShareManagementItem[]>({
    enabled: bridgeBaseUrl.length > 0 && ownerActorRef !== null && shareBaseUsable,
    queryKey: ownerBaseGrantsQueryKey(bridgeBaseUrl, ownerActorRef),
    queryFn: () =>
      fetchOwnerBaseShareManagement(bridgeBaseUrl, {
        ownerActorRef: ownerActorRef ?? "",
      }),
    retry: false,
  });

  const revokeBaseGrantMutation = useMutation({
    mutationFn: async (grantId: string) =>
      revokeBaseShareGrant(bridgeBaseUrl, grantId, {
        revocation_reason: "revoked from Network tree",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ownerBaseGrantsQueryKey(bridgeBaseUrl, ownerActorRef),
      });
    },
  });

  const deleteBaseGrantMutation = useMutation({
    mutationFn: async (grantId: string) => deleteBaseShareGrant(bridgeBaseUrl, grantId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ownerBaseGrantsQueryKey(bridgeBaseUrl, ownerActorRef),
      });
    },
    onSettled: () => {
      setCopiedId(null);
    },
  });

  function toggleGrantExpand(grantId: string) {
    setExpandedGrantIds((previous) => {
      const next = new Set(previous);
      if (next.has(grantId)) {
        next.delete(grantId);
      } else {
        next.add(grantId);
      }
      return next;
    });
  }

  function handleOpenGrantInBaseSharing(grantId: string) {
    if (!shareBaseUsable) {
      return;
    }
    setSelectedBaseShareGrantId(grantId);
    openBaseSharing();
  }

  function copyToClipboard(value: string, id: string) {
    void navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function refreshManagedShares() {
    if (!bridgeBaseUrl) {
      return;
    }
    await queryClient.refetchQueries({
      queryKey: accessIdentityQueryKey(bridgeBaseUrl),
      exact: true,
    });
    await queryClient.refetchQueries({
      queryKey: ["desktop-activation", bridgeBaseUrl],
      exact: true,
    });
    const identity = queryClient.getQueryData<AccessIdentitySummary>(
      accessIdentityQueryKey(bridgeBaseUrl),
    );
    const activation = queryClient.getQueryData<DesktopActivationStatus>([
      "desktop-activation",
      bridgeBaseUrl,
    ]);
    const ownerRef = identity?.owner_actor_ref ?? null;
    const shareUsable = activation?.usableCapabilities.shareBase === true;
    if (ownerRef !== null && shareUsable) {
      await queryClient.refetchQueries({
        queryKey: ownerBaseGrantsQueryKey(bridgeBaseUrl, ownerRef),
        exact: true,
      });
    }
  }

  function renderCopyActionIcon(copyId: string, sizeClass = "h-3.5 w-3.5") {
    return copiedId === copyId ? (
      <CopySuccessIcon className={sizeClass} />
    ) : (
      <CopyIcon className={sizeClass} />
    );
  }

  function formatBytes(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function renderBaseStatsSummary(item: OwnerBaseShareManagementItem) {
    const stats = item.base_stats;
    if (!stats) {
      return null;
    }
    const statsRows = [
      {
        label: t("network.stats.nodes"),
        value:
          stats.active_page_count !== null
            ? stats.page_count !== null &&
              stats.page_count !== stats.active_page_count
              ? t("network.stats.activeOf", {
                  active: String(stats.active_page_count),
                  total: String(stats.page_count),
                })
              : String(stats.active_page_count)
            : "—",
      },
      {
        label: t("network.stats.links"),
        value: stats.link_count !== null ? String(stats.link_count) : "—",
      },
      {
        label: t("network.stats.size"),
        value: formatBytes(stats.size_bytes),
      },
    ];
    return (
      <div className="mb-0.5 flex items-center gap-3 rounded-md px-2 py-0.5 text-xs">
        {statsRows.map(({ label, value }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="text-text-secondary">{label}</span>
            <span className="text-foreground font-medium">{value}</span>
          </span>
        ))}
      </div>
    );
  }

  function renderDetailRows(
    details: Array<{ label: string; value: string; copyId: string }>,
  ) {
    return details.map(({ label, value, copyId }) => (
      <div
        key={copyId}
        className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-0.5 text-xs hover:bg-menu-hover-bg"
        onClick={(event) => {
          event.stopPropagation();
          copyToClipboard(value, copyId);
        }}
      >
        <span className="text-text-secondary shrink-0 font-mono">{label}</span>
        <span className="text-foreground min-w-0 flex-1 truncate font-mono">{value}</span>
        <span className="flex w-0 items-center overflow-hidden opacity-0 transition-all group-hover:w-auto group-hover:opacity-100">
          <ActionButton
            ariaLabel={t("common.copyAction", { label })}
            icon={renderCopyActionIcon(copyId, "h-3 w-3")}
            onClick={(event) => {
              event?.stopPropagation();
              copyToClipboard(value, copyId);
            }}
            title={t("common.copyAction", { label })}
          />
        </span>
      </div>
    ));
  }

  function renderBaseGrant(grant: OwnerBaseShareManagementItem) {
    const isExpanded = expandedGrantIds.has(grant.grant_id);
    const recipientLabel = grant.recipient_account_id ?? grant.recipient_actor_ref;
    const label = grant.share_base_title ?? grant.base_id;

    return (
      <div key={grant.grant_id}>
      <TreeItem
        icon={<DatabaseIcon />}
        label={label}
        isActive={selectedBaseShareGrantId === grant.grant_id}
        isIconActive={selectedBaseShareGrantId === grant.grant_id}
        onClick={() => {
          handleOpenGrantInBaseSharing(grant.grant_id);
        }}
        isExpanded={isExpanded}
        onToggle={() => toggleGrantExpand(grant.grant_id)}
        count={grant.base_stats?.active_page_count ?? grant.base_stats?.page_count ?? 0}
        actions={
          <>
            <ActionButton
              ariaLabel={t("network.tooltips.copyGrantId")}
              icon={renderCopyActionIcon(`owner_grant_btn_${grant.grant_id}`)}
              onClick={(event) => {
                event?.stopPropagation();
                copyToClipboard(grant.grant_id, `owner_grant_btn_${grant.grant_id}`);
              }}
              title={t("network.tooltips.copyGrantId")}
            />
            {grant.grant_state === "active" ? (
              <ActionButton
                ariaLabel={t("network.tooltips.revokeBaseGrant")}
                className="group"
                icon={<CircleCloseIcon className="group-hover:text-destructive h-3.5 w-3.5" />}
                onClick={(event) => {
                  event?.stopPropagation();
                  void revokeBaseGrantMutation.mutateAsync(grant.grant_id);
                }}
                title={t("network.tooltips.revokeBaseGrant")}
                disabled={revokeBaseGrantMutation.isPending}
              />
            ) : null}
            <ActionButton
              ariaLabel={t("network.tooltips.deleteBaseGrant")}
              className="group"
              icon={<DeleteIcon className="group-hover:text-destructive h-3.5 w-3.5" />}
              onClick={(event) => {
                event?.stopPropagation();
                void deleteBaseGrantMutation.mutateAsync(grant.grant_id);
              }}
              title={t("network.tooltips.deleteBaseGrant")}
              disabled={deleteBaseGrantMutation.isPending}
            />
          </>
        }
      >
        <div className="mb-0.5 flex items-center gap-2 rounded-md px-2 py-0.5 text-xs">
          <GrantStateBadge grantState={grant.grant_state} />
          {shouldShowActivationStateBadge(grant.activation_state) ? (
            <Badge tone="neutral" uppercase>
              {grant.activation_state}
            </Badge>
          ) : null}
          <CapabilityBadge permission={grant.permission} />
        </div>
        {renderBaseStatsSummary(grant)}
        {renderDetailRows([
          { label: t("network.detail.entryId"), value: grant.entry_id ?? "—", copyId: `base_grant_entry_${grant.grant_id}` },
          { label: t("network.detail.recipient"), value: recipientLabel, copyId: `base_grant_recipient_${grant.grant_id}` },
          { label: t("network.detail.baseId"), value: grant.base_id, copyId: `base_grant_base_${grant.grant_id}` },
          { label: t("network.detail.grantId"), value: grant.grant_id, copyId: `base_grant_id_${grant.grant_id}` },
          { label: t("network.detail.created"), value: grant.created_at, copyId: `base_grant_created_${grant.grant_id}` },
          { label: t("network.detail.activated"), value: grant.activated_at ?? "—", copyId: `base_grant_activated_${grant.grant_id}` },
          { label: t("network.detail.expires"), value: grant.expires_at ?? "—", copyId: `base_grant_expires_${grant.grant_id}` },
        ])}
      </TreeItem>
      </div>
    );
  }

  if (!shareBaseUsable) {
    return null;
  }

  return (
    <div className="bg-panel-background flex h-full min-h-0 flex-col overflow-hidden pb-2">
      <TreeHeader
        title={t("network.section.sharesIManage")}
        expanded={isManageExpanded}
        onToggle={() => setIsManageExpanded((previous) => !previous)}
        actions={
          <>
            <ActionButton
              ariaLabel={t("network.tooltips.openBaseSharingManagement")}
              icon={<AddIcon className="h-3.5 w-3.5" />}
              onClick={(event) => {
                event?.stopPropagation();
                if (!shareBaseUsable) {
                  return;
                }
                requestBaseSharePanelFocus("create");
                openBaseSharing();
              }}
              title={
                shareBaseUsable
                  ? t("network.tooltips.openBaseSharingManagement")
                  : t("network.tooltips.openBaseSharingManagementBlocked")
              }
              disabled={!shareBaseUsable}
            />
            <ActionButton
              ariaLabel={t("network.tooltips.refreshSharesIManage")}
              icon={<ReloadIcon className="h-[13px] w-[13px]" />}
              onClick={(event) => {
                event?.stopPropagation();
                void refreshManagedShares();
              }}
              title={t("network.tooltips.refreshSharesIManage")}
            />
          </>
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
          {accessIdentityQuery.error ? (
            <p className="text-text-secondary px-2 py-4 text-center text-xs">
              {accessIdentityQuery.error.message}
            </p>
          ) : ownerActorRef === null ? (
            <p className="text-text-secondary px-2 py-4 text-center text-xs">
              {t("network.empty.enrollNetwork")}
            </p>
          ) : ownerBaseShareManagementQuery.isLoading ? (
            <p className="text-text-secondary px-2 py-4 text-center text-xs">
              {t("common.loading")}
            </p>
          ) : ownerBaseShareManagementQuery.error ? (
            <p className="text-text-secondary px-2 py-4 text-center text-xs">
              {ownerBaseShareManagementQuery.error.message}
            </p>
          ) : ownerBaseShareManagementQuery.data && ownerBaseShareManagementQuery.data.length > 0 ? (
            ownerBaseShareManagementQuery.data.map((grant) => renderBaseGrant(grant))
          ) : (
            <p className="text-text-secondary px-2 py-4 text-center text-xs">
              {t("network.empty.noManagedShares")}
            </p>
          )}
        </div>
      </TreeHeader>

    </div>
  );
}
