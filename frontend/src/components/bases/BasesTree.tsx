import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  backupRecipientBaseShare,
  fetchAccessIdentity,
  fetchDesktopActivation,
  fetchRecipientBaseShareView,
  removeRecipientBaseShare,
  renameRecipientBaseShare,
  setRecipientBaseShareMcpVisibility,
} from "@/api";
import { fetchRuntime } from "@/api/runtimeApi";
import {
  createBackup,
  createBase,
  deleteBase,
  deleteBackup,
  deleteExport,
  fetchBackups,
  fetchBases,
  fetchExports,
  renameBase,
  replaceActiveBase,
  setBaseAgentAccessMode,
  switchBase,
  unregisterBase,
} from "@/api/baseManagementApi";
import type { ExportSummary } from "@/api/baseManagementApi";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import {
  AgentVisibilityOnIcon,
  AgentVisibilityOffIcon,
  AddIcon,
  CircleCloseIcon,
  CopyIcon,
  CopySuccessIcon,
  DatabaseIcon,
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  ExportIcon,
  MergeIntoBaseIcon,
  ReloadIcon,
  RegisterBaseIcon,
  ShareBaseIcon,
  SquarePenIcon,
  WarningIcon,
} from "@/components/icons/Icons";
import type { Translator } from "@/i18n/translate";
import { useT } from "@/i18n/useT";
import { useUiPreferencesStore } from "@/stores/uiPreferencesStore";
import ActionButton from "@/components/ui/ActionButton";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import InlineConfirm from "@/components/tree/InlineConfirm";
import InlineItemEditor from "@/components/tree/InlineItemEditor";
import TreeHeader from "@/components/tree/TreeHeader";
import TreeItem from "@/components/tree/TreeItem";
import type { TelemetryBaseKind } from "@/api/telemetryApi";
import { trackBaseSwitched, trackModalOpened } from "@/lib/telemetry";
import { cn } from "@/lib/utils/cn";
import { useEditorStore } from "@/stores/editorStore";
import { useSharingStore } from "@/stores/sharingStore";
import { useRegisterExistingBaseModalStore } from "@/stores/registerExistingBaseModalStore";
import type {
  AccessIdentitySummary,
  AgentAccessMode,
  BackupSummary,
  BaseRegistryEntry,
  BaseShareSessionState,
  ManagedBaseSummary,
  RecipientBaseShareViewItem,
} from "@/types";
import BaseInspectModal from "@/components/bases/BaseInspectModal";
import { buildNewBaseDatabasePath } from "@/components/bases/newBasePath";
import RegisterExistingBaseModal from "@/components/bases/RegisterExistingBaseModal";
import { formatFileHomeTimestamp } from "@/components/editor/FileHomeBlocks";
import {
  managedBaseDisplayLabelKey,
  resolveManagedBaseDisplayLabel,
} from "@/types/source";
import type {
  FileHomeSource,
  LocalBaseSource,
  ManagedBaseKind,
  SharedBaseSource,
} from "@/types/source";

type CreatingMode = "new" | null;
type RenamingState = { entryId: string; currentName: string } | null;
type UnregisteringState = { entryId: string; displayName: string } | null;
type DeletingBaseState = { entryId: string; displayName: string } | null;
type SharedRenamingState = { grantId: string; currentName: string } | null;
type SharedDeletingState = { grantId: string; displayName: string } | null;
type InspectTarget = { path: string; kind: "artifact" | "backup" } | null;
type ArtifactTreeItem = {
  key: string;
  kindLabel: string;
  label: string;
  path: string;
  filename: string;
  notesCount: number | null;
  edgeCount: number | null;
  artifactId: string | null;
  sourceBaseId: string | null;
  registeredAt: string;
  source: FileHomeSource;
  onDelete: () => void;
  deleting: boolean;
};

function accessIdentityQueryKey(baseUrl: string) {
  return ["access-identity", baseUrl] as const;
}

function recipientBaseShareViewQueryKey(baseUrl: string, recipientActorRef: string | null) {
  return ["recipient-base-share-view", baseUrl, recipientActorRef] as const;
}

function basesQueryKey(baseUrl: string) {
  return ["bases", baseUrl] as const;
}

function backupsQueryKey(baseUrl: string) {
  return ["backups", baseUrl] as const;
}

function exportsQueryKey(baseUrl: string) {
  return ["exports", baseUrl] as const;
}

function recipientAccountIdFromActorRef(actorRef: string): string | null {
  if (!actorRef.startsWith("account:")) {
    return null;
  }
  const accountId = actorRef.slice("account:".length).trim();
  return accountId || null;
}

function sharedBaseOwnerLabel(item: RecipientBaseShareViewItem): string {
  const normalizedDisplayName = item.owner_display_name?.trim();
  if (normalizedDisplayName) {
    return normalizedDisplayName;
  }
  return item.owner_actor_ref;
}

function sharedBaseRowLabel(item: RecipientBaseShareViewItem): string {
  return item.share_base_title;
}

function isMcpVisible(value: { visible_in_mcp?: boolean | null }): boolean {
  return value.visible_in_mcp !== false;
}

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

function agentAccessTooltip(mode: AgentAccessMode, translate: Translator): string {
  if (mode === "read") {
    return translate("bases.tooltips.agentAccessRead");
  }
  if (mode === "hidden") {
    return translate("bases.tooltips.agentAccessHidden");
  }
  return translate("bases.tooltips.agentAccessWrite");
}

function renderSharedBasePermissionBadge(
  permission: RecipientBaseShareViewItem["permission"],
) {
  const tone: BadgeTone =
    permission === "read"
      ? "info"
      : permission === "write"
        ? "warning"
        : permission === "admin"
          ? "danger"
          : "neutral";
  return <Badge tone={tone} uppercase>{permission}</Badge>;
}

function localBaseSourceFromEntry(entry: BaseRegistryEntry): LocalBaseSource {
  return {
    kind: "local-base",
    id: `base:${entry.entry_id}`,
    label: entry.display_name,
    entryId: entry.entry_id,
    baseId: entry.base_id,
    stats: entry.stats,
  };
}

function sharedBaseSourceFromGrant(
  item: RecipientBaseShareViewItem,
  label: string,
  recipientAccountId: string | null,
): SharedBaseSource {
  return {
    kind: "shared-base",
    id: `shared-base:${item.grant_id}`,
    label,
    grantId: item.grant_id,
    shareBaseId: item.base_id,
    entryId: item.entry_id,
    recipientActorRef: item.recipient_actor_ref,
    recipientAccountId,
    permission: item.permission,
    ownerActorRef: item.owner_actor_ref,
    ownerDisplayName: item.owner_display_name,
    expiresAt: item.expires_at,
    grantState: item.grant_state,
    createdAt: item.created_at,
    activatedAt: item.activated_at,
    visibleInMcp: item.visible_in_mcp,
    authorityDbPath: item.authority_db_path,
    authorityAvailable: item.authority_available,
    baseStats: item.base_stats,
  };
}

function shouldShowSharedBaseSessionBadge(item: RecipientBaseShareViewItem): boolean {
  const sessionState = item.session_state;
  if (!sessionState || sessionState === "ready") {
    return false;
  }
  if (sessionState === "unavailable" && item.grant_state === "active") {
    return false;
  }
  if (sessionState === item.grant_state) {
    return false;
  }
  return true;
}

function sharedBaseSessionBadgeTone(sessionState: BaseShareSessionState): BadgeTone {
  if (sessionState === "revoked") {
    return "danger";
  }
  if (sessionState === "expired") {
    return "warning";
  }
  return "neutral";
}

function sharedBaseSessionStateLabel(
  sessionState: BaseShareSessionState,
  t: Translator,
): string {
  switch (sessionState) {
    case "revoked":
      return t("bases.sessionState.revoked");
    case "expired":
      return t("bases.sessionState.expired");
    case "unavailable":
      return t("bases.sessionState.unavailable");
    default:
      return sessionState;
  }
}

const BASES_TREE_SECTION_EXPANDED_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden";
const BASES_TREE_SECTION_BODY_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto px-2 py-1";
const BASES_TREE_CONTENT_SIZED_BODY_SCROLL_CLASS =
  "max-h-44 overflow-y-auto px-2 py-1";

function resolveRegistryEntryForSharedGrant(
  item: RecipientBaseShareViewItem,
  registryBases: BaseRegistryEntry[],
  inspectPath: string | null,
): BaseRegistryEntry | null {
  if (item.entry_id) {
    const entryById = registryBases.find((entry) => entry.entry_id === item.entry_id);
    if (entryById) {
      return entryById;
    }
  }
  const entryByBaseId = registryBases.find((entry) => entry.base_id === item.base_id);
  if (entryByBaseId) {
    return entryByBaseId;
  }
  if (inspectPath) {
    return registryBases.find((entry) => entry.path === inspectPath) ?? null;
  }
  return null;
}

