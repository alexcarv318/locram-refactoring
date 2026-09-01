import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createBaseShareGrant,
  deleteBaseShareGrant,
  fetchAccessSummary,
  fetchAccessIdentity,
  fetchBaseShareInvite,
  fetchOwnerBaseShareManagement,
  revokeBaseShareGrant,
} from "@/api";
import { fetchBases } from "@/api/baseManagementApi";
import BaseShareGrantCard from "@/components/editor/baseSharing/BaseShareGrantCard";
import BaseShareGrantDateTimeField from "@/components/editor/baseSharing/BaseShareGrantDateTimeField";
import {
  FileHomeLayout,
  FileHomeManagementButton,
  FileHomeNotice,
  FileHomeSection,
  FileHomeSummaryGrid,
  FileHomeSummaryMetric,
  formatFileHomeBytes,
} from "@/components/editor/FileHomeBlocks";
import { DatabaseIcon, LinkBridgeIcon, NoteIcon } from "@/components/icons/Icons";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import PopoverSelect from "@/components/ui/PopoverSelect";
import { useT } from "@/i18n/useT";
import type { Translator } from "@/i18n/translate";
import { BridgeClientError } from "@/lib/bridgeClient";
import {
  inviteMintingReady,
  resolveInviteReadinessNotice,
  SharingFormFieldRow,
} from "@/lib/sharing/baseShareGrantUi";
import { cn } from "@/lib/utils/cn";
import { scrollElementWithinContainer } from "@/lib/utils/scrollElementWithinContainer";
import { outlinedActionButtonClassName } from "@/lib/ui/outlinedActionButton";
import { useSharingStore } from "@/stores/sharingStore";
import type {
  AccessIdentitySummary,
  AccessSummary,
  BaseRegistryEntry,
  BaseShareGrantPermission,
  BaseShareInvite,
  OwnerBaseShareManagementItem,
} from "@/types";

interface BaseShareGrantsPanelProps {
  bridgeBaseUrl: string;
}

type PanelNotice = {
  message: string;
  tone: "error" | "success" | "warning";
};

function accessIdentityQueryKey(baseUrl: string) {
  return ["access-identity", baseUrl] as const;
}

function ownerBaseGrantsQueryKey(baseUrl: string, ownerActorRef: string | null) {
  return ["owner-base-share-management", baseUrl, ownerActorRef] as const;
}

function accessSummaryQueryKey(baseUrl: string) {
  return ["access-summary", baseUrl] as const;
}

function basesQueryKey(baseUrl: string) {
  return ["bases", baseUrl] as const;
}