function localBaseInspectSourceForSharedGrant(
  item: RecipientBaseShareViewItem,
  label: string,
  registryEntry: BaseRegistryEntry | null,
): LocalBaseSource {
  if (registryEntry) {
    return localBaseSourceFromEntry(registryEntry);
  }
  return {
    kind: "local-base",
    id: `shared-base-inspect:${item.grant_id}`,
    label,
    entryId: item.entry_id ?? item.grant_id,
    baseId: item.base_id,
    stats: item.base_stats ?? null,
  };
}

function fileHomeSourceFromExport(exp: ExportSummary): FileHomeSource {
  return {
    kind: "file-home",
    id: `export:${exp.path}`,
    label: exp.package_label ?? exp.filename,
    path: exp.path,
    filename: exp.filename,
    sizeBytes: exp.size_bytes,
    subjectKind: "export_artifact",
    managementScope: "managed_export",
  };
}

function deriveBackupPath(
  backup: BackupSummary,
  activeBasePath: string | null | undefined,
): string | null {
  if (backup.path && backup.path.trim().length > 0) {
    return backup.path;
  }
  if (!activeBasePath || activeBasePath.trim().length === 0) {
    return null;
  }
  const slashIndex = Math.max(activeBasePath.lastIndexOf("/"), activeBasePath.lastIndexOf("\\"));
  if (slashIndex < 0) {
    return null;
  }
  const parentDirectory = activeBasePath.slice(0, slashIndex);
  const separator =
    activeBasePath.includes("\\") && !activeBasePath.includes("/") ? "\\" : "/";
  return `${parentDirectory}${separator}backups${separator}${backup.filename}`;
}

function fileHomeSourceFromBackup(
  backup: BackupSummary,
  activeBasePath: string | null | undefined,
): FileHomeSource | null {
  const backupPath = deriveBackupPath(backup, activeBasePath);
  if (!backupPath) {
    return null;
  }
  return {
    kind: "file-home",
    id: `backup:${backupPath}`,
    label: backup.display_name ?? backup.filename,
    path: backupPath,
    filename: backup.filename,
    sizeBytes: backup.size_bytes,
    subjectKind: "backup_artifact",
    managementScope: "managed_backup",
  };
}

function artifactTreeItemFromExport(exp: ExportSummary): ArtifactTreeItem {
  return {
    key: `export:${exp.filename}`,
    kindLabel: "scoped export",
    label: exp.package_label ?? exp.filename,
    path: exp.path,
    filename: exp.filename,
    notesCount: exp.active_page_count ?? exp.page_count,
    edgeCount: exp.link_count,
    artifactId: exp.artifact_id,
    sourceBaseId: exp.source_base_id,
    registeredAt: exp.created_at,
    source: fileHomeSourceFromExport(exp),
    onDelete: () => undefined,
    deleting: false,
  };
}

function artifactTreeItemFromBackup(
  backup: BackupSummary,
  activeBasePath: string | null | undefined,
): ArtifactTreeItem | null {
  const source = fileHomeSourceFromBackup(backup, activeBasePath);
  if (!source) {
    return null;
  }
  return {
    key: `backup:${backup.filename}`,
    kindLabel: "backup",
    label: backup.filename,
    path: source.path,
    filename: backup.filename,
    notesCount: backup.active_page_count ?? backup.page_count ?? null,
    edgeCount: backup.link_count ?? null,
    artifactId: backup.artifact_id ?? null,
    sourceBaseId: backup.source_base_id ?? null,
    registeredAt: backup.created_at,
    source,
    onDelete: () => undefined,
    deleting: false,
  };
}

export default function BasesTree() {
  const t = useT();
  const locale = useUiPreferencesStore((state) => state.locale);
  const { activeSource, bridgeBaseUrl, onActivateSource } = useDesktopShellContext();
  const queryClient = useQueryClient();
  const openBaseSharing = useEditorStore((state) => state.openBaseSharing);
  const requestBaseSharePanelFocus = useSharingStore((state) => state.requestBaseSharePanelFocus);
  const openSource = useEditorStore((state) => state.openSource);
  const activeTabId = useEditorStore((state) => state.activeTabId);
  const setActiveTab = useEditorStore((state) => state.setActiveTab);
  const openSharedBaseSession = useEditorStore((state) => state.openSharedBaseSession);
  const tabs = useEditorStore((state) => state.tabs);
  const activeFileHomePath = useEditorStore((state) => {
    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
    const tabSource = activeTab?.sourceContext?.source;
    return tabSource?.kind === "file-home" ? tabSource.path : null;
  });
  const activeEditorTab = useEditorStore((state) =>
    state.tabs.find((tab) => tab.id === state.activeTabId) ?? null,
  );

  const [bases, setBases] = useState<BaseRegistryEntry[]>([]);
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [exports, setExports] = useState<ExportSummary[]>([]);
  const [isLoadingBases, setIsLoadingBases] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isLoadingExports, setIsLoadingExports] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isLocalExpanded, setIsLocalExpanded] = useState(true);
  const [isBasesExpanded, setIsBasesExpanded] = useState(true);
  const [isSharedWithMeExpanded, setIsSharedWithMeExpanded] = useState(false);
  const [isBuiltInExpanded, setIsBuiltInExpanded] = useState(false);
  const [isArtifactsExpanded, setIsArtifactsExpanded] = useState(false);
  const [creatingMode, setCreatingMode] = useState<CreatingMode>(null);
  const registerExistingModalOpen = useRegisterExistingBaseModalStore((state) => state.isOpen);
  const openRegisterExistingModal = useRegisterExistingBaseModalStore((state) => state.openModal);
  const previousRegisterExistingModalOpen = useRef(false);

  useEffect(() => {
    if (registerExistingModalOpen && !previousRegisterExistingModalOpen.current) {
      trackModalOpened(bridgeBaseUrl, "register_existing_base");
    }
    previousRegisterExistingModalOpen.current = registerExistingModalOpen;
  }, [bridgeBaseUrl, registerExistingModalOpen]);
  const [renamingState, setRenamingState] = useState<RenamingState>(null);
  const [unregisteringState, setUnregisteringState] = useState<UnregisteringState>(null);
  const [deletingBaseState, setDeletingBaseState] = useState<DeletingBaseState>(null);
  const [sharedRenamingState, setSharedRenamingState] = useState<SharedRenamingState>(null);
  const [sharedDeletingState, setSharedDeletingState] = useState<SharedDeletingState>(null);
  const [expandedBaseIds, setExpandedBaseIds] = useState<Set<string>>(new Set());
  const [expandedArtifactIds, setExpandedArtifactIds] = useState<Set<string>>(new Set());
  const [showDuplicatePaths, setShowDuplicatePaths] = useState(false);
  const [selectedLocalBaseEntryId, setSelectedLocalBaseEntryId] = useState<string | null>(null);
  const localSelectionInitializedRef = useRef(false);
  const [selectedBuiltInBaseRef, setSelectedBuiltInBaseRef] = useState<string | null>(null);
  const [selectedSharedGrantId, setSelectedSharedGrantId] = useState<string | null>(null);

  const [inspectTarget, setInspectTarget] = useState<InspectTarget>(null);
  const [deletingBackup, setDeletingBackup] = useState<string | null>(null);
  const [deletingExport, setDeletingExport] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSharedGrantIds, setExpandedSharedGrantIds] = useState<Set<string>>(new Set());
  const [expandedBuiltInResourceIds, setExpandedBuiltInResourceIds] = useState<Set<string>>(
    new Set(),
  );

  const desktopActivationQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-activation", bridgeBaseUrl],
    queryFn: () => fetchDesktopActivation(bridgeBaseUrl),
    retry: false,
    staleTime: 10_000,
  });
  const browserAccountSetupUsable =
    desktopActivationQuery.data?.usableCapabilities.browserAccountSetup === true;

  const accessIdentityQuery = useQuery<AccessIdentitySummary>({
    enabled:
      bridgeBaseUrl.length > 0 &&
      desktopActivationQuery.data !== undefined &&
      browserAccountSetupUsable,
    queryKey: accessIdentityQueryKey(bridgeBaseUrl),
    queryFn: () => fetchAccessIdentity(bridgeBaseUrl),
    refetchInterval: 30_000,
    retry: false,
  });

  const recipientActorRef = accessIdentityQuery.data?.recipient_actor_ref ?? null;
  const usableCapabilities = desktopActivationQuery.data?.usableCapabilities;
  const shareBaseUsable =
    usableCapabilities?.shareBase === true;
  const multiBaseUsable = usableCapabilities?.multiBase === true;
  const exportArtifactsVisible = true;
  const mcpVisibilityUsable = usableCapabilities?.managedPublicMcp === true;

  const recipientBaseShareViewQuery = useQuery<RecipientBaseShareViewItem[]>({
    enabled: bridgeBaseUrl.length > 0 && recipientActorRef !== null && shareBaseUsable,
    queryKey: recipientBaseShareViewQueryKey(bridgeBaseUrl, recipientActorRef),
    queryFn: () =>
      fetchRecipientBaseShareView(bridgeBaseUrl, {
        recipientActorRef: recipientActorRef ?? "",
        includeInactive: true,
      }),
    retry: false,
  });
  const basesRegistryQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: basesQueryKey(bridgeBaseUrl),
    queryFn: () => fetchBases(bridgeBaseUrl),
    refetchInterval: 30_000,
  });
  const backupsRegistryQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0 && isArtifactsExpanded,
    queryKey: backupsQueryKey(bridgeBaseUrl),
    queryFn: () => fetchBackups(bridgeBaseUrl),
  });
  const exportsRegistryQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0 && isArtifactsExpanded && exportArtifactsVisible,
    queryKey: exportsQueryKey(bridgeBaseUrl),
    queryFn: () => fetchExports(bridgeBaseUrl),
  });

  useEffect(() => {
    void loadBases();
  }, [bridgeBaseUrl]);

  useEffect(() => {
    if (basesRegistryQuery.data) {
      setBases(basesRegistryQuery.data.items);
    }
  }, [basesRegistryQuery.data]);

  useEffect(() => {
    if (localSelectionInitializedRef.current) {
      if (
        selectedLocalBaseEntryId !== null &&
        !bases.some((entry) => entry.entry_id === selectedLocalBaseEntryId)
      ) {
        setSelectedLocalBaseEntryId(null);
      }
      return;
    }
    if (selectedLocalBaseEntryId !== null) {
      localSelectionInitializedRef.current = true;
      return;
    }
    const activeBaseEntryId =
      basesRegistryQuery.data?.active_base?.entry_id ??
      bases.find((entry) => entry.is_active)?.entry_id ??
      null;
    if (activeBaseEntryId !== null) {
      setSelectedLocalBaseEntryId(activeBaseEntryId);
      localSelectionInitializedRef.current = true;
    }
  }, [
    bases,
    basesRegistryQuery.data?.active_base?.entry_id,
    selectedLocalBaseEntryId,
  ]);

  useEffect(() => {
    if (activeSource?.kind === "managed-base") {
      setIsBuiltInExpanded(true);
      setIsBasesExpanded(false);
      setSelectedBuiltInBaseRef(activeSource.baseRef);
      return;
    }
    if (activeSource?.kind === "shared-base") {
      setIsSharedWithMeExpanded(true);
      setIsBasesExpanded(false);
      setSelectedSharedGrantId(activeSource.grantId);
      return;
    }
    if (activeSource?.kind === "local-base") {
      setIsLocalExpanded(true);
      setIsBasesExpanded(true);
      setSelectedLocalBaseEntryId((current) => current ?? activeSource.entryId);
    }
  }, [activeSource]);

  useEffect(() => {
    if (backupsRegistryQuery.data) {
      setBackups(backupsRegistryQuery.data);
    }
  }, [backupsRegistryQuery.data]);

  useEffect(() => {
    if (exportsRegistryQuery.data) {
      setExports(exportsRegistryQuery.data);
    }
  }, [exportsRegistryQuery.data]);

  useEffect(() => {
    if (isArtifactsExpanded) {
      void loadBackups();
      if (exportArtifactsVisible) {
        void loadExports();
      }
    }
  }, [exportArtifactsVisible, isArtifactsExpanded, bridgeBaseUrl]);

  async function loadBases() {
    setIsLoadingBases(true);
    setErrorMessage(null);
    try {
      const result = await fetchBases(bridgeBaseUrl);
      setBases(result.items);
      queryClient.setQueryData(basesQueryKey(bridgeBaseUrl), result);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("bases.error.loadBases"),
      );
    } finally {
      setIsLoadingBases(false);
    }
  }

  async function loadBackups() {
    setIsLoadingBackups(true);
    try {
      const items = await fetchBackups(bridgeBaseUrl);
      setBackups(items);
      queryClient.setQueryData(backupsQueryKey(bridgeBaseUrl), items);
    } finally {
      setIsLoadingBackups(false);
    }
  }

  async function loadExports() {
    setIsLoadingExports(true);
    try {
      const items = await fetchExports(bridgeBaseUrl);
      setExports(items);
      queryClient.setQueryData(exportsQueryKey(bridgeBaseUrl), items);
    } finally {
      setIsLoadingExports(false);
    }
  }

  async function refreshLocalSources() {
    await loadBases();
    if (isArtifactsExpanded) {
      await loadBackups();
      if (exportArtifactsVisible) {
        await loadExports();
      }
    }
  }

  function copyToClipboard(value: string, id: string) {
    void navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function renderCopyActionIcon(copyId: string, sizeClass = "h-3.5 w-3.5") {
    return copiedId === copyId ? (
      <CopySuccessIcon className={sizeClass} />
    ) : (
      <CopyIcon className={sizeClass} />
    );
  }

  function toggleBaseExpand(entryId: string) {
    setExpandedBaseIds((previous) => {
      const next = new Set(previous);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }

  function toggleArtifactExpand(artifactId: string) {
    setExpandedArtifactIds((previous) => {
      const next = new Set(previous);
      if (next.has(artifactId)) {
        next.delete(artifactId);
      } else {
        next.add(artifactId);
      }
      return next;
    });
  }

  function toggleSharedGrantExpand(grantId: string) {
    setExpandedSharedGrantIds((previous) => {
      const next = new Set(previous);
      if (next.has(grantId)) {
        next.delete(grantId);
      } else {
        next.add(grantId);
      }
      return next;
    });
  }

  function toggleBuiltInResourceExpand(resourceId: string) {
    setExpandedBuiltInResourceIds((previous) => {
      const next = new Set(previous);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  }

  function resolveTelemetryBaseKind(baseKind: string | null): TelemetryBaseKind {
    if (baseKind === "managed" || baseKind === "shared") {
      return baseKind;
    }
    return "local";
  }

  async function handleSwitch(entryId: string): Promise<BaseRegistryEntry | null> {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const previousActiveEntry = bases.find((entry) => entry.is_active) ?? null;
      const switchedEntry = await switchBase(bridgeBaseUrl, entryId);
      trackBaseSwitched(bridgeBaseUrl, {
        fromBaseKind: resolveTelemetryBaseKind(previousActiveEntry?.base_kind ?? null),
        toBaseKind: resolveTelemetryBaseKind(switchedEntry.base_kind),
        toBaseId: entryId,
      });
      await loadBases();
      return switchedEntry;
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("bases.error.switchBase"),
      );
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateNew(displayName: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const slug = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "base";
      const timestamp = Date.now();
      const runtime = await fetchRuntime(bridgeBaseUrl);
      if (!runtime.locram_home) {
        throw new Error("Runtime summary is missing locram_home.");
      }
      const autoPath = buildNewBaseDatabasePath(runtime.locram_home, slug, timestamp);
      const created = await createBase(bridgeBaseUrl, {
        path: autoPath,
        display_name: displayName,
        activate: true,
      });
      setCreatingMode(null);
      await loadBases();
      await ensureShellActiveBase(created);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("bases.error.createBase"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function ensureShellActiveBase(entry: BaseRegistryEntry): Promise<boolean> {
    const source = localBaseSourceFromEntry(entry);
    if (entry.is_active) {
      await onActivateSource(source, { preserveCurrentTab: true });
      return false;
    }
    const switchedEntry = await switchBase(bridgeBaseUrl, entry.entry_id);
    await loadBases();
    await onActivateSource(localBaseSourceFromEntry(switchedEntry), { preserveCurrentTab: true });
    return true;
  }

  async function handleReplaceActiveBase(path: string): Promise<void> {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const entry = await replaceActiveBase(bridgeBaseUrl, path);
      await loadBases();
      setSelectedLocalBaseEntryId(entry.entry_id);
      await onActivateSource(localBaseSourceFromEntry(entry), { preserveCurrentTab: true });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("bases.error.replaceActiveBase"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function syncLocalBaseSourceTabs(
    entryId: string,
    renamedSource: LocalBaseSource,
    renamedEntry: BaseRegistryEntry,
  ) {
    const matchingSourceTabs = tabs.filter(
      (tab) =>
        tab.tabType === "source" &&
        tab.sourceContext?.source.kind === "local-base" &&
        tab.sourceContext.source.entryId === entryId,
    );
    if (matchingSourceTabs.length === 0) {
      return;
    }
    const previousActiveTabId = activeTabId;
    for (const tab of matchingSourceTabs) {
      setActiveTab(tab.id);
      openSource(renamedSource, {
        inspectContext: tab.sourceContext?.inspectContext
          ? {
              ...tab.sourceContext.inspectContext,
              entryId: renamedEntry.entry_id,
              isActive: renamedEntry.is_active,
              path: renamedEntry.path,
            }
          : undefined,
        mode: tab.sourceContext?.mode,
        selectedNodeId: tab.sourceContext?.selectedNodeId,
      });
    }
    if (previousActiveTabId) {
      setActiveTab(previousActiveTabId);
    }
  }

  async function handleOpenBaseSharing(entry: BaseRegistryEntry) {
    setErrorMessage(null);
    if (!shareBaseUsable) {
      setErrorMessage(t("bases.error.sharingRequiresPro"));
      return;
    }
    setIsSubmitting(true);
    try {
      await ensureShellActiveBase(entry);
      requestBaseSharePanelFocus("create");
      openBaseSharing();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t("bases.error.prepareSharing"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRename(entryId: string, displayName: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const renamedEntry = await renameBase(bridgeBaseUrl, entryId, displayName);
      const renamedSource = localBaseSourceFromEntry(renamedEntry);
      setRenamingState(null);
      await loadBases();
      syncLocalBaseSourceTabs(entryId, renamedSource, renamedEntry);
      if (
        activeSource?.kind === "local-base" &&
        activeSource.entryId === entryId
      ) {
        await onActivateSource(renamedSource, { preserveCurrentTab: true });
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("bases.error.renameBase"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUnregister(entry: BaseRegistryEntry) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await unregisterBase(bridgeBaseUrl, entry.entry_id);
      setUnregisteringState(null);
      await loadBases();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("bases.error.unregisterBase"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteRegisteredBase(entry: BaseRegistryEntry) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await deleteBase(bridgeBaseUrl, entry.entry_id);
      setDeletingBaseState(null);
      await loadBases();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("bases.error.deleteBase"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCycleBaseAgentAccess(entry: BaseRegistryEntry) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const currentMode = resolveAgentAccessMode(entry);
      await setBaseAgentAccessMode(
        bridgeBaseUrl,
        entry.entry_id,
        nextAgentAccessMode(currentMode),
      );
      await loadBases();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t("bases.error.updateMcpVisibility"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleSharedBaseMcpVisibility(item: RecipientBaseShareViewItem) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await setRecipientBaseShareMcpVisibility(
        bridgeBaseUrl,
        item.grant_id,
        !isMcpVisible(item),
      );
      await recipientBaseShareViewQuery.refetch();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t("bases.error.updateSharedMcpVisibility"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRenameSharedBase(grantId: string, shareBaseTitle: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await renameRecipientBaseShare(bridgeBaseUrl, grantId, shareBaseTitle);
      setSharedRenamingState(null);
      await recipientBaseShareViewQuery.refetch();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t("bases.error.renameSharedBase"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveSharedBase(grantId: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await removeRecipientBaseShare(bridgeBaseUrl, grantId);
      setSharedDeletingState(null);
      await recipientBaseShareViewQuery.refetch();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t("bases.error.removeSharedBase"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBackupSharedBase(item: RecipientBaseShareViewItem) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await backupRecipientBaseShare(bridgeBaseUrl, item.grant_id, "manual");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : t("bases.error.backupSharedBase"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBackupNow(entryId: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const entry = bases.find((baseEntry) => baseEntry.entry_id === entryId);
      if (!entry) {
        throw new Error(t("bases.error.baseNotFound"));
      }
      await ensureShellActiveBase(entry);
      await createBackup(bridgeBaseUrl, "manual");
      if (!isLocalExpanded) {
        setIsLocalExpanded(true);
      }
      if (!isArtifactsExpanded) {
        setIsArtifactsExpanded(true);
      } else {
        await loadBackups();
      }
      await loadBases();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("bases.error.backupBase"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteBackup(filename: string) {
    setIsSubmitting(true);
    try {
      await deleteBackup(bridgeBaseUrl, filename);
      setDeletingBackup(null);
      await loadBackups();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("bases.error.deleteBackup"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteExport(filename: string) {
    setIsSubmitting(true);
    try {
      await deleteExport(bridgeBaseUrl, filename);
      setDeletingExport(null);
      await loadExports();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("bases.error.deleteExport"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderBaseActions(entry: BaseRegistryEntry) {
    const activeBase = bases.find((baseEntry) => baseEntry.is_active);
    const agentAccessMode = resolveAgentAccessMode(entry);
    return (
      <>
        {shareBaseUsable && (
          <ActionButton
            ariaLabel={t("bases.tooltips.shareThisBase")}
            icon={<ShareBaseIcon className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e?.stopPropagation();
              void handleOpenBaseSharing(entry);
            }}
            title={t("bases.tooltips.shareThisBase")}
            disabled={isSubmitting}
          />
        )}
        {multiBaseUsable && (
          <ActionButton
            ariaLabel={t("bases.tooltips.mergeIntoActiveBase")}
            icon={<MergeIntoBaseIcon className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e?.stopPropagation();
              setInspectTarget({ path: entry.path, kind: "artifact" });
            }}
            title={
              entry.is_active
                ? t("bases.tooltips.cannotMergeBaseIntoItself")
                : t("bases.tooltips.mergeIntoActiveBase")
            }
            disabled={entry.is_active || isSubmitting || activeBase === undefined}
          />
        )}
        {mcpVisibilityUsable && (
          <ActionButton
            ariaLabel={agentAccessTooltip(agentAccessMode, t)}
            icon={
              agentAccessMode === "hidden" ? (
                <AgentVisibilityOffIcon className="h-3.5 w-3.5" />
              ) : (
                <AgentVisibilityOnIcon
                  className={cn(
                    "h-3.5 w-3.5",
                    agentAccessMode === "read"
                      ? "text-amber-500 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400",
                  )}
                />
              )
            }
            onClick={(e) => {
              e?.stopPropagation();
              void handleCycleBaseAgentAccess(entry);
            }}
            title={agentAccessTooltip(agentAccessMode, t)}
            active={agentAccessMode === "hidden"}
            disabled={isSubmitting}
          />
        )}
        {multiBaseUsable && (
          <ActionButton
            ariaLabel={t("bases.tooltips.rename")}
            icon={<EditIcon className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e?.stopPropagation();
              setRenamingState({ entryId: entry.entry_id, currentName: entry.display_name });
            }}
            title={t("bases.tooltips.rename")}
            disabled={isSubmitting}
          />
        )}
        <ActionButton
          ariaLabel={t("bases.tooltips.backupNow")}
          icon={<DownloadIcon className="h-3.5 w-3.5" />}
          onClick={(e) => {
            e?.stopPropagation();
            void handleBackupNow(entry.entry_id);
          }}
          title={t("bases.tooltips.backupNow")}
          disabled={isSubmitting}
        />
        <ActionButton
          ariaLabel={t("bases.tooltips.copyBaseId")}
          icon={renderCopyActionIcon(`base_id_btn_${entry.entry_id}`)}
          onClick={(e) => {
            e?.stopPropagation();
            copyToClipboard(entry.base_id, `base_id_btn_${entry.entry_id}`);
          }}
          title={t("bases.tooltips.copyBaseId")}
        />
        {multiBaseUsable ? (
          <ActionButton
            ariaLabel={t("bases.tooltips.unregister")}
            icon={<CircleCloseIcon className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e?.stopPropagation();
              setUnregisteringState({ entryId: entry.entry_id, displayName: entry.display_name });
            }}
            title={
              entry.is_active
                ? t("bases.tooltips.switchBeforeUnregister")
                : t("bases.tooltips.unregister")
            }
            disabled={isSubmitting || entry.is_active}
          />
        ) : null}
        <ActionButton
          ariaLabel={t("bases.tooltips.deleteBase")}
          className="group"
          icon={<DeleteIcon className="group-hover:text-destructive h-3.5 w-3.5" />}
          onClick={(e) => {
            e?.stopPropagation();
            setDeletingBaseState({ entryId: entry.entry_id, displayName: entry.display_name });
          }}
          title={
            entry.is_active
              ? t("bases.tooltips.switchBeforeDelete")
              : t("bases.tooltips.deleteBase")
          }
          disabled={!multiBaseUsable || isSubmitting || entry.is_active}
        />
      </>
    );
  }

  function formatBytes(bytes: number | null): string {
    if (bytes === null) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function renderBaseStatsSummary(
    stats: {
      page_count: number | null;
      active_page_count: number | null;
      link_count: number | null;
      size_bytes: number | null;
    } | null | undefined,
    labels: { page: "notes" | "nodes" } = { page: "notes" },
  ) {
    if (!stats) {
      return null;
    }

    const pageLabel =
      labels.page === "nodes" ? t("bases.detail.nodes") : t("bases.detail.notes");
    const pageValue =
      stats.active_page_count !== null
        ? stats.page_count !== null && stats.page_count !== stats.active_page_count
          ? t("bases.detail.activeOfTotal", {
              active: stats.active_page_count,
              total: stats.page_count,
            })
          : t("bases.detail.activeOnly", { active: stats.active_page_count })
        : "—";

    const statsRows = [
      { key: "page", label: pageLabel, value: pageValue },
      {
        key: "edges",
        label: t("bases.detail.edges"),
        value: stats.link_count !== null ? String(stats.link_count) : "—",
      },
      {
        key: "size",
        label: t("bases.detail.size"),
        value: formatBytes(stats.size_bytes),
      },
    ];

    return (
      <div className="mb-0.5 flex items-center gap-3 rounded-md px-2 py-0.5 text-xs">
        {statsRows.map(({ key, label, value }) => (
          <span key={key} className="flex items-center gap-1">
            <span className="text-text-secondary">{label}</span>
            <span className="text-foreground font-medium">{value}</span>
          </span>
        ))}
      </div>
    );
  }

  function renderInspectableDetails(
    details: Array<{
      label: string;
      value: string;
      copyId: string;
      isDate?: boolean;
    }>,
  ) {
    return details.map(({ label, value, copyId, isDate }) => (
      <div
        key={copyId}
        className="group flex items-center gap-2 rounded-md px-2 py-0.5 text-xs hover:bg-menu-hover-bg cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          copyToClipboard(value, copyId);
        }}
      >
        <span className="text-text-secondary shrink-0 font-mono">{label}</span>
        <span className="text-foreground min-w-0 flex-1 truncate font-mono">
          {isDate ? formatFileHomeTimestamp(value, t, locale) : value}
        </span>
        <span className="flex w-0 items-center overflow-hidden opacity-0 transition-all group-hover:w-auto group-hover:opacity-100">
          <ActionButton
            ariaLabel={t("bases.tooltips.copyValue", { label })}
            icon={renderCopyActionIcon(copyId, "h-3 w-3")}
            onClick={(e) => {
              e?.stopPropagation();
              copyToClipboard(value, copyId);
            }}
            title={t("bases.tooltips.copyValue", { label })}
          />
        </span>
      </div>
    ));
  }

  function renderBaseDetailChildren(entry: BaseRegistryEntry) {
    const details: Array<{
      label: string;
      value: string;
      copyId: string;
      isDate?: boolean;
    }> = [
      {
        label: t("bases.detail.baseId"),
        value: entry.base_id,
        copyId: `base_id_${entry.entry_id}`,
      },
      {
        label: t("bases.detail.entryId"),
        value: entry.entry_id,
        copyId: `entry_id_${entry.entry_id}`,
      },
    ];
    if (entry.registered_at) {
      details.push({
        label: t("bases.detail.registered"),
        value: entry.registered_at,
        copyId: `reg_${entry.entry_id}`,
        isDate: true,
      });
    }

    return (
      <>
        {renderBaseStatsSummary(entry.stats, { page: "notes" })}
        {renderInspectableDetails(details)}
      </>
    );
  }

  function baseOpenabilityLabel(
    openResult: string | null | undefined,
    openDetail: string | null | undefined,
  ): string | null {
    if (!openResult || openResult === "openable") {
      return null;
    }
    if (openDetail) {
      return openDetail.split("_").join(" ");
    }
    return openResult.split("_").join(" ");
  }

  function renderBase(entry: BaseRegistryEntry) {
    const isExpanded = expandedBaseIds.has(entry.entry_id);
    const hasDuplicate = multiBaseUsable && Boolean(entry.duplicate_warning);
    const isCurrentLocalWorkingBase =
      activeSource?.kind === "local-base"
        ? activeSource.entryId === entry.entry_id
        : activeSource === null
          ? entry.is_active
          : false;
    const isInUse = isCurrentLocalWorkingBase;
    const isInspectingThisBase =
      activeEditorTab?.tabType === "source" &&
      activeEditorTab.sourceContext?.mode === "inspect" &&
      activeEditorTab.sourceContext.source.kind === "local-base" &&
      activeEditorTab.sourceContext.source.entryId === entry.entry_id;
    const isSelected =
      selectedLocalBaseEntryId === entry.entry_id || isInspectingThisBase;
    const isActivated = isCurrentLocalWorkingBase;
    const agentAccessMode = resolveAgentAccessMode(entry);
    const openStateLabel = baseOpenabilityLabel(entry.open_result, entry.open_detail);

    const statusBadge = (
      <>
        {isInUse && (
          <Badge tone="success" uppercase>
            {t("bases.badge.inUse")}
          </Badge>
        )}
        {openStateLabel && (
          <Badge tone="warning" uppercase>
            {openStateLabel}
          </Badge>
        )}
        {agentAccessMode === "read" && (
          <Badge tone="warning" uppercase>
            {t("bases.badge.agentRead")}
          </Badge>
        )}
        {agentAccessMode === "hidden" && (
          <Badge tone="danger" uppercase>
            {t("bases.badge.mcpOff")}
          </Badge>
        )}
        {hasDuplicate && (
          <span className="text-warning" title={entry.duplicate_warning ?? undefined}>
            <WarningIcon className="h-3.5 w-3.5" />
          </span>
        )}
      </>
    );

    if (renamingState?.entryId === entry.entry_id) {
      return (
        <div key={entry.entry_id} className="mb-0.5">
          <InlineItemEditor
            initialValue={renamingState.currentName}
            placeholder={t("bases.placeholder.baseName")}
            actionName={t("bases.tooltips.rename")}
            ariaLabel={t("bases.tooltips.rename")}
            onConfirm={(value) => void handleRename(entry.entry_id, value)}
            onCancel={() => setRenamingState(null)}
            isSubmitting={isSubmitting}
            icon={<DatabaseIcon />}
          />
        </div>
      );
    }

    if (unregisteringState?.entryId === entry.entry_id) {
      return (
        <div key={entry.entry_id} className="mb-0.5">
          <InlineConfirm
            label={t("bases.confirm.unregister", {
              name: unregisteringState.displayName,
            })}
            actionName={t("bases.confirm.unregisterLabel")}
            subjectName={unregisteringState.displayName}
            subjectIcon={<DatabaseIcon />}
            isSubmitting={isSubmitting}
            onConfirm={() => void handleUnregister(entry)}
            onCancel={() => setUnregisteringState(null)}
            confirmLabel={t("bases.confirm.unregisterLabel")}
            tone="danger"
            icon={<CircleCloseIcon className="h-3.5 w-3.5" />}
          />
        </div>
      );
    }

    if (deletingBaseState?.entryId === entry.entry_id) {
      return (
        <div key={entry.entry_id} className="mb-0.5">
          <InlineConfirm
            label={t("bases.confirm.delete", {
              name: deletingBaseState.displayName,
            })}
            actionName={t("bases.confirm.deleteLabel")}
            subjectName={deletingBaseState.displayName}
            subjectIcon={<DatabaseIcon />}
            isSubmitting={isSubmitting}
            onConfirm={() => void handleDeleteRegisteredBase(entry)}
            onCancel={() => setDeletingBaseState(null)}
            confirmLabel={t("bases.confirm.deleteLabel")}
            tone="danger"
          />
        </div>
      );
    }

    const label = hasDuplicate
      ? `${entry.display_name} (${entry.duplicate_base_count ?? 2}×)`
      : entry.display_name;

    return (
      <TreeItem
        key={entry.entry_id}
        icon={<DatabaseIcon />}
        label={label}
        isActive={isSelected}
        isIconActive={isActivated}
        onClick={() => {
          if (!isSelected) {
            setSelectedBuiltInBaseRef(null);
            setSelectedSharedGrantId(null);
            setSelectedLocalBaseEntryId(entry.entry_id);
            if (entry.is_active) {
              void onActivateSource(localBaseSourceFromEntry(entry));
              return;
            }
            openSource(localBaseSourceFromEntry(entry), {
              inspectContext: {
                entryId: entry.entry_id,
                isActive: entry.is_active,
                openedFrom: "base-tree-inspect",
                path: entry.path,
              },
              mode: "inspect",
            });
            return;
          }
          if (!entry.is_active) {
            void (async () => {
              if (!multiBaseUsable) {
                await handleReplaceActiveBase(entry.path);
                return;
              }
              const switchedEntry = await handleSwitch(entry.entry_id);
              if (!switchedEntry) {
                return;
              }
              setSelectedBuiltInBaseRef(null);
              setSelectedSharedGrantId(null);
              setSelectedLocalBaseEntryId(switchedEntry.entry_id);
              await onActivateSource(localBaseSourceFromEntry(switchedEntry), {
                preserveCurrentTab: true,
              });
            })();
            return;
          }
          setSelectedBuiltInBaseRef(null);
          setSelectedSharedGrantId(null);
          setSelectedLocalBaseEntryId(entry.entry_id);
          void onActivateSource(localBaseSourceFromEntry(entry));
        }}
        actions={renderBaseActions(entry)}
        countIndicator={
          mcpVisibilityUsable && agentAccessMode === "hidden" ? (
            <AgentVisibilityOffIcon className="h-3.5 w-3.5 text-destructive" />
          ) : mcpVisibilityUsable && agentAccessMode === "read" ? (
            <AgentVisibilityOnIcon className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
          ) : undefined
        }
        count={entry.stats?.active_page_count ?? entry.stats?.page_count ?? 0}
        isExpanded={isExpanded}
        onToggle={() => toggleBaseExpand(entry.entry_id)}
      >
        {statusBadge}
        {renderBaseDetailChildren(entry)}
        {multiBaseUsable && showDuplicatePaths && entry.duplicate_paths && (
          <div className="mt-1 space-y-0.5 border-s border-warning/30 ps-2">
            <p className="text-warning px-2 py-0.5 text-xs font-semibold">
              Duplicate base_id entries ({entry.duplicate_base_count ?? entry.duplicate_paths.length}×):
            </p>
            {entry.duplicate_paths.map((dupPath, idx) => (
              <div
                key={dupPath}
                className="group flex items-center gap-2 rounded-md px-2 py-0.5 text-xs text-text-secondary hover:bg-menu-hover-bg"
              >
                <span className="text-text-secondary/60 shrink-0 font-mono">#{idx + 1}</span>
                <span className="min-w-0 flex-1 truncate font-mono">{dupPath}</span>
                <span className="flex w-0 items-center overflow-hidden opacity-0 transition-all group-hover:w-auto group-hover:opacity-100">
                  <ActionButton
                    ariaLabel={t("bases.tooltips.copyPath")}
                    icon={renderCopyActionIcon(`dup_${idx}_${entry.entry_id}`, "h-3 w-3")}
                    onClick={(e) => {
                      e?.stopPropagation();
                      copyToClipboard(dupPath, `dup_${idx}_${entry.entry_id}`);
                    }}
                    title={t("bases.tooltips.copyPath")}
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </TreeItem>
    );
  }

  function managedBaseSourceFromSummary(item: ManagedBaseSummary) {
    return {
      kind: "managed-base",
      id: item.base_ref,
      label: resolveManagedBaseDisplayLabel(item.kind, t),
      baseRef: item.base_ref,
      managedBaseKind: item.kind,
    } as const;
  }

  function activateManagedBase(item: ManagedBaseSummary) {
    void onActivateSource(managedBaseSourceFromSummary(item), {
      preserveCurrentTab: true,
    });
  }

  function renderGrantStateBadge(grantState: string) {
    const tone: BadgeTone =
      grantState === "active"
        ? "success"
        : grantState === "expired"
          ? "warning"
          : grantState === "revoked"
            ? "danger"
            : "neutral";
    return <Badge tone={tone} uppercase>{grantState}</Badge>;
  }

  function renderSharedBaseGrant(item: RecipientBaseShareViewItem) {
    const recipientAccountId = recipientAccountIdFromActorRef(item.recipient_actor_ref);
    const isExpanded = expandedSharedGrantIds.has(item.grant_id);
    const label = sharedBaseRowLabel(item);
    const authorityPath = item.authority_db_path ?? null;
    const localRegistryPath =
      bases.find((entry) => {
        if (item.entry_id && entry.entry_id === item.entry_id) {
          return true;
        }
        return entry.base_id === item.base_id;
      })?.path ?? null;
    const inspectPath = authorityPath ?? localRegistryPath;
    const sharedSource = sharedBaseSourceFromGrant(item, label, recipientAccountId);
    const isActive = activeSource?.id === sharedSource.id;
    const isInspectingThisSharedGrant =
      activeEditorTab?.tabType === "source" &&
      activeEditorTab.sourceContext?.mode === "inspect" &&
      activeEditorTab.sourceContext.inspectContext?.path === inspectPath &&
      inspectPath !== null;
    const isSelected =
      selectedSharedGrantId === item.grant_id || isInspectingThisSharedGrant || isActive;
    const mcpVisible = isMcpVisible(item);

    if (sharedRenamingState?.grantId === item.grant_id) {
      return (
        <div key={item.grant_id} className="mb-0.5">
          <InlineItemEditor
            initialValue={sharedRenamingState.currentName}
            placeholder={t("bases.placeholder.baseDisplayName")}
            actionName={t("bases.tooltips.renameForRecipient")}
            ariaLabel={t("bases.tooltips.renameForRecipient")}
            onConfirm={(value) => void handleRenameSharedBase(item.grant_id, value)}
            onCancel={() => setSharedRenamingState(null)}
            isSubmitting={isSubmitting}
            icon={<DatabaseIcon />}
          />
        </div>
      );
    }

    if (sharedDeletingState?.grantId === item.grant_id) {
      return (
        <div key={item.grant_id} className="mb-0.5">
          <InlineConfirm
            label={t("bases.confirm.removeFromShared", {
              name: sharedDeletingState.displayName,
            })}
            actionName={t("bases.tooltips.removeFromSharedWithMe")}
            subjectName={sharedDeletingState.displayName}
            subjectIcon={<DatabaseIcon />}
            isSubmitting={isSubmitting}
            onConfirm={() => void handleRemoveSharedBase(item.grant_id)}
            onCancel={() => setSharedDeletingState(null)}
            confirmLabel={t("common.delete")}
            tone="danger"
          />
        </div>
      );
    }

    const actions = (
      <>
        {mcpVisibilityUsable ? (
          <ActionButton
            ariaLabel={mcpVisible ? t("bases.tooltips.hideFromAgent") : t("bases.tooltips.showToAgent")}
            icon={
              mcpVisible ? (
                <AgentVisibilityOffIcon className="h-3.5 w-3.5" />
              ) : (
                <AgentVisibilityOnIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              )
            }
            onClick={(event) => {
              event?.stopPropagation();
              void handleToggleSharedBaseMcpVisibility(item);
            }}
            title={mcpVisible ? t("bases.tooltips.hideFromAgent") : t("bases.tooltips.showToAgent")}
            active={!mcpVisible}
            disabled={isSubmitting}
          />
        ) : null}
        <ActionButton
          ariaLabel={t("bases.tooltips.copyGrantId")}
          icon={renderCopyActionIcon(`shared_grant_btn_${item.grant_id}`)}
          onClick={(event) => {
            event?.stopPropagation();
            copyToClipboard(item.grant_id, `shared_grant_btn_${item.grant_id}`);
          }}
          title={t("bases.tooltips.copyGrantId")}
        />
        <ActionButton
          ariaLabel={t("bases.tooltips.removeFromSharedWithMe")}
          className="group"
          icon={<DeleteIcon className="group-hover:text-destructive h-3.5 w-3.5" />}
          onClick={(event) => {
            event?.stopPropagation();
            setSharedDeletingState({ grantId: item.grant_id, displayName: label });
          }}
          title={t("bases.tooltips.removeFromSharedWithMe")}
          disabled={isSubmitting}
        />
      </>
    );

    return (
      <TreeItem
        key={item.grant_id}
        icon={<DatabaseIcon />}
        label={label}
        isActive={isSelected}
        isIconActive={isActive}
        actions={actions}
        countIndicator={
          !mcpVisible ? (
            <AgentVisibilityOffIcon className="h-3.5 w-3.5 text-destructive" />
          ) : undefined
        }
        onClick={() => {
          setSelectedBuiltInBaseRef(null);
          setSelectedLocalBaseEntryId(null);
          setSelectedSharedGrantId(item.grant_id);
          void onActivateSource(sharedSource);
        }}
        count={item.base_stats?.active_page_count ?? item.base_stats?.page_count ?? 0}
        isExpanded={isExpanded}
        onToggle={() => toggleSharedGrantExpand(item.grant_id)}
      >
        <div className="mb-0.5 flex items-center gap-3 rounded-md px-2 py-0.5 text-xs">
          {renderGrantStateBadge(item.grant_state)}
          {renderSharedBasePermissionBadge(item.permission)}
          {!mcpVisible ? (
            <Badge tone="warning" uppercase>
              {t("bases.badge.mcpOff")}
            </Badge>
          ) : null}
          {shouldShowSharedBaseSessionBadge(item) && item.session_state ? (
            <Badge tone={sharedBaseSessionBadgeTone(item.session_state)} uppercase>
              {sharedBaseSessionStateLabel(item.session_state, t)}
            </Badge>
          ) : null}
        </div>
        {renderBaseStatsSummary(item.base_stats, { page: "nodes" })}
        {renderInspectableDetails([
          {
            label: t("bases.detail.entryId"),
            value: item.entry_id ?? "—",
            copyId: `shared_base_entry_${item.grant_id}`,
          },
          {
            label: t("bases.detail.owner"),
            value: sharedBaseOwnerLabel(item),
            copyId: `shared_base_owner_${item.grant_id}`,
          },
          {
            label: t("bases.detail.baseId"),
            value: item.base_id,
            copyId: `shared_base_id_${item.grant_id}`,
          },
          {
            label: t("bases.detail.grantId"),
            value: item.grant_id,
            copyId: `shared_base_grant_${item.grant_id}`,
          },
          {
            label: t("bases.detail.created"),
            value: item.created_at,
            copyId: `shared_base_created_${item.grant_id}`,
            isDate: true,
          },
          {
            label: t("bases.detail.activated"),
            value: item.activated_at ?? "—",
            copyId: `shared_base_activated_${item.grant_id}`,
            isDate: true,
          },
          {
            label: t("bases.detail.expires"),
            value: item.expires_at ?? "—",
            copyId: `shared_base_expires_${item.grant_id}`,
            isDate: true,
          },
          ...(item.authority_db_path
            ? [{
                label: t("fileHome.detail.path"),
                value: item.authority_db_path,
                copyId: `shared_base_path_${item.grant_id}`,
              }]
            : []),
        ])}
      </TreeItem>
    );
  }

  function renderBuiltInBase(item: ManagedBaseSummary) {
    const isExpanded = expandedBuiltInResourceIds.has(item.base_ref);
    const isInspectingThisBase =
      activeEditorTab?.tabType === "source" &&
      activeEditorTab.sourceContext?.mode === "inspect" &&
      activeEditorTab.sourceContext.source.kind === "managed-base" &&
      activeEditorTab.sourceContext.source.baseRef === item.base_ref;
    const isActive = activeSource?.id === item.base_ref;
    const isSelected =
      selectedBuiltInBaseRef === item.base_ref || isInspectingThisBase || isActive;
    const count =
      item.stats?.active_page_count ??
      item.stats?.page_count ??
      0;
    const displayLabel = t(managedBaseDisplayLabelKey(item.kind));
    const source = managedBaseSourceFromSummary(item);

    return (
      <TreeItem
        key={item.base_ref}
        icon={<DatabaseIcon />}
        label={displayLabel}
        isActive={isSelected}
        isIconActive={isActive}
        onClick={() => {
          if (!isSelected) {
            setSelectedLocalBaseEntryId(null);
            setSelectedSharedGrantId(null);
            setSelectedBuiltInBaseRef(item.base_ref);
            openSource(source, {
              mode: "inspect",
            });
            return;
          }
          setSelectedLocalBaseEntryId(null);
          setSelectedSharedGrantId(null);
          setSelectedBuiltInBaseRef(item.base_ref);
          activateManagedBase(item);
        }}
        count={count}
        isExpanded={isExpanded}
        onToggle={() => toggleBuiltInResourceExpand(item.base_ref)}
      >
        {renderBaseStatsSummary(item.stats)}
        {renderInspectableDetails(
          [
            {
              label: "version",
              value: item.mounted_version ?? "—",
              copyId: `${item.base_ref}_version`,
            },
            {
              label: t("bases.detail.baseId"),
              value: item.base_id ?? "—",
              copyId: `${item.base_ref}_base_id`,
            },
            {
              label: "base_ref",
              value: item.base_ref,
              copyId: `${item.base_ref}_base_ref`,
            },
            {
              label: "updated",
              value: item.updated_at,
              copyId: `${item.base_ref}_updated`,
              isDate: true,
            },
          ],
        )}
      </TreeItem>
    );
  }

  function renderArtifact(item: ArtifactTreeItem) {
    const isExpanded = expandedArtifactIds.has(item.key);
    const isBackup = item.kindLabel === "backup";
    const deleteLabel = isBackup
      ? t("bases.action.deleteBackup")
      : t("bases.action.deleteExport");
    const kindLabelDisplay = isBackup
      ? t("bases.kindLabel.backup")
      : t("bases.kindLabel.scopedExport");
    const isDeleting = item.deleting;

    if (isDeleting) {
      return (
        <div key={item.key} className="mb-0.5">
          <InlineConfirm
            label={t("bases.confirm.deleteArtifact", { label: item.label })}
            actionName={deleteLabel}
            subjectName={item.label}
            subjectIcon={<RegisterBaseIcon />}
            isSubmitting={isSubmitting}
            tone="danger"
            onConfirm={item.onDelete}
            onCancel={() => {
              if (item.kindLabel === "backup") {
                setDeletingBackup(null);
                return;
              }
              setDeletingExport(null);
            }}
            confirmLabel={t("common.delete")}
          />
        </div>
      );
    }

    return (
      <TreeItem
        key={item.key}
        icon={<RegisterBaseIcon />}
        label={item.label}
        isActive={activeFileHomePath === item.path}
        onClick={() =>
          openSource(item.source, {
            mode: "inspect",
          })
        }
        count={item.notesCount ?? 0}
        isExpanded={isExpanded}
        onToggle={() => toggleArtifactExpand(item.key)}
        actions={
          <>
            <ActionButton
              ariaLabel={t("bases.tooltips.copyPath")}
              icon={renderCopyActionIcon(`artifact_path_${item.key}`)}
              onClick={(event) => {
                event?.stopPropagation();
                copyToClipboard(item.path, `artifact_path_${item.key}`);
              }}
              title={t("bases.tooltips.copyPath")}
            />
            <ActionButton
              ariaLabel={deleteLabel}
              className="group"
              icon={<DeleteIcon className="group-hover:text-destructive h-3.5 w-3.5" />}
              onClick={(event) => {
                event?.stopPropagation();
                if (item.kindLabel === "backup") {
                  setDeletingBackup(item.filename);
                  return;
                }
                setDeletingExport(item.filename);
              }}
              title={deleteLabel}
            />
          </>
        }
      >
        <div className="space-y-0.5">
          <div className="mb-0.5 flex items-center gap-3 rounded-md px-2 py-0.5 text-xs">
            <span className="flex items-center gap-1">
              <span className="text-text-secondary">{t("bases.detail.type")}</span>
              <span className="text-foreground font-medium">{kindLabelDisplay}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-text-secondary">{t("bases.detail.notes")}</span>
              <span className="text-foreground font-medium">{item.notesCount ?? "—"}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-text-secondary">{t("bases.detail.edges")}</span>
              <span className="text-foreground font-medium">{item.edgeCount ?? "—"}</span>
            </span>
          </div>
          {renderInspectableDetails(
            [
              item.artifactId
                ? {
                    label: t("bases.detail.artifactId"),
                    value: item.artifactId,
                    copyId: `artifact_id_${item.key}`,
                  }
                : null,
              item.sourceBaseId
                ? {
                    label: t("bases.detail.sourceBaseId"),
                    value: item.sourceBaseId,
                    copyId: `artifact_source_${item.key}`,
                  }
                : null,
              {
                label: t("bases.detail.registered"),
                value: item.registeredAt,
                copyId: `artifact_registered_${item.key}`,
                isDate: true,
              },
            ].filter(
              (
                detail,
              ): detail is {
                label: string;
                value: string;
                copyId: string;
                isDate?: boolean;
              } => detail !== null,
            ),
          )}
        </div>
      </TreeItem>
    );
  }

  const localHeaderActions = (
    <>
      {multiBaseUsable ? (
        <ActionButton
          ariaLabel={t("bases.tooltips.createNewBase")}
          icon={<AddIcon className="h-3.5 w-3.5" />}
          onClick={(e) => {
            e?.stopPropagation();
            setCreatingMode("new");
          }}
          title={t("bases.tooltips.createNewBase")}
          active={creatingMode === "new"}
        />
      ) : null}
      <ActionButton
        ariaLabel={t("bases.tooltips.openDatabaseFile")}
        icon={<DatabaseIcon className="h-3.5 w-3.5" />}
        onClick={(e) => {
          e?.stopPropagation();
          openRegisterExistingModal();
        }}
        title={t("bases.tooltips.openDatabaseFile")}
        active={registerExistingModalOpen}
      />
      {multiBaseUsable ? (
        <ActionButton
          ariaLabel={showDuplicatePaths ? t("bases.tooltips.hideDuplicateEntries") : t("bases.tooltips.revealDuplicateEntries")}
          icon={<WarningIcon className="text-warning h-3.5 w-3.5" />}
          onClick={(e) => {
            e?.stopPropagation();
            setShowDuplicatePaths((current) => {
              const next = !current;
              if (next) {
                setExpandedBaseIds((previous) => {
                  const expandedIds = new Set(previous);
                  for (const entry of bases) {
                    if (entry.duplicate_warning) {
                      expandedIds.add(entry.entry_id);
                    }
                  }
                  return expandedIds;
                });
              }
              return next;
            });
          }}
          title={showDuplicatePaths ? t("bases.tooltips.hideDuplicateEntries") : t("bases.tooltips.revealDuplicateEntries")}
          active={showDuplicatePaths}
          disabled={!bases.some((entry) => Boolean(entry.duplicate_warning))}
        />
      ) : null}
      <ActionButton
        ariaLabel={t("bases.tooltips.refreshLocalSources")}
        icon={<ReloadIcon className="h-[13px] w-[13px]" />}
        onClick={(e) => {
          e?.stopPropagation();
          void refreshLocalSources();
        }}
        title={t("bases.tooltips.refreshLocalSources")}
      />
    </>
  );

  const emptyBasesContent = isLoadingBases ? (
    <p className="text-text-secondary px-2 py-4 text-center text-xs">
      {t("common.loading")}
    </p>
  ) : (
    <p className="text-text-secondary px-2 py-4 text-center text-xs">No local bases registered yet.</p>
  );

  const artifactRows = [
    ...backups
      .map((backup) => artifactTreeItemFromBackup(backup, basesRegistryQuery.data?.active_base?.path ?? null))
      .filter((item): item is ArtifactTreeItem => item !== null)
      .map((item) => ({
        ...item,
        deleting: deletingBackup === item.filename,
        onDelete: () => void handleDeleteBackup(item.filename),
      })),
    ...exports.map((exp) => ({
      ...artifactTreeItemFromExport(exp),
      deleting: deletingExport === exp.filename,
      onDelete: () => void handleDeleteExport(exp.filename),
    })),
  ].sort((left, right) => right.registeredAt.localeCompare(left.registeredAt));

  const builtInBases = basesRegistryQuery.data?.built_in_bases ?? [];

  const localBasesClaimsMainPane = isLocalExpanded && isBasesExpanded;

  return (
    <div className="bg-panel-background flex h-full min-h-0 flex-col overflow-hidden pb-2">
      {errorMessage && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive mx-2 mt-1 rounded-md px-2 py-1.5 text-xs">
          {errorMessage}
          <button
            type="button"
            className="ms-2 opacity-60 hover:opacity-100"
            onClick={() => setErrorMessage(null)}
          >
            ✕
          </button>
        </div>
      )}
      <div
        className={cn(
          isLocalExpanded ? BASES_TREE_SECTION_EXPANDED_CLASS : "shrink-0",
        )}
      >
        <TreeHeader
          title={t("bases.section.local")}
          expanded={isLocalExpanded}
          onToggle={() => setIsLocalExpanded((prev) => !prev)}
          actions={localHeaderActions}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden ps-3">
            <div
              className={cn(
                localBasesClaimsMainPane
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                  : "shrink-0",
              )}
            >
              <TreeHeader
                title={t("bases.section.bases")}
                expanded={isBasesExpanded}
                onToggle={() => setIsBasesExpanded((prev) => !prev)}
                uppercaseTitle={false}
              >
                <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
                  {multiBaseUsable && creatingMode === "new" && (
                    <div className="mb-2">
                      <InlineItemEditor
                        initialValue=""
                        placeholder={t("bases.placeholder.baseDisplayName")}
                        onConfirm={handleCreateNew}
                        onCancel={() => setCreatingMode(null)}
                        isSubmitting={isSubmitting}
                        icon={<DatabaseIcon className="h-3.5 w-3.5" />}
                      />
                    </div>
                  )}
                  {bases.length === 0 ? emptyBasesContent : bases.map((entry) => renderBase(entry))}
                </div>
              </TreeHeader>
            </div>

            <div className="shrink-0">
              <TreeHeader
                title={t("bases.section.artifacts")}
                expanded={isArtifactsExpanded}
                onToggle={() => setIsArtifactsExpanded((prev) => !prev)}
                uppercaseTitle={false}
              >
                <div
                  className={cn(
                    "px-2 py-1",
                    isArtifactsExpanded
                      ? "min-h-0 max-h-44 overflow-y-auto"
                      : undefined,
                  )}
                >
              {isLoadingBackups || (exportArtifactsVisible && isLoadingExports) ? (
                    <p className="text-text-secondary px-2 py-4 text-center text-xs">
                      {t("common.loading")}
                    </p>
                  ) : artifactRows.length === 0 ? (
                    <p className="text-text-secondary px-2 py-4 text-center text-xs">No artifacts found.</p>
                  ) : (
                    artifactRows.map((item) => renderArtifact(item))
                  )}
                </div>
              </TreeHeader>
            </div>
          </div>
        </TreeHeader>
      </div>

      {shareBaseUsable && (
        <div className="shrink-0">
          <TreeHeader
            title={t("bases.section.remote")}
            expanded={isSharedWithMeExpanded}
            onToggle={() => setIsSharedWithMeExpanded((prev) => !prev)}
            actions={
              <>
                <ActionButton
                  ariaLabel={t("bases.tooltips.addSharedBase")}
                  icon={<AddIcon className="h-3.5 w-3.5" />}
                  onClick={(event) => {
                    event?.stopPropagation();
                    openSharedBaseSession();
                  }}
                  title={t("bases.tooltips.addSharedBase")}
                />
                <ActionButton
                  ariaLabel={t("bases.tooltips.refreshRemoteSources")}
                  icon={<ReloadIcon className="h-[13px] w-[13px]" />}
                  onClick={(event) => {
                    event?.stopPropagation();
                    void recipientBaseShareViewQuery.refetch();
                  }}
                  title={t("bases.tooltips.refreshRemoteSources")}
                />
              </>
            }
          >
            <div
              className={BASES_TREE_CONTENT_SIZED_BODY_SCROLL_CLASS}
              data-testid="remote-bases-list"
            >
              {recipientActorRef === null ? (
                <p className="text-text-secondary px-2 py-4 text-center text-xs">
                  No recipient identity available for inbound shared bases.
                </p>
              ) : recipientBaseShareViewQuery.isLoading ? (
                <p className="text-text-secondary px-2 py-4 text-center text-xs">
                  {t("common.loading")}
                </p>
              ) : recipientBaseShareViewQuery.error ? (
                <p className="text-text-secondary px-2 py-4 text-center text-xs">
                  {recipientBaseShareViewQuery.error.message}
                </p>
              ) : recipientBaseShareViewQuery.data && recipientBaseShareViewQuery.data.length > 0 ? (
                recipientBaseShareViewQuery.data.map((item) => renderSharedBaseGrant(item))
              ) : (
                <p className="text-text-secondary px-2 py-4 text-center text-xs">
                  No shared bases available.
                </p>
              )}
            </div>
          </TreeHeader>
        </div>
      )}

      <div className="shrink-0">
        <TreeHeader
          title={t("bases.section.builtIn")}
          expanded={isBuiltInExpanded}
          onToggle={() => setIsBuiltInExpanded((prev) => !prev)}
        >
          <div
            className={BASES_TREE_CONTENT_SIZED_BODY_SCROLL_CLASS}
            data-testid="built-in-bases-list"
          >
            {basesRegistryQuery.isLoading ? (
              <p className="text-text-secondary px-2 py-4 text-center text-xs">
                {t("common.loading")}
              </p>
            ) : basesRegistryQuery.error ? (
              <p className="text-text-secondary px-2 py-4 text-center text-xs">
                {basesRegistryQuery.error.message}
              </p>
            ) : builtInBases.length > 0 ? (
              builtInBases.map((item) => renderBuiltInBase(item))
            ) : (
              <p className="text-text-secondary px-2 py-4 text-center text-xs">
                {t("bases.builtIn.statusUnavailable")}
              </p>
            )}
          </div>
        </TreeHeader>
      </div>

      {inspectTarget && (
        <BaseInspectModal
          path={inspectTarget.path}
          baseUrl={bridgeBaseUrl}
          freeReplaceEnabled={!multiBaseUsable}
          onClose={() => setInspectTarget(null)}
          onRegistered={() => {
            setInspectTarget(null);
            void loadBases();
          }}
          onMerged={() => {
            setInspectTarget(null);
            void loadBases();
          }}
          onReplaced={() => {
            setInspectTarget(null);
            void (async () => {
              await loadBases();
              const listing = await fetchBases(bridgeBaseUrl);
              if (listing.active_base) {
                setSelectedLocalBaseEntryId(listing.active_base.entry_id);
                await onActivateSource(
                  localBaseSourceFromEntry(listing.active_base),
                  { preserveCurrentTab: true },
                );
              }
            })();
          }}
        />
      )}
      <RegisterExistingBaseModal
        bridgeBaseUrl={bridgeBaseUrl}
        onOpened={() => {
          setIsLocalExpanded(true);
          setIsArtifactsExpanded(true);
        }}
      />
    </div>
  );
}