function formatPanelError(error: unknown, fallback: string): string {
  if (error instanceof BridgeClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function parseRecipientGrantTarget(value: string): {
  recipient_actor_ref?: string;
  recipient_account_id?: string;
} {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return {};
  }
  if (normalizedValue.startsWith("acct_")) {
    return { recipient_account_id: normalizedValue };
  }
  return { recipient_actor_ref: normalizedValue };
}

function basePreviewMetrics(entry: BaseRegistryEntry | null, t: Translator) {
  if (entry === null) {
    return [];
  }
  const unavailable = t("common.unavailable");
  return [
    {
      detail: t("fileHome.metricDetail.notesInSharedBase"),
      icon: <NoteIcon className="h-4 w-4" />,
      label: t("fileHome.metric.notes"),
      value:
        entry.stats?.active_page_count !== null && entry.stats?.active_page_count !== undefined
          ? String(entry.stats.active_page_count)
          : unavailable,
    },
    {
      detail: t("fileHome.metricDetail.edgesInSharedBase"),
      icon: <LinkBridgeIcon className="h-4 w-4" />,
      label: t("fileHome.metric.edges"),
      value:
        entry.stats?.link_count !== null && entry.stats?.link_count !== undefined
          ? String(entry.stats.link_count)
          : unavailable,
    },
    {
      detail: t("fileHome.metricDetail.sharedBaseSize"),
      icon: <DatabaseIcon className="h-4 w-4" />,
      label: t("fileHome.metric.size"),
      value: formatFileHomeBytes(entry.stats?.size_bytes, t),
    },
  ];
}

export default function BaseShareGrantsPanel({
  bridgeBaseUrl,
}: BaseShareGrantsPanelProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [recipientIdentityInput, setRecipientIdentityInput] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedPermission, setSelectedPermission] = useState<BaseShareGrantPermission>("read");
  const [selectedBaseEntryId, setSelectedBaseEntryId] = useState("");
  const [panelNotice, setPanelNotice] = useState<PanelNotice | null>(null);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [baseFilter, setBaseFilter] = useState("all");
  const [inviteOwnerDisplayNames, setInviteOwnerDisplayNames] = useState<Record<string, string>>({});
  const [inviteMessages, setInviteMessages] = useState<Record<string, string>>({});
  const [mintedInvites, setMintedInvites] = useState<Record<string, BaseShareInvite>>({});
  const setLastBaseShareInviteUrl = useSharingStore((state) => state.setLastBaseShareInviteUrl);
  const selectedBaseShareGrantId = useSharingStore((state) => state.selectedBaseShareGrantId);
  const baseSharePanelFocus = useSharingStore((state) => state.baseSharePanelFocus);
  const clearBaseSharePanelFocus = useSharingStore((state) => state.clearBaseSharePanelFocus);
  const [highlightedGrantId, setHighlightedGrantId] = useState<string | null>(null);
  const grantCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inviteLinkRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const createSectionRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledGrantIdRef = useRef<string | null>(null);
  const [scrollToInviteGrantId, setScrollToInviteGrantId] = useState<string | null>(null);

  const accessIdentityQuery = useQuery<AccessIdentitySummary>({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: accessIdentityQueryKey(bridgeBaseUrl),
    queryFn: () => fetchAccessIdentity(bridgeBaseUrl),
    refetchInterval: 30_000,
  });

  const accessSummaryQuery = useQuery<AccessSummary>({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: accessSummaryQueryKey(bridgeBaseUrl),
    queryFn: () => fetchAccessSummary(bridgeBaseUrl),
    refetchInterval: 30_000,
  });

  const basesQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: basesQueryKey(bridgeBaseUrl),
    queryFn: () => fetchBases(bridgeBaseUrl),
    refetchInterval: 30_000,
  });

  const ownerActorRef = accessIdentityQuery.data?.owner_actor_ref ?? null;
  const ownerBaseShareManagementQuery = useQuery<OwnerBaseShareManagementItem[]>({
    enabled: bridgeBaseUrl.length > 0 && ownerActorRef !== null,
    queryKey: ownerBaseGrantsQueryKey(bridgeBaseUrl, ownerActorRef),
    queryFn: () =>
      fetchOwnerBaseShareManagement(bridgeBaseUrl, {
        ownerActorRef: ownerActorRef ?? "",
      }),
    retry: false,
  });

  const activeBase = basesQuery.data?.active_base ?? null;
  const bases = basesQuery.data?.items ?? [];

  useEffect(() => {
    if (!selectedBaseEntryId && activeBase?.entry_id) {
      setSelectedBaseEntryId(activeBase.entry_id);
    }
  }, [activeBase?.entry_id, selectedBaseEntryId]);

  const selectedBase = useMemo(
    () => bases.find((entry) => entry.entry_id === selectedBaseEntryId) ?? activeBase ?? null,
    [activeBase, bases, selectedBaseEntryId],
  );

  const createGrantMutation = useMutation({
    mutationFn: async () =>
      createBaseShareGrant(bridgeBaseUrl, {
        owner_actor_ref: ownerActorRef ?? "",
        ...parseRecipientGrantTarget(recipientIdentityInput),
        base_id: selectedBase?.base_id,
        entry_id: selectedBase?.entry_id,
        permission: selectedPermission,
        expires_at: expiresAt.trim() || undefined,
      }),
    onSuccess: async () => {
      setPanelNotice({ tone: "success", message: t("sharing.owner.notice.grantCreated") });
      setRecipientIdentityInput("");
      setExpiresAt("");
      await queryClient.invalidateQueries({
        queryKey: ownerBaseGrantsQueryKey(bridgeBaseUrl, ownerActorRef),
      });
    },
    onError: (error) => {
      setPanelNotice({
        tone: "error",
        message: formatPanelError(error, t("sharing.owner.notice.createFailed")),
      });
    },
  });

  const revokeGrantMutation = useMutation({
    mutationFn: async (grantId: string) =>
      revokeBaseShareGrant(bridgeBaseUrl, grantId, {
        revocation_reason: "revoked from desktop base sharing UI",
      }),
    onSuccess: async () => {
      setPanelNotice({ tone: "success", message: t("sharing.owner.notice.grantRevoked") });
      await queryClient.invalidateQueries({
        queryKey: ownerBaseGrantsQueryKey(bridgeBaseUrl, ownerActorRef),
      });
    },
    onError: (error) => {
      setPanelNotice({
        tone: "error",
        message: formatPanelError(error, t("sharing.owner.notice.revokeFailed")),
      });
    },
  });

  const deleteGrantMutation = useMutation({
    mutationFn: async (grantId: string) => deleteBaseShareGrant(bridgeBaseUrl, grantId),
    onSuccess: async () => {
      setPanelNotice({ tone: "success", message: t("sharing.owner.notice.grantDeleted") });
      await queryClient.invalidateQueries({
        queryKey: ownerBaseGrantsQueryKey(bridgeBaseUrl, ownerActorRef),
      });
    },
    onError: (error) => {
      setPanelNotice({
        tone: "error",
        message: formatPanelError(error, t("sharing.owner.notice.deleteFailed")),
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (input: {
      grantId: string;
      ownerDisplayName?: string;
      message?: string;
    }) =>
      fetchBaseShareInvite(bridgeBaseUrl, input.grantId, {
        ownerDisplayName: input.ownerDisplayName,
        message: input.message,
      }),
    onSuccess: (invite) => {
      setMintedInvites((previous) => ({
        ...previous,
        [invite.grant_id]: invite,
      }));
      setLastBaseShareInviteUrl(invite.share_invite_url);
      setScrollToInviteGrantId(invite.grant_id);
      setPanelNotice({ tone: "success", message: t("sharing.owner.notice.inviteReady") });
    },
    onError: (error) => {
      setPanelNotice({
        tone: "error",
        message: formatPanelError(error, t("sharing.owner.notice.inviteFailed")),
      });
    },
  });

  async function handleCopyInvite(grant: OwnerBaseShareManagementItem) {
    try {
      let invite = mintedInvites[grant.grant_id];
      if (!invite) {
        invite = await inviteMutation.mutateAsync({
          grantId: grant.grant_id,
          ownerDisplayName:
            inviteOwnerDisplayNames[grant.grant_id]?.trim() || ownerActorRef || undefined,
          message: inviteMessages[grant.grant_id]?.trim() || undefined,
        });
      }
      await navigator.clipboard.writeText(invite.share_invite_url);
      setCopiedActionId(`invite_${grant.grant_id}`);
      window.setTimeout(() => {
        setCopiedActionId((current) => (current === `invite_${grant.grant_id}` ? null : current));
      }, 1500);
      setPanelNotice({ tone: "success", message: t("sharing.owner.notice.inviteCopied") });
    } catch (error) {
      setPanelNotice({
        tone: "error",
        message: formatPanelError(error, t("sharing.owner.notice.copyInviteFailed")),
      });
    }
  }

  async function copyToClipboard(value: string, actionId: string) {
    await navigator.clipboard.writeText(value);
    setCopiedActionId(actionId);
    window.setTimeout(() => {
      setCopiedActionId((current) => (current === actionId ? null : current));
    }, 1500);
    setPanelNotice({ tone: "success", message: t("sharing.owner.notice.inviteCopied") });
  }

  const showEnrollState = ownerActorRef === null;
  const accessSummary = accessSummaryQuery.data;
  const inviteReady = inviteMintingReady(accessSummary);
  const inviteReadinessNotice = showEnrollState
    ? t("sharing.owner.readiness.enrollRequired")
    : resolveInviteReadinessNotice(t, accessSummary);

  const filteredGrants = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return (ownerBaseShareManagementQuery.data ?? []).filter((grant) => {
      if (baseFilter !== "all" && grant.entry_id !== baseFilter) {
        return false;
      }
      if (statusFilter !== "all" && grant.grant_state !== statusFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [
        grant.share_base_title ?? grant.base_id,
        grant.base_id,
        grant.entry_id ?? "",
        grant.grant_id,
        grant.recipient_account_id ?? grant.recipient_actor_ref,
        grant.permission,
        grant.grant_state,
        grant.activation_state ?? "",
        grant.created_at,
        grant.activated_at ?? "",
        grant.last_invited_at ?? "",
        grant.expires_at ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [baseFilter, ownerBaseShareManagementQuery.data, searchQuery, statusFilter]);

  useEffect(() => {
    if (baseSharePanelFocus !== "create") {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      const container = contentScrollRef.current;
      const target = createSectionRef.current;
      if (container && target) {
        scrollElementWithinContainer(container, target, { block: "start" });
      }
      clearBaseSharePanelFocus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [baseSharePanelFocus, clearBaseSharePanelFocus]);

  useEffect(() => {
    if (!scrollToInviteGrantId) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      const container = contentScrollRef.current;
      const target = inviteLinkRefs.current[scrollToInviteGrantId];
      if (container && target) {
        scrollElementWithinContainer(container, target, { block: "center" });
      }
      setScrollToInviteGrantId(null);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [mintedInvites, scrollToInviteGrantId]);

  useEffect(() => {
    if (!selectedBaseShareGrantId) {
      return;
    }
    setSearchQuery("");
    setStatusFilter("all");
    setBaseFilter("all");
  }, [selectedBaseShareGrantId]);

  useEffect(() => {
    if (!selectedBaseShareGrantId) {
      lastScrolledGrantIdRef.current = null;
      return;
    }
    if (lastScrolledGrantIdRef.current === selectedBaseShareGrantId) {
      return;
    }
    const matchingGrant = filteredGrants.find(
      (grant) => grant.grant_id === selectedBaseShareGrantId,
    );
    if (!matchingGrant) {
      return;
    }
    lastScrolledGrantIdRef.current = selectedBaseShareGrantId;
    const container = contentScrollRef.current;
    const target = grantCardRefs.current[selectedBaseShareGrantId];
    if (container && target) {
      scrollElementWithinContainer(container, target, { block: "center" });
    }
    setHighlightedGrantId(selectedBaseShareGrantId);
    const timeoutId = window.setTimeout(() => {
      setHighlightedGrantId((current) =>
        current === selectedBaseShareGrantId ? null : current,
      );
    }, 2200);
    return () => window.clearTimeout(timeoutId);
  }, [filteredGrants, selectedBaseShareGrantId]);

  const grantSearchDisabled =
    ownerBaseShareManagementQuery.isLoading || ownerBaseShareManagementQuery.isError;

  const baseOptions = useMemo(
    () => [
      { label: t("sharing.owner.filter.allBases"), value: "all" },
      ...bases.map((entry) => ({
        label: `${entry.display_name} • ${entry.entry_id.slice(-6)}`,
        value: entry.entry_id,
      })),
    ],
    [bases, t],
  );

  const statusOptions = useMemo(
    () => [
      { label: t("sharing.owner.filter.allStatuses"), value: "all" },
      { label: t("network.grantState.active"), value: "active" },
      { label: t("network.grantState.expired"), value: "expired" },
      { label: t("network.grantState.revoked"), value: "revoked" },
      { label: t("network.grantState.created"), value: "created" },
      { label: t("network.grantState.pending"), value: "pending" },
    ],
    [t],
  );

  const selectedBaseOptions = useMemo(
    () =>
      bases.map((entry) => ({
        label: entry.is_active
          ? `${entry.display_name} • ${t("sharing.owner.base.activeSuffix")}`
          : entry.display_name,
        value: entry.entry_id,
      })),
    [bases, t],
  );

  const previewMetrics = basePreviewMetrics(selectedBase, t);

  return (
    <FileHomeLayout
      badgeLabel={t("sharing.owner.badge")}
      contentScrollRef={contentScrollRef}
      layout="content-only"
      subtitle={t("sharing.owner.subtitle")}
      title={t("sharing.owner.title")}
    >
      {panelNotice ? (
        <FileHomeNotice tone={panelNotice.tone}>{panelNotice.message}</FileHomeNotice>
      ) : null}

      {inviteReadinessNotice && !showEnrollState ? (
        <FileHomeNotice tone="warning">{inviteReadinessNotice}</FileHomeNotice>
      ) : null}

      <FileHomeSection
        description={t("sharing.owner.createSection.description")}
        title={t("sharing.owner.createSection.title")}
      >
        <div ref={createSectionRef}>
        {showEnrollState ? (
          <FileHomeNotice tone="warning">{t("sharing.owner.readiness.enrollRequired")}</FileHomeNotice>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setPanelNotice(null);
              createGrantMutation.mutate();
            }}
          >
            <SharingFormFieldRow label={t("sharing.owner.field.base")}>
              <PopoverSelect
                ariaLabel={t("sharing.owner.field.base")}
                disabled={bases.length === 0}
                onChange={setSelectedBaseEntryId}
                options={selectedBaseOptions}
                triggerClassName="w-full min-w-0"
                value={selectedBase?.entry_id ?? ""}
              />
            </SharingFormFieldRow>

            {selectedBase ? (
              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground text-sm font-semibold">
                    {selectedBase.display_name}
                  </span>
                  {selectedBase.is_active ? (
                    <Badge tone="success" uppercase>
                      {t("sharing.owner.base.inUse")}
                    </Badge>
                  ) : null}
                </div>
                {previewMetrics.length > 0 ? (
                  <div className="mt-3">
                    <FileHomeSummaryGrid>
                      {previewMetrics.map((metric) => (
                        <FileHomeSummaryMetric key={metric.label} {...metric} />
                      ))}
                    </FileHomeSummaryGrid>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("sharing.owner.base.noSelection")}</p>
            )}

            <SharingFormFieldRow label={t("sharing.owner.field.recipient")}>
              <Input
                aria-label={t("sharing.owner.field.recipient")}
                onValueChange={setRecipientIdentityInput}
                placeholder={t("sharing.owner.field.recipientPlaceholder")}
                value={recipientIdentityInput}
              />
            </SharingFormFieldRow>

            <SharingFormFieldRow label={t("sharing.owner.field.expiresAt")}>
              <BaseShareGrantDateTimeField
                onChange={setExpiresAt}
                placeholder={t("sharing.owner.field.expiresAtPlaceholder")}
                value={expiresAt}
              />
            </SharingFormFieldRow>

            <div className="space-y-2">
              <span className="text-foreground text-sm font-medium">
                {t("sharing.owner.field.capability")}
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {(["read", "write", "admin"] as BaseShareGrantPermission[]).map((permission) => {
                    const selected = selectedPermission === permission;
                    return (
                      <button
                        key={permission}
                        type="button"
                        onClick={() => setSelectedPermission(permission)}
                        className={cn(
                          outlinedActionButtonClassName(false, "xs"),
                          "rounded-full px-3 py-1.5 uppercase tracking-wide",
                          selected && "border-menu-active-fg/50 bg-menu-hover-bg",
                          !selected && "opacity-80",
                        )}
                      >
                        {t(
                          permission === "read"
                            ? "network.permission.read"
                            : permission === "write"
                              ? "network.permission.write"
                              : "network.permission.admin",
                        )}
                      </button>
                    );
                  })}
                </div>
                <FileHomeManagementButton
                  disabled={
                    ownerActorRef === null ||
                    selectedBase === null ||
                    recipientIdentityInput.trim().length === 0 ||
                    createGrantMutation.isPending
                  }
                  onClick={() => {}}
                  type="submit"
                >
                  <span>
                    {createGrantMutation.isPending
                      ? t("sharing.owner.action.creating")
                      : t("sharing.owner.action.createGrant")}
                  </span>
                </FileHomeManagementButton>
              </div>
            </div>
          </form>
        )}
        </div>
      </FileHomeSection>

      <FileHomeSection
        description={t("sharing.owner.grantsSection.description")}
        title={t("sharing.owner.grantsSection.title")}
      >
        <div className="space-y-3">
          <Input
            aria-label={t("sharing.owner.search.placeholder")}
            onValueChange={setSearchQuery}
            placeholder={t("sharing.owner.search.placeholder")}
            value={searchQuery}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <PopoverSelect
              ariaLabel={t("sharing.owner.search.baseFilter")}
              disabled={grantSearchDisabled}
              onChange={setBaseFilter}
              options={baseOptions}
              triggerClassName="w-full min-w-0"
              value={baseFilter}
            />
            <PopoverSelect
              ariaLabel={t("sharing.owner.search.statusFilter")}
              disabled={grantSearchDisabled}
              onChange={setStatusFilter}
              options={statusOptions}
              triggerClassName="w-full min-w-0"
              value={statusFilter}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {ownerBaseShareManagementQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">{t("sharing.owner.loading.grants")}</p>
          ) : null}
          {ownerBaseShareManagementQuery.isError ? (
            <FileHomeNotice tone="error">
              {t("sharing.owner.error.loadGrants", {
                message: formatPanelError(
                  ownerBaseShareManagementQuery.error,
                  t("common.unavailable"),
                ),
              })}
            </FileHomeNotice>
          ) : null}

          {filteredGrants.map((grant) => {
            const rowInvite = mintedInvites[grant.grant_id] ?? null;
            const inviteOwnerDisplayName =
              inviteOwnerDisplayNames[grant.grant_id] ?? ownerActorRef ?? "";
            const inviteMessage = inviteMessages[grant.grant_id] ?? "";
            const shareDisabled = !inviteReady || inviteMutation.isPending;

            return (
              <BaseShareGrantCard
                key={grant.grant_id}
                cardRef={(element) => {
                  grantCardRefs.current[grant.grant_id] = element;
                }}
                copiedActionId={copiedActionId}
                grant={grant}
                highlighted={highlightedGrantId === grant.grant_id}
                inviteMessage={inviteMessage}
                inviteOwnerDisplayName={inviteOwnerDisplayName}
                isDeletePending={deleteGrantMutation.isPending}
                isRevokePending={revokeGrantMutation.isPending}
                onCopyInvite={() => {
                  void handleCopyInvite(grant);
                }}
                onDelete={() => {
                  setPanelNotice(null);
                  deleteGrantMutation.mutate(grant.grant_id);
                }}
                onInviteMessageChange={(value) =>
                  setInviteMessages((previous) => ({
                    ...previous,
                    [grant.grant_id]: value,
                  }))
                }
                onInviteOwnerDisplayNameChange={(value) =>
                  setInviteOwnerDisplayNames((previous) => ({
                    ...previous,
                    [grant.grant_id]: value,
                  }))
                }
                onMintInvite={() => {
                  setPanelNotice(null);
                  inviteMutation.mutate({
                    grantId: grant.grant_id,
                    ownerDisplayName: inviteOwnerDisplayName.trim() || undefined,
                    message: inviteMessage.trim() || undefined,
                  });
                }}
                inviteLinkRef={(element) => {
                  inviteLinkRefs.current[grant.grant_id] = element;
                }}
                onRevoke={() => {
                  setPanelNotice(null);
                  revokeGrantMutation.mutate(grant.grant_id);
                }}
                rowInvite={rowInvite}
                shareDisabled={shareDisabled}
                t={t}
              />
            );
          })}

          {ownerBaseShareManagementQuery.isSuccess && filteredGrants.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("sharing.owner.empty.noMatches")}</p>
          ) : null}
        </div>
      </FileHomeSection>
    </FileHomeLayout>
  );
}
