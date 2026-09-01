import { type ButtonHTMLAttributes, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approvePendingAuthorization,
  connectAccess,
  disconnectAccess,
  embeddingSettingsQueryKey,
  fetchDesktopUserSettings,
  fetchDesktopEdition,
  fetchDesktopSetupStatus,
  fetchEmbeddingSettings,
  fetchMcpToolVisibility,
  fetchConnectedOAuthSessions,
  fetchPendingAuthorizations,
  logoutDesktopActivation,
  reconnectAccess,
  revokeAllConnectedOAuthSessions,
  revokeConnectedOAuthSession,
  updateDesktopUserSettings,
  updateEmbeddingSettings,
  updateMcpToolVisibility,
  type EmbeddingProvider,
  type EmbeddingRuntimePreferences,
} from "@/api";
import {
  GeneralSlidersIcon,
  ModelContextProtocolIcon,
  SettingsTerminalIcon,
  UserIcon,
} from "@/components/icons/Icons";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import CopyableId from "@/components/ui/CopyableId";
import PopoverSelect, {
  type PopoverSelectOption,
} from "@/components/ui/PopoverSelect";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import { FileHomeDetailField } from "@/components/editor/FileHomeBlocks";
import { Switch } from "@/components/ui/Switch";
import InterfaceSettingsSection, {
  APPEARANCE_SELECT_TRIGGER_CLASS_NAME,
  InterfaceSettingsCard,
} from "@/components/editor/settings/InterfaceSettingsSection";
import { useT } from "@/i18n/useT";
import type { DictionaryKey } from "@/i18n/dictionaries/en";
import type { Translator } from "@/i18n/translate";
import { useDesktopActivationController } from "@/hooks/useDesktopActivationController";
import type {
  AccessSummary,
  DesktopActivationStatus,
  DesktopUserSettings,
  McpToolVisibilitySettings,
  PendingAuthorizationRequest,
  ConnectedOAuthSession,
} from "@/types";
import {
  PRODUCT_WEB_BASE_URL_REQUIRED_MESSAGE,
  buildLocramBillingUrl,
  buildLocramCheckoutUrl,
  getConfiguredProductWebBaseUrl,
} from "@/lib/productWebUrls";
import {
  connectedOAuthSessionsQueryKey,
  pendingAuthorizationsQueryKey,
  shouldPollManagedMcpConnectorBridge,
} from "@/lib/settings/managedMcpConnectorQueries";
import {
  SETTINGS_CARD_DESCRIPTION_CLASS,
  SETTINGS_GROUP_HEADING_CLASS,
  SETTINGS_MUTED_NOTICE_CLASS,
  SETTINGS_SECONDARY_TEXT_CLASS,
  SETTINGS_SUMMARY_CLASS,
  settingsButtonClassName,
  settingsTabTriggerClassName,
} from "@/lib/settings/settingsUi";
import { cn } from "@/lib/utils/cn";
import {
  needsProDesktopActivation,
  resolveHasSignedInAccount,
} from "@/lib/desktopAccountSession";
import { deriveDesktopEntitlementView } from "@/lib/desktopEntitlements";
import {
  buildCodexMcpTomlSnippet,
  buildDesktopMcpJsonSnippet,
} from "@/lib/mcpClientSnippets";
import { useNotesTreeStore } from "@/stores/notesTreeStore";
import {
  BROWSER_FALLBACK_DESKTOP_VERSION,
  checkForDesktopUpdate,
  getInstalledDesktopVersion,
  getPendingDesktopUpdate,
  installPendingDesktopUpdate,
  updaterAvailable,
  type DesktopUpdateInfo,
} from "@/lib/appUpdater";
import { openExternalUrl } from "@/lib/externalLinks";
import {
  type DesktopRuntimeDiagnostics,
  fetchDesktopBuildProvenance,
  fetchDesktopRuntimeDiagnostics,
  restartDesktopRuntimeServices,
  repairDesktopRuntimeServices,
  runtimeDiagnosticsAvailable,
  type DesktopRuntimeActionResult,
  type RuntimeDiagnosticItem,
} from "@/lib/runtimeDiagnostics";
import { trackSettingsTabOpened } from "@/lib/telemetry";
import type { TelemetrySettingsTab } from "@/api/telemetryApi";

interface SettingsPanelProps {
  bridgeBaseUrl: string;
  onClose: () => void;
  selectedTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
}

type SettingsTab = "general" | "account" | "maintenance" | "mcp";

function settingsTabTelemetryValue(tab: SettingsTab): TelemetrySettingsTab | null {
  if (tab === "general" || tab === "account" || tab === "mcp") {
    return tab;
  }
  return null;
}

function accessQueryKey(baseUrl: string) {
  return ["access-summary", baseUrl] as const;
}

function pendingApprovalRedirectHost(redirectUri: string): string {
  try {
    return new URL(redirectUri).host;
  } catch {
    return redirectUri;
  }
}

const MCP_CONNECTOR_ACTION_COLUMN_CLASS = "flex shrink-0 justify-end";
const MCP_CONNECTOR_ACTION_BUTTON_CLASS = "rounded-md px-3 py-1.5 text-xs";
const MCP_CONNECTOR_APPROVE_BUTTON_CLASS =
  "hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300";
const MCP_CONNECTOR_REVOKE_BUTTON_CLASS =
  "hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300";

function McpConnectorDetailsGrid({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="mt-2 grid gap-1 text-xs">{children}</div>;
}

function McpConnectorDetailsRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className={mono ? undefined : "break-all"}>
      <span className={SETTINGS_SECONDARY_TEXT_CLASS}>{label}</span>{" "}
      <span className={cn(mono && "font-mono break-all")}>{value}</span>
    </div>
  );
}

function McpConnectorItemCard({
  title,
  detailsSummary,
  details,
  actionLabel,
  actionPending,
  actionButtonClassName,
  onAction,
}: {
  title: string;
  detailsSummary: string;
  details: ReactNode;
  actionLabel: string;
  actionPending: boolean;
  actionButtonClassName?: string;
  onAction: () => void;
}) {
  return (
    <div className="border-border/70 bg-muted/10 flex flex-col gap-3 rounded-lg border px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-foreground text-xs font-semibold">{title}</span>
        </div>
        <div className={MCP_CONNECTOR_ACTION_COLUMN_CLASS}>
          <SettingsButton
            className={cn(MCP_CONNECTOR_ACTION_BUTTON_CLASS, actionButtonClassName)}
            disabled={actionPending}
            onClick={onAction}
          >
            {actionLabel}
          </SettingsButton>
        </div>
      </div>
      <details className="border-border/70 bg-background/60 w-full rounded-lg border px-3 py-2">
        <summary className={SETTINGS_SUMMARY_CLASS}>{detailsSummary}</summary>
        {details}
      </details>
    </div>
  );
}

function PendingMcpConnectorItemCard({
  item,
  isApproving,
  onApprove,
}: {
  item: PendingAuthorizationRequest;
  isApproving: boolean;
  onApprove: () => void;
}) {
  const t = useT();
  const redirectHost = pendingApprovalRedirectHost(item.redirect_uri);

  return (
    <McpConnectorItemCard
      actionButtonClassName={MCP_CONNECTOR_APPROVE_BUTTON_CLASS}
      actionLabel={
        isApproving
          ? t("settings.mcp.pendingApproval.approving")
          : t("settings.mcp.pendingApproval.approve")
      }
      actionPending={isApproving}
      details={
        <McpConnectorDetailsGrid>
          <McpConnectorDetailsRow
            label={t("settings.mcp.pendingApproval.clientId")}
            mono
            value={item.client_id}
          />
          <McpConnectorDetailsRow
            label={t("settings.mcp.pendingApproval.redirectUri")}
            value={item.redirect_uri}
          />
          <McpConnectorDetailsRow
            label={t("settings.mcp.pendingApproval.expiresAt")}
            value={new Date(item.expires_at).toLocaleString()}
          />
        </McpConnectorDetailsGrid>
      }
      detailsSummary={t("settings.mcp.pendingApproval.modal.details")}
      onAction={onApprove}
      title={redirectHost}
    />
  );
}

function ConnectedMcpConnectorItemCard({
  item,
  isRevoking,
  onRevoke,
}: {
  item: ConnectedOAuthSession;
  isRevoking: boolean;
  onRevoke: () => void;
}) {
  const t = useT();

  return (
    <McpConnectorItemCard
      actionButtonClassName={MCP_CONNECTOR_REVOKE_BUTTON_CLASS}
      actionLabel={
        isRevoking
          ? t("settings.mcp.connectedSessions.revoking")
          : t("settings.mcp.connectedSessions.revoke")
      }
      actionPending={isRevoking}
      details={
        <McpConnectorDetailsGrid>
          <McpConnectorDetailsRow
            label={t("settings.mcp.pendingApproval.clientId")}
            mono
            value={item.client_id}
          />
          <McpConnectorDetailsRow
            label={t("settings.mcp.pendingApproval.redirectUri")}
            value={item.redirect_uri}
          />
          <McpConnectorDetailsRow
            label={t("settings.mcp.connectedSessions.approvedAt")}
            value={new Date(item.auth_time ?? item.issued_at).toLocaleString()}
          />
          <McpConnectorDetailsRow
            label={t("settings.mcp.connectedSessions.accessExpiresAt")}
            value={new Date(item.access_expires_at).toLocaleString()}
          />
        </McpConnectorDetailsGrid>
      }
      detailsSummary={t("settings.mcp.connectedSessions.details")}
      onAction={onRevoke}
      title={item.connector_label}
    />
  );
}

function basesQueryKey(baseUrl: string) {
  return ["bases", baseUrl] as const;
}

const CONNECT_ACTION_LABEL_KEYS: Record<string, DictionaryKey> = {
  started: "settings.connect.started",
  already_running: "settings.connect.alreadyRunning",
  failed: "settings.connect.failed",
  disabled: "settings.connect.disabled",
  enrollment_required: "settings.connect.enrollmentRequired",
  reauth_required: "settings.connect.reauthRequired",
  unsupported: "settings.connect.unsupported",
  restarted: "settings.connect.restarted",
};
const SETTINGS_RAIL_COLLAPSE_WIDTH = 760;

type SettingsBadgeTone = BadgeTone;
type AccountPlanState = "free" | "trial" | "pro";

const BADGE_PREVIEW_TONES: Array<{ label: string; tone: BadgeTone }> = [
  { label: "success", tone: "success" },
  { label: "info", tone: "info" },
  { label: "progress", tone: "progress" },
  { label: "warning", tone: "warning" },
  { label: "danger", tone: "danger" },
  { label: "premium", tone: "premium" },
  { label: "neutral", tone: "neutral" },
];

function friendlyConnectMessage(
  translate: Translator,
  action: string,
  details: string | null | undefined,
): string {
  const labelKey = CONNECT_ACTION_LABEL_KEYS[action];
  if (labelKey) {
    return translate(labelKey);
  }
  return details ?? action;
}

function SettingsButton({
  children,
  className,
  compact = false,
  disabled = false,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { compact?: boolean }) {
  return (
    <button
      className={cn(settingsButtonClassName(disabled, compact), className)}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

function SettingsInlineSpinner({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}

function SettingsBadge({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: SettingsBadgeTone;
}) {
  return (
    <Badge className={cn("tabular-nums", className)} tone={tone} uppercase>
      {children}
    </Badge>
  );
}

function accountPlanLabelKey(planState: AccountPlanState): DictionaryKey {
  if (planState === "pro") {
    return "settings.account.planPro";
  }
  if (planState === "trial") {
    return "settings.account.planTrial";
  }
  return "settings.account.planFree";
}

function accountPlanTone(planState: AccountPlanState): SettingsBadgeTone {
  if (planState === "pro") {
    return "premium";
  }
  if (planState === "trial") {
    return "progress";
  }
  return "neutral";
}

const STATUS_LABEL_KEYS: Record<string, DictionaryKey> = {
  active: "settings.status.active",
  connected: "settings.status.connected",
  disconnected: "settings.status.disconnected",
  live: "settings.status.live",
  pro: "settings.status.pro",
  admin: "settings.status.admin",
  free: "settings.status.free",
  activation_pending: "settings.status.activationPending",
  activation_transferred: "settings.status.activationTransferred",
  connecting: "settings.status.connecting",
  reconnecting: "settings.status.reconnecting",
  pending: "settings.status.pending",
  started: "settings.status.started",
  enrolled: "settings.status.enrolled",
  configured: "settings.status.configured",
  not_configured: "settings.status.notConfigured",
  not_activated: "settings.status.notActivated",
  activation_required: "settings.status.activationRequired",
  reauth_required: "settings.status.reauthRequired",
  unknown: "settings.status.unknown",
  failed_retryable: "settings.status.failedRetryable",
  grace: "settings.status.grace",
  interrupted: "settings.status.interrupted",
  missing: "settings.status.missing",
  offline: "settings.status.offline",
  stale: "settings.status.stale",
  disabled: "settings.status.disabled",
  expired: "settings.status.expired",
  failed: "settings.status.failed",
  failed_terminal: "settings.status.failedTerminal",
  invalid: "settings.status.invalid",
  loaded: "settings.status.loaded",
  ready: "settings.status.ready",
  running: "settings.status.running",
  unloaded: "settings.status.unloaded",
  degraded: "settings.status.degraded",
  conflict: "settings.status.conflict",
  needs_repair: "settings.status.needsRepair",
  dependency_missing: "settings.status.dependencyMissing",
  dependency_incomplete: "settings.status.dependencyIncomplete",
  revoked: "settings.status.revoked",
  unsupported: "settings.status.unsupported",
};

const MCP_FAMILY_LABEL_KEYS: Record<string, DictionaryKey> = {
  basic_notes_graph: "settings.mcp.family.basicNotesGraph.label",
  multi_base_working_set: "settings.mcp.family.multiBaseWorkingSet.label",
  local_base_administration: "settings.mcp.family.localBaseAdministration.label",
  artifacts_export: "settings.mcp.family.artifactsExport.label",
  merge_transfer: "settings.mcp.family.mergeTransfer.label",
  backups_restore: "settings.mcp.family.backupsRestore.label",
  smart_folders: "settings.mcp.family.smartFolders.label",
  source_scoped_workflows: "settings.mcp.family.sourceScopedWorkflows.label",
  diagnostics: "settings.mcp.family.diagnostics.label",
  destructive_tools: "settings.mcp.family.destructiveTools.label",
  indexing_maintenance: "settings.mcp.family.indexingMaintenance.label",
  internal: "settings.mcp.family.internal.label",
};

const MCP_FAMILY_DESCRIPTION_KEYS: Record<string, DictionaryKey> = {
  basic_notes_graph: "settings.mcp.family.basicNotesGraph.description",
  multi_base_working_set: "settings.mcp.family.multiBaseWorkingSet.description",
  local_base_administration:
    "settings.mcp.family.localBaseAdministration.description",
  artifacts_export: "settings.mcp.family.artifactsExport.description",
  merge_transfer: "settings.mcp.family.mergeTransfer.description",
  backups_restore: "settings.mcp.family.backupsRestore.description",
  smart_folders: "settings.mcp.family.smartFolders.description",
  source_scoped_workflows: "settings.mcp.family.sourceScopedWorkflows.description",
  diagnostics: "settings.mcp.family.diagnostics.description",
  destructive_tools: "settings.mcp.family.destructiveTools.description",
  indexing_maintenance: "settings.mcp.family.indexingMaintenance.description",
  internal: "settings.mcp.family.internal.description",
};

type EmbeddingSettingsDraft = {
  provider: EmbeddingProvider;
  huggingface_api_key: string;
  model: string;
  ollama_url: string;
};

const EMBEDDING_INPUT_CLASS_NAME =
  "border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm outline-none focus:border-foreground/40 lg:w-[240px]";

const EMBEDDING_PROVIDER_ORDER: EmbeddingProvider[] = [
  "locram_hosted",
  "huggingface",
  "ollama",
];

const EMBEDDING_PROVIDER_LABEL_KEYS: Record<EmbeddingProvider, DictionaryKey> = {
  locram_hosted: "settings.embedding.provider.locramHosted",
  huggingface: "settings.embedding.provider.huggingFace",
  ollama: "settings.embedding.provider.ollama",
};

function preferencesToEmbeddingDraft(
  preferences: EmbeddingRuntimePreferences,
): EmbeddingSettingsDraft {
  return {
    provider: preferences.provider,
    huggingface_api_key: "",
    model: preferences.model,
    ollama_url: preferences.ollama_url,
  };
}

function embeddingDraftMatchesSaved(
  draft: EmbeddingSettingsDraft,
  saved: EmbeddingRuntimePreferences,
): boolean {
  return (
    draft.provider === saved.provider &&
    draft.model === saved.model &&
    draft.ollama_url === saved.ollama_url &&
    draft.huggingface_api_key.length === 0
  );
}

function StatusBadge({
  state,
  className,
}: {
  state: string;
  className?: string;
}) {
  const t = useT();
  const normalized = state.toLowerCase().trim().replace(/\s+/g, "_");
  const labelKey = STATUS_LABEL_KEYS[normalized];
  const label = labelKey ? t(labelKey) : state.split("_").join(" ");
  return (
    <SettingsBadge className={className} tone={statusBadgeTone(state)}>
      {label}
    </SettingsBadge>
  );
}

function statusBadgeTone(state: string): SettingsBadgeTone {
  const normalized = state.toLowerCase().trim().replace(/\s+/g, "_");
  if (["active", "connected", "live", "loaded", "ready", "running"].includes(normalized)) {
    return "success";
  }
  if (["disconnected", "disabled"].includes(normalized)) {
    return "info";
  }
  if (["pro", "admin"].includes(normalized)) {
    return "premium";
  }
  if (
    [
      "activation_pending",
      "activation_transferred",
      "connecting",
      "reconnecting",
      "pending",
      "started",
    ].includes(normalized)
  ) {
    return "progress";
  }
  if (
    [
      "enrolled",
      "configured",
      "not_configured",
      "not_activated",
      "activation_required",
      "free",
      "reauth_required",
      "unknown",
    ].includes(normalized)
  ) {
    return "info";
  }
  if (
    [
      "failed_retryable",
      "grace",
      "interrupted",
      "missing",
      "offline",
      "stale",
      "degraded",
      "dependency_incomplete",
      "needs_repair",
      "unloaded",
    ].includes(normalized)
  ) {
    return "warning";
  }
  if (
    [
      "disabled",
      "expired",
      "failed",
      "failed_terminal",
      "conflict",
      "dependency_missing",
      "invalid",
      "revoked",
      "unsupported",
    ].includes(normalized)
  ) {
    return "danger";
  }
  return "neutral";
}

const RUNTIME_CONFIDENCE_LABEL_KEYS: Record<string, DictionaryKey> = {
  "confirmed-managed": "settings.runtime.confidence.confirmedManaged",
  "probably-managed": "settings.runtime.confidence.probablyManaged",
  unverified: "settings.runtime.confidence.unverified",
  "stale-managed": "settings.runtime.confidence.staleManaged",
  "foreign-conflict": "settings.runtime.confidence.foreignConflict",
  unknown: "settings.runtime.confidence.unknown",
};

const RUNTIME_DETAIL_LABEL_KEYS: Record<string, DictionaryKey> = {
  pid: "settings.runtime.detail.pid",
  port: "settings.runtime.detail.port",
  managed_service: "settings.runtime.detail.managedService",
};

const RUNTIME_PROCESS_RELATION_LABEL_KEYS: Record<string, DictionaryKey> = {
  listener: "settings.runtime.processRelation.listener",
  parent: "settings.runtime.processRelation.parent",
  process: "settings.runtime.processRelation.process",
};

function runtimeConfidenceTone(confidence: string): SettingsBadgeTone {
  const normalized = confidence.toLowerCase().trim();
  if (normalized === "confirmed-managed") {
    return "success";
  }
  if (normalized === "probably-managed") {
    return "info";
  }
  if (normalized === "stale-managed" || normalized === "unverified") {
    return "warning";
  }
  if (normalized === "foreign-conflict") {
    return "danger";
  }
  return "neutral";
}

function RuntimeConfidenceBadge({
  confidence,
  className,
}: {
  confidence: string;
  className?: string;
}) {
  const t = useT();
  const labelKey = RUNTIME_CONFIDENCE_LABEL_KEYS[confidence];
  const label = labelKey ? t(labelKey) : confidence;
  return (
    <SettingsBadge className={className} tone={runtimeConfidenceTone(confidence)}>
      {label}
    </SettingsBadge>
  );
}

function RuntimeInventoryItem({ item }: { item: RuntimeDiagnosticItem }) {
  const t = useT();
  const details = item.details ?? [];
  const observedProcesses = item.observed_processes ?? [];
  const summaryIdentity = item.summary_identity ?? item.identity;
  const showManagedConfidence =
    item.show_managed_confidence ?? item.category === "service";
  const inlinePortDetail =
    item.kind === "http-mcp-service"
      ? details.find((detail) => detail.kind === "port") ?? null
      : null;
  const inlinePortLabel = inlinePortDetail
    ? t("settings.runtime.detail.port", { port: inlinePortDetail.value })
    : null;
  const detailLabels = details
    .filter((detail) => !(detail.kind === "port" && inlinePortDetail?.value === detail.value))
    .filter((detail) => !(detail.kind === "pid" && observedProcesses.length > 0))
    .map((detail) => {
      const labelKey = RUNTIME_DETAIL_LABEL_KEYS[detail.kind];
      if (!labelKey) {
        return detail.value;
      }
      if (detail.kind === "pid") {
        return t(labelKey, { pid: detail.value });
      }
      if (detail.kind === "port") {
        return t(labelKey, { port: detail.value });
      }
      return t(labelKey, { label: detail.value });
    })
    .filter(Boolean);
  return (
    <div className="border-border/70 bg-muted/10 flex flex-col gap-3 rounded-lg border px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-foreground text-sm font-semibold">{item.label}</div>
          {summaryIdentity ? (
            <div className={cn("mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs", SETTINGS_SECONDARY_TEXT_CLASS)}>
              <span>{summaryIdentity}</span>
              {inlinePortLabel ? <span>{inlinePortLabel}</span> : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge state={item.state} className="px-2 py-0.5 text-[10px]" />
          {showManagedConfidence ? (
            <RuntimeConfidenceBadge
              confidence={item.managed_confidence}
              className="px-2 py-0.5 text-[10px]"
            />
          ) : null}
        </div>
      </div>
      {detailLabels.length > 0 ? (
        <div className={cn("flex flex-wrap gap-x-3 gap-y-1 text-xs", SETTINGS_SECONDARY_TEXT_CLASS)}>
          {detailLabels.map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
        </div>
      ) : null}
      {observedProcesses.length > 0 ? (
        <details className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-foreground">
            {t("settings.runtime.observedProcesses", {
              count: observedProcesses.length,
            })}
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {observedProcesses.map((process) => {
              const relationKey = RUNTIME_PROCESS_RELATION_LABEL_KEYS[process.relation];
              const relationLabel = relationKey ? t(relationKey) : process.relation;
              return (
                <div
                  key={`${item.kind}-${process.relation}-${process.pid}`}
                  className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <SettingsBadge>{relationLabel}</SettingsBadge>
                    <span className={cn("text-xs", SETTINGS_SECONDARY_TEXT_CLASS)}>
                      {t("settings.runtime.detail.pid", { pid: process.pid })}
                    </span>
                  </div>
                  <div className="mt-2 break-all font-mono text-xs text-foreground">
                    {process.command}
                  </div>
                  {process.runtime_home ? (
                    <div className={cn("mt-2 break-all text-xs", SETTINGS_SECONDARY_TEXT_CLASS)}>
                      {t("settings.runtime.processRuntimeHome", {
                        path: process.runtime_home,
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
      {item.last_error ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            item.managed_confidence === "foreign-conflict"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              : "border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300",
          )}
        >
          {item.last_error}
        </div>
      ) : null}
    </div>
  );
}

function runtimeRepairTarget(
  items: RuntimeDiagnosticItem[],
): RuntimeDiagnosticItem | null {
  return items.find((item) => {
    if (
      item.managed_confidence === "stale-managed" ||
      item.managed_confidence === "unverified"
    ) {
      return true;
    }
    return (
      matches(item.kind, ["http-mcp-service", "embed-runner-service"]) &&
      matches(item.state, ["missing", "unloaded"])
    );
  }) ?? null;
}

function runtimeDegradedTarget(
  items: RuntimeDiagnosticItem[],
): RuntimeDiagnosticItem | null {
  return items.find((item) => {
    if (item.state === "degraded") {
      return true;
    }
    return (
      matches(item.kind, ["desktop-bridge", "access-relay", "access-local-mcp"]) &&
      item.state !== "running"
    );
  }) ?? null;
}

function runtimeDependencyTarget(
  items: RuntimeDiagnosticItem[],
  state: "missing" | "pending" | "degraded",
): RuntimeDiagnosticItem | null {
  return items.find((item) => item.category === "dependency" && item.state === state) ?? null;
}

function runtimeRepairableForeignHttpMcpConflict(
  items: RuntimeDiagnosticItem[],
): boolean {
  const httpMcpItem = items.find((item) => item.kind === "http-mcp-service");
  return (
    httpMcpItem?.managed_confidence === "foreign-conflict" &&
    httpMcpItem.managed_service_active === true
  );
}

function runtimeRepairableForeignAccessRuntimeHome(
  items: RuntimeDiagnosticItem[],
): string | null {
  const localMcpItem = items.find((item) => item.kind === "access-local-mcp");
  const relayItem = items.find((item) => item.kind === "access-relay");
  if (
    localMcpItem?.managed_confidence !== "foreign-conflict" ||
    relayItem?.managed_confidence !== "foreign-conflict"
  ) {
    return null;
  }
  const localMcpProcess = localMcpItem.observed_processes.find(
    (process) =>
      process.relation === "listener" &&
      process.command.includes("serve-http") &&
      process.command.includes("locram.views."),
  );
  const relayProcess = relayItem.observed_processes.find(
    (process) =>
      process.relation === "parent" &&
      process.command.includes("locram.views.cli.commands.access_relay"),
  );
  const localMcpRuntimeHome = localMcpProcess?.runtime_home ?? null;
  if (
    !localMcpRuntimeHome ||
    !relayProcess?.runtime_home ||
    relayProcess.runtime_home !== localMcpRuntimeHome
  ) {
    return null;
  }
  return localMcpRuntimeHome;
}

function matches(value: string, values: string[]): boolean {
  return values.includes(value);
}

function formatEmbeddingProviderLabel(translate: Translator, provider: string): string {
  if (provider === "ollama") {
    return translate("settings.embedding.provider.ollama");
  }
  if (provider === "huggingface") {
    return translate("settings.embedding.provider.huggingFace");
  }
  return translate("settings.embedding.provider.locramHosted");
}

function describeRuntimeSummary(
  translate: Translator,
  diagnostics: DesktopRuntimeDiagnostics | null | undefined,
): string {
  if (!diagnostics) {
    return translate("settings.runtime.notice.healthy");
  }
  if (diagnostics.overall_state === "conflict") {
    return translate("settings.runtime.notice.conflict");
  }
  if (diagnostics.overall_state === "unsupported") {
    return translate("settings.runtime.notice.unsupported");
  }
  if (diagnostics.overall_state === "needs_repair") {
    const repairItem = runtimeRepairTarget(diagnostics.items);
    return repairItem
      ? translate("settings.runtime.notice.needsRepair", { label: repairItem.label })
      : translate("settings.runtime.notice.notOperable");
  }
  if (diagnostics.overall_state === "degraded") {
    const degradedItem = runtimeDegradedTarget(diagnostics.items);
    return degradedItem
      ? translate("settings.runtime.notice.degraded", { label: degradedItem.label })
      : translate("settings.runtime.notice.notOperable");
  }
  if (diagnostics.overall_state === "dependency_missing") {
    const missingDependency = runtimeDependencyTarget(diagnostics.items, "missing");
    return missingDependency
      ? translate("settings.runtime.notice.dependencyMissing", { label: missingDependency.label })
      : translate("settings.runtime.notice.notOperable");
  }
  if (diagnostics.overall_state === "dependency_incomplete") {
    const incompleteDependency =
      runtimeDependencyTarget(diagnostics.items, "pending") ??
      runtimeDependencyTarget(diagnostics.items, "degraded");
    return incompleteDependency
      ? translate("settings.runtime.notice.dependencyIncomplete", {
          label: incompleteDependency.label,
        })
      : translate("settings.runtime.notice.embeddingPending");
  }
  if (!diagnostics.operable) {
    return translate("settings.runtime.notice.notOperable");
  }
  if (!diagnostics.embedding_dependencies_ready) {
    return translate("settings.runtime.notice.embeddingPending");
  }
  return translate("settings.runtime.notice.healthy");
}

function runtimeCanRestart(diagnostics: DesktopRuntimeDiagnostics | null | undefined): boolean {
  if (!diagnostics) {
    return false;
  }
  return matches(diagnostics.overall_state, ["healthy", "degraded"]);
}

function runtimeCanRepair(diagnostics: DesktopRuntimeDiagnostics | null | undefined): boolean {
  if (!diagnostics) {
    return false;
  }
  if (diagnostics.overall_state === "needs_repair") {
    return true;
  }
  if (diagnostics.overall_state !== "conflict") {
    return false;
  }
  return (
    runtimeRepairableForeignAccessRuntimeHome(diagnostics.items) !== null ||
    runtimeRepairableForeignHttpMcpConflict(diagnostics.items)
  );
}

function describeRuntimeActionAvailability(
  translate: Translator,
  diagnostics: DesktopRuntimeDiagnostics | null | undefined,
): string | null {
  if (!diagnostics) {
    return null;
  }
  switch (diagnostics.overall_state) {
    case "degraded":
      return translate("settings.runtime.actionHint.degraded");
    case "needs_repair":
      return translate("settings.runtime.actionHint.needsRepair");
    case "conflict":
      return runtimeCanRepair(diagnostics)
        ? translate("settings.runtime.actionHint.conflictRepairable")
        : translate("settings.runtime.actionHint.conflict");
    case "dependency_missing":
      return translate("settings.runtime.actionHint.dependencyMissing");
    case "dependency_incomplete":
      return translate("settings.runtime.actionHint.dependencyIncomplete");
    case "unsupported":
      return translate("settings.runtime.actionHint.unsupported");
    case "healthy":
      return null;
    default:
      return diagnostics.operable
        ? null
        : translate("settings.runtime.actionHint.unavailable");
  }
}

function runtimeActionProgressLabel(
  translate: Translator,
  pending: {
    restart: boolean;
    repair: boolean;
  },
): string | null {
  if (pending.repair) {
    return translate("settings.runtime.action.repairing");
  }
  if (pending.restart) {
    return translate("settings.runtime.action.restarting");
  }
  return null;
}

function runtimeActionFeedbackTone(action: string): "success" | "warning" {
  return ["repair-warning", "repair-partial", "repair-pending", "repair-failed"].includes(
    action,
  )
    ? "warning"
    : "success";
}

function translatedEntitlementText(
  translate: Translator,
  activation: DesktopActivationStatus | undefined,
  accessSummary: AccessSummary | undefined,
): string | null {
  const lease = activation?.entitlementLease ?? null;
  switch (lease?.state) {
    case "active":
      return null;
    case "expired":
      return translate("settings.entitlement.expired");
    case "revoked":
      return activation?.lastAttempt?.errorCode === "activation_transferred"
        ? translate("settings.entitlement.transferred")
        : translate("settings.entitlement.revoked");
    case "invalid":
      return translate("settings.entitlement.invalid");
    case "missing":
      return translate("settings.entitlement.missing");
    case "grace":
      return translate("settings.entitlement.grace");
    default:
      return accessSummary?.status.enrollment_material_present
        ? translate("settings.entitlement.waitingForLease")
        : translate("settings.entitlement.createdAfterActivation");
  }
}

function FixedField({
  copyable = false,
  fitContent = false,
  hideLabel = false,
  label,
  multiline = false,
  value,
}: {
  copyable?: boolean;
  fitContent?: boolean;
  hideLabel?: boolean;
  label: string;
  multiline?: boolean;
  value: string | null | undefined;
}) {
  const hasValue = Boolean(value && value.trim());
  const displayValue = hasValue ? value! : "Not available yet";
  const multilineRows = fitContent
    ? Math.max(displayValue.split("\n").length + 1, 6)
    : 6;
  return (
    <div className="flex flex-col gap-2">
      {!hideLabel ? (
        <div className="text-foreground text-sm font-medium">
          {label}
        </div>
      ) : null}
      <div className="w-full">
        {multiline ? (
          <div className="relative">
            <textarea
              className={cn(
                "border-input bg-muted/20 text-foreground w-full rounded-md border px-2.5 py-2 text-xs leading-5 outline-none",
                fitContent ? "resize-none" : "min-h-28",
              )}
              readOnly
              rows={multilineRows}
              value={displayValue}
            />
            {hasValue && copyable && (
              <div className="absolute top-1.5 right-1.5">
                <CopyableId
                  value={value!}
                  ariaLabel={`Copy ${label}`}
                  title={`Copy ${label}`}
                  iconOnly
                />
              </div>
            )}
          </div>
        ) : (
          <div className="border-input bg-muted/20 text-foreground flex items-center gap-2 rounded-md border px-3 py-2 text-xs leading-5">
            <span className="min-w-0 flex-1 break-all">{displayValue}</span>
            {hasValue && copyable && (
              <CopyableId
                value={value!}
                ariaLabel={`Copy ${label}`}
                title={`Copy ${label}`}
                iconOnly
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsNavigationTabItem({
  collapsed,
  icon,
  label,
  value,
  pendingBadgeCount = 0,
}: {
  collapsed: boolean;
  icon: ReactNode;
  label: string;
  value: SettingsTab;
  pendingBadgeCount?: number;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(settingsTabTriggerClassName(collapsed), collapsed && "gap-0")}
    >
      <span className="relative shrink-0">
        {icon}
        {pendingBadgeCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500"
          />
        ) : null}
      </span>
      <span className={cn("flex min-w-0 items-center gap-2", collapsed && "hidden")}>
        <span className="truncate">{label}</span>
        {pendingBadgeCount > 0 ? (
          <SettingsBadge className="normal-case" tone="warning">
            {pendingBadgeCount}
          </SettingsBadge>
        ) : null}
      </span>
    </TabsTrigger>
  );
}

function SettingsCard({
  actions,
  actionsLayout = "inline",
  children,
  className,
  description,
  title,
  titleAdornment,
}: {
  actions?: ReactNode;
  actionsLayout?: "inline" | "stacked";
  children?: ReactNode;
  className?: string;
  description?: string;
  title?: ReactNode;
  titleAdornment?: ReactNode;
}) {
  const stackedActions = actionsLayout === "stacked";
  return (
    <div
      className={cn(
        "flex min-h-14 flex-col justify-center rounded-xl border border-border bg-background px-4 py-3",
        className,
      )}
    >
      {title ? (
        <div
          className={cn(
            "gap-4",
            stackedActions ? "flex flex-col" : "grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
          )}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-foreground min-w-0 shrink-0 text-sm font-semibold">
                {title}
              </h3>
              {titleAdornment ? <div className="shrink-0">{titleAdornment}</div> : null}
            </div>
            {description ? (
              <p className={SETTINGS_CARD_DESCRIPTION_CLASS}>
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div
              className={cn(
                "flex min-w-0 gap-2",
                stackedActions
                  ? "w-full flex-col sm:flex-row sm:flex-wrap"
                  : "flex-wrap items-center justify-start lg:justify-end",
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {children ? <div className={title ? "mt-3" : undefined}>{children}</div> : null}
    </div>
  );
}

function SettingsSnippetDisclosure({
  description,
  label,
  snippet,
}: {
  description: string;
  label: string;
  snippet: string;
}) {
  return (
    <details className="border-border/70 bg-muted/10 rounded-lg border px-3 py-3">
      <summary className={SETTINGS_SUMMARY_CLASS}>{label}</summary>
      <div className="mt-3 flex flex-col gap-2">
        <p className={cn("text-xs", SETTINGS_SECONDARY_TEXT_CLASS)}>{description}</p>
        <FixedField
          copyable
          fitContent
          hideLabel
          label={label}
          multiline
          value={snippet}
        />
      </div>
    </details>
  );
}

function runtimeShouldRenderServiceItem(item: RuntimeDiagnosticItem): boolean {
  if (
    matches(item.kind, ["access-relay", "access-local-mcp"]) &&
    item.state === "disabled" &&
    item.observed_processes.length === 0 &&
    !item.last_error
  ) {
    return false;
  }
  return true;
}

function SettingsGroupHeading({
  icon,
  label,
}: {
  icon?: ReactNode;
  label: string;
}) {
  return (
    <div className={SETTINGS_GROUP_HEADING_CLASS}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

export default function SettingsPanel({
  bridgeBaseUrl,
  selectedTab,
  onSelectTab,
}: SettingsPanelProps) {
  const handleSelectSettingsTab = (tab: SettingsTab) => {
    const telemetryTab = settingsTabTelemetryValue(tab);
    if (telemetryTab !== null) {
      trackSettingsTabOpened(bridgeBaseUrl, telemetryTab);
    }
    onSelectTab(tab);
  };
  const t = useT();
  const queryClient = useQueryClient();
  const { activeSource, onActivateSource } = useDesktopShellContext();
  const activationController = useDesktopActivationController();
  const settingsPanelRef = useRef<HTMLElement | null>(null);
  const machineLabel = "";
  const [isSettingsRailCollapsed, setIsSettingsRailCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"success" | "info" | "warning">("info");
  const [installedDesktopVersion, setInstalledDesktopVersion] = useState<string | null>(null);
  const [pendingDesktopUpdate, setPendingDesktopUpdate] = useState<DesktopUpdateInfo | null>(null);
  const [updaterBusy, setUpdaterBusy] = useState(false);
  const [updaterRefreshing, setUpdaterRefreshing] = useState(false);
  const [startupUpdateLoaded, setStartupUpdateLoaded] = useState(false);
  const [updaterMessage, setUpdaterMessage] = useState<string | null>(null);
  const [updaterError, setUpdaterError] = useState<string | null>(null);
  const [updaterInstalled, setUpdaterInstalled] = useState(false);
  const [runtimeActionFeedback, setRuntimeActionFeedback] = useState<{
    message: string;
    tone: "success" | "warning";
  } | null>(null);
  const [runtimeManualRefreshPending, setRuntimeManualRefreshPending] = useState(false);
  const runtimePostActionRefreshTimerRef = useRef<number | null>(null);
  const runtimeDiagnosticsEpochRef = useRef(0);
  const runtimeRefreshPromiseRef = useRef<Promise<void> | null>(null);
  const [noteLanguageDraft, setNoteLanguageDraft] = useState("English");
  const [embeddingDraft, setEmbeddingDraft] = useState<EmbeddingSettingsDraft | null>(null);
  const [approvingPendingAuthorizationId, setApprovingPendingAuthorizationId] = useState<
    string | null
  >(null);
  const [revokingConnectedClientId, setRevokingConnectedClientId] = useState<string | null>(null);
  const [revokingAllConnectedSessions, setRevokingAllConnectedSessions] = useState(false);
  const [pendingMcpVisibilityFamilies, setPendingMcpVisibilityFamilies] = useState<Set<string>>(
    () => new Set(),
  );

  const accessSummaryQuery = activationController.accessSummaryQuery;
  const desktopEditionQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-edition", bridgeBaseUrl],
    queryFn: () => fetchDesktopEdition(bridgeBaseUrl),
    staleTime: Infinity,
  });
  const desktopActivationQuery = activationController.desktopActivationQuery;
  const pendingAuthorizationsQuery = useQuery<PendingAuthorizationRequest[]>({
    enabled: false,
    queryKey: pendingAuthorizationsQueryKey(bridgeBaseUrl),
    queryFn: () => fetchPendingAuthorizations(bridgeBaseUrl),
    retry: false,
  });
  const connectedOAuthSessionsQuery = useQuery<ConnectedOAuthSession[]>({
    enabled: shouldPollManagedMcpConnectorBridge(
      bridgeBaseUrl,
      accessSummaryQuery.data,
      desktopActivationQuery.data,
      desktopEditionQuery.data,
    ),
    queryKey: connectedOAuthSessionsQueryKey(bridgeBaseUrl),
    queryFn: () => fetchConnectedOAuthSessions(bridgeBaseUrl),
    retry: false,
    refetchInterval: () =>
      shouldPollManagedMcpConnectorBridge(
        bridgeBaseUrl,
        accessSummaryQuery.data,
        desktopActivationQuery.data,
        desktopEditionQuery.data,
      )
        ? 8_000
        : false,
  });
  const mcpToolVisibilityQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["mcp-tool-visibility", bridgeBaseUrl],
    queryFn: () => fetchMcpToolVisibility(bridgeBaseUrl),
    retry: false,
    staleTime: 10_000,
  });
  const desktopUserSettingsQuery = useQuery<DesktopUserSettings>({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-user-settings", bridgeBaseUrl],
    queryFn: () => fetchDesktopUserSettings(bridgeBaseUrl),
    retry: false,
    staleTime: 10_000,
  });
  const desktopSetupStatusQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-setup-status", bridgeBaseUrl],
    queryFn: () => fetchDesktopSetupStatus(bridgeBaseUrl),
    retry: false,
    refetchInterval: (query) => {
      const phase = query.state.data?.embedding_runtime_phase;
      if (phase === "pending" || phase === "running") {
        return 3000;
      }
      return false;
    },
  });
  const embeddingSettingsQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: embeddingSettingsQueryKey(bridgeBaseUrl),
    queryFn: () => fetchEmbeddingSettings(bridgeBaseUrl),
    staleTime: 10_000,
  });
  const selectedSettingsTab = selectedTab;
  const shouldLoadRuntimeDiagnostics =
    runtimeDiagnosticsAvailable() && selectedSettingsTab === "maintenance";
  const buildProvenanceQuery = useQuery({
    enabled: runtimeDiagnosticsAvailable(),
    queryKey: ["desktop-build-provenance", bridgeBaseUrl],
    queryFn: fetchDesktopBuildProvenance,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const runtimeDiagnosticsQueryKey = [
    "desktop-runtime-diagnostics",
    bridgeBaseUrl,
    buildProvenanceQuery.data?.runtime_home ?? null,
    buildProvenanceQuery.data?.runtime_build_id ?? null,
  ] as const;
  const runtimeDiagnosticsQuery = useQuery({
    enabled: shouldLoadRuntimeDiagnostics && !buildProvenanceQuery.isPending,
    queryKey: runtimeDiagnosticsQueryKey,
    queryFn: async () => {
      const requestEpoch = runtimeDiagnosticsEpochRef.current;
      const diagnostics = await fetchDesktopRuntimeDiagnostics(false);
      if (requestEpoch !== runtimeDiagnosticsEpochRef.current) {
        return (
          queryClient.getQueryData<DesktopRuntimeDiagnostics>(runtimeDiagnosticsQueryKey) ?? null
        );
      }
      return diagnostics;
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 4_000,
  });
  const [runtimeDiagnosticsSnapshot, setRuntimeDiagnosticsSnapshot] =
    useState<DesktopRuntimeDiagnostics | null>(null);
  useEffect(() => {
    if (runtimeDiagnosticsQuery.data) {
      setRuntimeDiagnosticsSnapshot(runtimeDiagnosticsQuery.data);
    }
  }, [runtimeDiagnosticsQuery.data]);
  useEffect(() => {
    setRuntimeDiagnosticsSnapshot(null);
  }, [
    bridgeBaseUrl,
    buildProvenanceQuery.data?.runtime_build_id,
    buildProvenanceQuery.data?.runtime_home,
  ]);
  useEffect(
    () => () => {
      if (runtimePostActionRefreshTimerRef.current !== null) {
        window.clearTimeout(runtimePostActionRefreshTimerRef.current);
      }
    },
    [],
  );
  const embeddingBootstrapMessage = useMemo(() => {
    const setupStatus = desktopSetupStatusQuery.data;
    if (!setupStatus || setupStatus.embeddings_usable) {
      return null;
    }
    const detail = setupStatus.embedding_runtime_detail?.trim();
    if (detail) {
      return detail;
    }
    const provider = setupStatus.embed_provider;
    const providerKey =
      provider === "ollama"
        ? "ollama"
        : provider === "huggingface"
          ? "huggingface"
          : "hosted";
    const phase = setupStatus.embedding_runtime_phase;
    if (phase === "failed") {
      return t(`settings.embeddingBootstrap.failed.${providerKey}`, {
        error: setupStatus.embedding_runtime_last_error ?? "unknown error",
      });
    }
    if (phase === "running") {
      return t(`settings.embeddingBootstrap.running.${providerKey}`);
    }
    if (phase === "pending") {
      return t(`settings.embeddingBootstrap.pending.${providerKey}`);
    }
    return null;
  }, [desktopSetupStatusQuery.data, t]);
  useEffect(() => {
    if (!desktopUserSettingsQuery.data) {
      return;
    }
    setNoteLanguageDraft(desktopUserSettingsQuery.data.noteLanguageName);
  }, [desktopUserSettingsQuery.data]);

  const savedEmbeddingPreferences = embeddingSettingsQuery.data;
  const effectiveEmbeddingDraft =
    embeddingDraft ??
    (savedEmbeddingPreferences ? preferencesToEmbeddingDraft(savedEmbeddingPreferences) : null);

  useEffect(() => {
    if (!savedEmbeddingPreferences) {
      return;
    }
    setEmbeddingDraft((current) => {
      if (!current || embeddingDraftMatchesSaved(current, savedEmbeddingPreferences)) {
        return preferencesToEmbeddingDraft(savedEmbeddingPreferences);
      }
      return current;
    });
  }, [savedEmbeddingPreferences]);

  function invalidateNetworkQueries() {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: accessQueryKey(bridgeBaseUrl),
      }),
      queryClient.invalidateQueries({
        queryKey: ["desktop-activation", bridgeBaseUrl],
      }),
      queryClient.invalidateQueries({
        queryKey: ["mcp-tool-visibility", bridgeBaseUrl],
      }),
    ]);
  }

  function showToast(message: string, tone: "success" | "info" | "warning" = "info") {
    setToastMessage(message);
    setToastTone(tone);
  }

  function showRuntimeActionError(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : t("settings.runtime.action.failed");
    setRuntimeActionFeedback({ message, tone: "warning" });
    showToast(message, "warning");
  }

  function applyRuntimeActionResult(result: DesktopRuntimeActionResult) {
    queryClient.setQueryData(runtimeDiagnosticsQueryKey, result.diagnostics);
    const tone = runtimeActionFeedbackTone(result.action);
    setRuntimeActionFeedback({ message: result.message, tone });
    showToast(result.message, tone === "success" ? "success" : "warning");
  }

  function refreshRuntimeDiagnostics(waitForPending = false): Promise<void> {
    if (!runtimeDiagnosticsAvailable()) {
      return Promise.resolve();
    }
    const pendingRefresh = runtimeRefreshPromiseRef.current;
    if (pendingRefresh) {
      if (!waitForPending) {
        return Promise.resolve();
      }
      return pendingRefresh
        .catch(() => undefined)
        .then(() => refreshRuntimeDiagnostics(false));
    }
    setRuntimeManualRefreshPending(true);
    const requestEpoch = runtimeDiagnosticsEpochRef.current;
    const refreshOperation = (async () => {
      try {
        const diagnostics = await fetchDesktopRuntimeDiagnostics(true);
        if (diagnostics && requestEpoch === runtimeDiagnosticsEpochRef.current) {
          queryClient.setQueryData(runtimeDiagnosticsQueryKey, diagnostics);
        }
      } catch (error) {
        showRuntimeActionError(error);
      }
    })();
    let trackedRefresh: Promise<void>;
    trackedRefresh = refreshOperation.finally(() => {
      if (runtimeRefreshPromiseRef.current === trackedRefresh) {
        runtimeRefreshPromiseRef.current = null;
        setRuntimeManualRefreshPending(false);
      }
    });
    runtimeRefreshPromiseRef.current = trackedRefresh;
    return trackedRefresh;
  }

  function schedulePostActionRuntimeRefresh(): void {
    if (runtimePostActionRefreshTimerRef.current !== null) {
      window.clearTimeout(runtimePostActionRefreshTimerRef.current);
    }
    runtimePostActionRefreshTimerRef.current = window.setTimeout(() => {
      runtimePostActionRefreshTimerRef.current = null;
      void refreshRuntimeDiagnostics(true);
    }, 1_500);
  }

  async function copyToClipboard(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      showToast(t("settings.toast.copiedToClipboard"), "success");
    } catch {
      showToast(t("settings.toast.copyFailed"), "warning");
    }
  }

  const activationMutation = activationController.activationMutation;

  async function requestSettingsActivation(): Promise<void> {
    try {
      const { activationStatus, autoRepairFailed } = await activationController.requestActivation({
        machineLabel,
        source: "settings_panel",
      });
      if (activationStatus.lastAttempt?.message) {
        if (autoRepairFailed) {
          showToast(t("settings.toast.activationAutoRepairFailed"), "warning");
        } else if (activationStatus.lastAttempt.state === "succeeded") {
          showToast(activationStatus.lastAttempt.message, "success");
        }
        return;
      }
      if (autoRepairFailed) {
        showToast(t("settings.toast.activationAutoRepairFailed"), "warning");
        return;
      }
      showToast(t("settings.toast.activationUpdated"), "info");
    } catch (error) {
      await invalidateNetworkQueries();
      showToast(
        error instanceof Error && error.message
          ? error.message
          : t("settings.activation.failure.terminal"),
        "warning",
      );
      return;
    }
  }

  const connectMutation = useMutation({
    mutationFn: () => connectAccess(bridgeBaseUrl),
    onSuccess: async (result) => {
      await invalidateNetworkQueries();
      showToast(
        friendlyConnectMessage(
          t,
          result.runtime_result.action,
          result.runtime_result.details,
        ),
        result.runtime_result.action === "failed" ? "warning" : "info",
      );
    },
    onError: () => {
      void invalidateNetworkQueries();
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: () => reconnectAccess(bridgeBaseUrl),
    onSuccess: async (result) => {
      await invalidateNetworkQueries();
      showToast(
        friendlyConnectMessage(
          t,
          result.runtime_result.action,
          result.runtime_result.details,
        ),
        result.runtime_result.action === "failed" ? "warning" : "info",
      );
    },
    onError: () => {
      void invalidateNetworkQueries();
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectAccess(bridgeBaseUrl),
    onSuccess: async () => {
      await invalidateNetworkQueries();
      showToast(t("settings.toast.disconnected"), "info");
    },
    onError: () => {
      void invalidateNetworkQueries();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logoutDesktopActivation(bridgeBaseUrl),
    onSuccess: async (activationStatus) => {
      queryClient.setQueryData(
        ["desktop-activation", bridgeBaseUrl],
        activationStatus,
      );
      await queryClient.invalidateQueries({
        queryKey: accessQueryKey(bridgeBaseUrl),
      });
      showToast(t("settings.toast.signedOutOnDevice"), "info");
    },
  });

  const mcpToolVisibilityMutation = useMutation({
    mutationFn: ({ enabled, family }: { enabled: boolean; family: string }) =>
      updateMcpToolVisibility(bridgeBaseUrl, { [family]: enabled }),
    onMutate: ({ enabled, family }) => {
      setPendingMcpVisibilityFamilies((current) => new Set(current).add(family));
      const previousSettings = queryClient.getQueryData<McpToolVisibilitySettings>([
        "mcp-tool-visibility",
        bridgeBaseUrl,
      ]);
      const previousEnabled =
        previousSettings?.enabledGroups[family] ??
        previousSettings?.groups.find((group) => group.family === family)?.enabled ??
        null;
      if (previousSettings) {
        queryClient.setQueryData<McpToolVisibilitySettings>([
          "mcp-tool-visibility",
          bridgeBaseUrl,
        ], {
          ...previousSettings,
          enabledGroups: {
            ...previousSettings.enabledGroups,
            [family]: enabled,
          },
          groups: previousSettings.groups.map((group) =>
            group.family === family ? { ...group, enabled } : group,
          ),
        });
      }
      return { family, previousEnabled };
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(["mcp-tool-visibility", bridgeBaseUrl], settings);
      showToast(t("settings.toast.mcpVisibilityUpdated"), "success");
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData<McpToolVisibilitySettings | undefined>(
          ["mcp-tool-visibility", bridgeBaseUrl],
          (current) => {
            const restoredEnabled = context.previousEnabled;
            if (!current || restoredEnabled === null) {
              return current;
            }
            return {
              ...current,
              enabledGroups: {
                ...current.enabledGroups,
                [context.family]: restoredEnabled,
              },
              groups: current.groups.map((group) =>
                group.family === context.family
                  ? { ...group, enabled: restoredEnabled }
                  : group,
              ),
            };
          },
        );
      } else {
        void queryClient.invalidateQueries({
          queryKey: ["mcp-tool-visibility", bridgeBaseUrl],
        });
      }
      showToast(t("settings.toast.mcpVisibilityFailed"), "warning");
    },
    onSettled: (_data, _error, variables) => {
      setPendingMcpVisibilityFamilies((current) => {
        const next = new Set(current);
        next.delete(variables.family);
        return next;
      });
      void queryClient.invalidateQueries({
        queryKey: ["mcp-tool-visibility", bridgeBaseUrl],
      });
    },
  });
  const embeddingSettingsMutation = useMutation({
    mutationFn: () => {
      if (!effectiveEmbeddingDraft || !savedEmbeddingPreferences) {
        throw new Error("Embedding settings are not loaded");
      }
      const patch: Parameters<typeof updateEmbeddingSettings>[1] = {
        provider: effectiveEmbeddingDraft.provider,
        model: effectiveEmbeddingDraft.model.trim() || "bge-m3",
        ollamaUrl: effectiveEmbeddingDraft.ollama_url.trim() || "http://localhost:11434",
        autoEmbed: savedEmbeddingPreferences.auto_embed,
      };
      const draftToken = effectiveEmbeddingDraft.huggingface_api_key.trim();
      if (draftToken.length > 0) {
        patch.huggingfaceApiKey = draftToken;
      }
      return updateEmbeddingSettings(bridgeBaseUrl, patch);
    },
    onSuccess: async (preferences) => {
      queryClient.setQueryData(embeddingSettingsQueryKey(bridgeBaseUrl), preferences);
      setEmbeddingDraft(preferencesToEmbeddingDraft(preferences));
      await queryClient.invalidateQueries({
        queryKey: ["desktop-setup-status", bridgeBaseUrl],
      });
      const shouldRestartRuntime =
        embeddingProviderChanged && runtimeDiagnosticsAvailable();
      if (shouldRestartRuntime) {
        try {
          await runtimeRestartMutation.mutateAsync();
        } catch {
          // runtimeRestartMutation already reports the failure; saving preferences still succeeded
        }
        await queryClient.invalidateQueries({
          queryKey: ["desktop-setup-status", bridgeBaseUrl],
        });
        return;
      }
      showToast(t("settings.embedding.toast.saved"), "success");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : t("settings.embedding.toast.saveFailed");
      showToast(message, "warning");
    },
  });
  const desktopUserSettingsMutation = useMutation({
    mutationFn: (noteLanguageName: string) =>
      updateDesktopUserSettings(bridgeBaseUrl, { noteLanguageName }),
    onSuccess: async (settings) => {
      queryClient.setQueryData(["desktop-user-settings", bridgeBaseUrl], settings);
      setNoteLanguageDraft(settings.noteLanguageName);
      await queryClient.invalidateQueries({
        queryKey: basesQueryKey(bridgeBaseUrl),
      });
      useNotesTreeStore.getState().invalidateChildren(bridgeBaseUrl, "managed:ggl");
      if (activeSource?.id === "managed:ggl") {
        await onActivateSource(activeSource, {
          forceRefresh: true,
          preserveCurrentTab: true,
        });
      }
      showToast(t("settings.toast.noteLanguageUpdated"), "success");
    },
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: ["desktop-user-settings", bridgeBaseUrl],
      });
      showToast(t("settings.toast.noteLanguageFailed"), "warning");
    },
  });
  const runtimeRestartMutation = useMutation({
    mutationFn: restartDesktopRuntimeServices,
    onMutate: () => {
      runtimeDiagnosticsEpochRef.current += 1;
    },
    onSuccess: (result) => {
      applyRuntimeActionResult(result);
    },
    onError: (error) => {
      showRuntimeActionError(error);
    },
    onSettled: schedulePostActionRuntimeRefresh,
  });
  const runtimeRepairMutation = useMutation({
    mutationFn: repairDesktopRuntimeServices,
    onMutate: () => {
      runtimeDiagnosticsEpochRef.current += 1;
    },
    onSuccess: (result) => {
      applyRuntimeActionResult(result);
    },
    onError: (error) => {
      showRuntimeActionError(error);
    },
    onSettled: schedulePostActionRuntimeRefresh,
  });
  function handleNoteLanguageChange(nextNoteLanguageName: string) {
    if (
      desktopUserSettingsMutation.isPending ||
      nextNoteLanguageName.trim().length === 0 ||
      nextNoteLanguageName === savedNoteLanguageName
    ) {
      return;
    }
    setNoteLanguageDraft(nextNoteLanguageName);
    void desktopUserSettingsMutation.mutateAsync(nextNoteLanguageName);
  }

  function updateEmbeddingDraft(patch: Partial<EmbeddingSettingsDraft>) {
    setEmbeddingDraft((current) => {
      const base =
        current ??
        (savedEmbeddingPreferences
          ? preferencesToEmbeddingDraft(savedEmbeddingPreferences)
          : null);
      return base ? { ...base, ...patch } : base;
    });
  }

  function handleSaveEmbeddingSettings() {
    if (
      embeddingSettingsMutation.isPending ||
      !embeddingSettingsChanged ||
      !effectiveEmbeddingDraft ||
      !savedEmbeddingPreferences
    ) {
      return;
    }
    void embeddingSettingsMutation.mutateAsync();
  }

  const summary = accessSummaryQuery.data;
  const status = summary?.status;
  const record = summary?.record;
  const accountIdentity = summary?.accountIdentity;
  const onboarding = summary?.onboarding ?? {};
  const protectedResourceUrl =
    onboarding.protected_resource_url ?? record?.access_url ?? status?.access_url ?? "";
  const productWebBaseUrl = getConfiguredProductWebBaseUrl();
  const locramBillingUrl = productWebBaseUrl
    ? buildLocramBillingUrl(productWebBaseUrl)
    : null;
  const locramCheckoutUrl = productWebBaseUrl
    ? buildLocramCheckoutUrl(productWebBaseUrl)
    : null;
  const isFreeEdition =
    (desktopActivationQuery.data?.edition ?? desktopEditionQuery.data?.edition) !== "pro";
  const productSupportsPro =
    desktopEditionQuery.data?.capabilities.brokerEnrollment === true ||
    desktopActivationQuery.data?.brokerEnrollmentAvailable === true;

  const isConnected =
    status?.state === "live" ||
    status?.state === "connecting" ||
    status?.state === "reconnecting";
  const isInterrupted =
    status?.state === "interrupted" || status?.state === "stale";
  const brokerEnrollmentAvailable =
    productSupportsPro && desktopActivationQuery.data?.brokerEnrollmentAvailable === true;
  const entitlementView = deriveDesktopEntitlementView(
    desktopActivationQuery.data,
    summary,
  );
  const entitlementBlocksNetwork = entitlementView.networkConveniencesDisabled;

  const isRegisterDisabled = activationMutation.isPending;
  const isConnectDisabled =
    !status?.credential_material_present ||
    entitlementBlocksNetwork ||
    connectMutation.isPending ||
    disconnectMutation.isPending;
  const isRetryDisabled =
    !status?.credential_material_present ||
    entitlementBlocksNetwork ||
    reconnectMutation.isPending ||
    disconnectMutation.isPending;
  const isDisconnectDisabled =
    !status?.runtime_running ||
    disconnectMutation.isPending ||
    connectMutation.isPending ||
    reconnectMutation.isPending;
  const desktopActivationState = desktopActivationQuery.data?.state
    .split("_")
    .join(" ") ?? t("settings.account.statusUnknown");
  const desktopActivationMessage =
    desktopActivationQuery.data?.lastAttempt?.message ?? "";
  const approvalUrl = desktopActivationQuery.data?.lastAttempt?.approvalUrl ?? "";
  const savedNoteLanguageName = desktopUserSettingsQuery.data?.noteLanguageName ?? "English";
  const embeddingSettingsChanged =
    savedEmbeddingPreferences !== undefined &&
    effectiveEmbeddingDraft !== null &&
    !embeddingDraftMatchesSaved(effectiveEmbeddingDraft, savedEmbeddingPreferences);
  const embeddingProviderChanged =
    savedEmbeddingPreferences !== undefined &&
    effectiveEmbeddingDraft !== null &&
    effectiveEmbeddingDraft.provider !== savedEmbeddingPreferences.provider;
  const embeddingSettingsDisabled =
    embeddingSettingsQuery.isLoading || embeddingSettingsMutation.isPending;
  const embeddingProviderOptions: PopoverSelectOption<EmbeddingProvider>[] = useMemo(
    () =>
      EMBEDDING_PROVIDER_ORDER.map((provider) => ({
        value: provider,
        label: t(EMBEDDING_PROVIDER_LABEL_KEYS[provider]),
      })),
    [t],
  );
  const noteLanguageOptions: PopoverSelectOption<string>[] = (
    desktopUserSettingsQuery.data?.noteLanguageOptions ?? ["English"]
  ).map((languageName) => ({
    value: languageName,
    label: languageName,
  }));
  const desktopMcpLauncherPath =
    desktopSetupStatusQuery.data?.desktop_mcp_launcher === true
      ? desktopSetupStatusQuery.data.desktop_mcp_launcher_path
      : null;
  const stdioDesktopSnippet = useMemo(
    () =>
      desktopMcpLauncherPath
        ? buildDesktopMcpJsonSnippet(desktopMcpLauncherPath)
        : null,
    [desktopMcpLauncherPath],
  );
  const stdioCodexSnippet = useMemo(
    () =>
      desktopMcpLauncherPath
        ? buildCodexMcpTomlSnippet(desktopMcpLauncherPath)
        : null,
    [desktopMcpLauncherPath],
  );
  const isBrowserActivationPending = activationController.isBrowserActivationPending;
  const publicMcpUrl = record?.access_url ?? status?.access_url ?? "";
  const isActivationActive = desktopActivationQuery.data?.state === "active";
  const accessRecordMatchesStatus =
    Boolean(status?.credential_material_present && status.access_url && status.identity) &&
    (record === null ||
      (record?.access_url === status?.access_url && record?.identity === status?.identity));
  const hasActiveCurrentDeviceAccess =
    isActivationActive && accessRecordMatchesStatus;
  const isActivationReauthRequired =
    desktopActivationQuery.data?.state === "reauth_required";
  const subscriptionStatus =
    desktopActivationQuery.data?.entitlementLease?.subscriptionStatus ?? null;
  const entitlementPlanCode =
    desktopActivationQuery.data?.entitlementLease?.planCode ?? null;
  const isLocramFreePlan = entitlementPlanCode === "locram_free";
  const hasSignedInAccount = resolveHasSignedInAccount(
    desktopActivationQuery.data,
    summary,
  );
  const hasPaidSubscription =
    hasSignedInAccount &&
    !isLocramFreePlan &&
    (
      subscriptionStatus === "active" ||
      subscriptionStatus === "trialing" ||
      entitlementView.leaseTone === "usable"
    );
  const accountPlanState: AccountPlanState = !hasSignedInAccount
    ? "free"
    : subscriptionStatus === "trialing"
      ? "trial"
      : isLocramFreePlan
        ? "free"
        : hasPaidSubscription
          ? "pro"
          : "free";
  const needsProDeviceActivation = needsProDesktopActivation(
    desktopActivationQuery.data,
    summary,
    productSupportsPro,
    hasPaidSubscription,
  );
  const isProSeatTransferRequired =
    desktopActivationQuery.data?.lastAttempt?.errorCode === "transfer_required" &&
    !isLocramFreePlan &&
    desktopActivationQuery.data?.edition === "pro";
  const shouldShowDesktopActivationMessage =
    !hasActiveCurrentDeviceAccess &&
    Boolean(desktopActivationMessage) &&
    desktopActivationQuery.data?.lastAttempt?.state !== "succeeded" &&
    !isProSeatTransferRequired;
  const activationFailureLabel =
    hasActiveCurrentDeviceAccess
      ? null
      : desktopActivationQuery.data?.lastAttempt?.errorCode === "activation_session_expired"
      ? t("settings.activation.failure.sessionExpired")
      : desktopActivationQuery.data?.lastAttempt?.errorCode === "activation_session_redeemed"
        ? t("settings.activation.failure.sessionRedeemed")
        : desktopActivationQuery.data?.lastAttempt?.errorCode === "activation_session_unredeemable"
          ? t("settings.activation.failure.sessionUnredeemable")
          : isProSeatTransferRequired
            ? t("settings.activation.failure.transferRequired")
            : desktopActivationQuery.data?.lastAttempt?.errorCode === "activation_transferred"
              ? t("settings.activation.failure.activationTransferred")
              : desktopActivationQuery.data?.state === "failed_retryable"
                ? t("settings.activation.failure.retryable")
                : desktopActivationQuery.data?.state === "failed_terminal"
                  ? t("settings.activation.failure.terminal")
                  : null;
  const activationFailureTone =
    desktopActivationQuery.data?.state === "failed_terminal" ? "terminal" : "retryable";
  const isTransferActivationPending = activationController.isTransferActivationPending;
  const shouldShowAccountReconnectAction =
    hasSignedInAccount &&
    (
      needsProDeviceActivation ||
      isActivationReauthRequired ||
      desktopActivationQuery.data?.state === "failed_retryable" ||
      desktopActivationQuery.data?.state === "failed_terminal"
    );
  const accountPortalUrl = locramBillingUrl ?? "";
  const connectProUrl = hasSignedInAccount
    ? (locramCheckoutUrl ?? "")
    : (locramBillingUrl ?? protectedResourceUrl ?? "");
  const accountDisplayName =
    accountIdentity?.email ??
    accountIdentity?.display_name ??
    accountIdentity?.account_id ??
    (hasSignedInAccount
      ? t("settings.account.connected")
      : t("settings.account.notConnected"));
  const accountStateLabel = t(accountPlanLabelKey(accountPlanState));
  const accountRailStatusLabel = hasSignedInAccount
    ? accountStateLabel
    : t("settings.account.notConnected");
  const shouldShowRailUpgradeButton =
    hasSignedInAccount && accountPlanState === "free";
  const subscriptionDescription = !hasSignedInAccount
    ? t("settings.section.subscription.description.notConnected")
    : accountPlanState === "pro"
      ? t("settings.section.subscription.description.pro")
      : accountPlanState === "trial"
        ? t("settings.section.subscription.description.trial")
        : t("settings.section.subscription.description.free");
  const accountActionDescription = !hasSignedInAccount
    ? t("settings.section.account.description.connect")
    : needsProDeviceActivation
      ? t("settings.section.account.description.noSubscription")
      : shouldShowAccountReconnectAction
        ? t("settings.section.account.description.reconnect")
        : productWebBaseUrl
          ? t("settings.section.account.description.openBilling")
          : PRODUCT_WEB_BASE_URL_REQUIRED_MESSAGE;
  const showActivationUrl = approvalUrl.length > 0 &&
    (isActivationReauthRequired || isBrowserActivationPending);
  const accountActionUnavailableMessage = PRODUCT_WEB_BASE_URL_REQUIRED_MESSAGE;
  const canOpenAccount = accountPortalUrl.length > 0;
  const canConnectPro = connectProUrl.length > 0;
  const shouldBlockSettingsWithSignIn =
    selectedSettingsTab === "account" &&
    brokerEnrollmentAvailable &&
    accessSummaryQuery.isSuccess &&
    desktopActivationQuery.isSuccess &&
    !hasSignedInAccount;
  const remoteMcpNeedsBrowserSetup =
    !isFreeEdition &&
    (
      !record ||
      status?.credential_material_present !== true ||
      isActivationReauthRequired ||
      publicMcpUrl.length === 0
    );
  const remoteMcpDescription = isFreeEdition
    ? t("settings.mcp.http.description.free")
    : remoteMcpNeedsBrowserSetup
      ? t("settings.mcp.http.description.setup")
      : t("settings.mcp.http.description.operational");
  const remoteMcpSwitchChecked =
    !isInterrupted && (isConnected || status?.runtime_running === true);
  const mcpStatusState = !isActivationActive
    ? desktopActivationQuery.data?.state ?? "not_activated"
    : entitlementView.leaseTone !== "usable"
      ? entitlementView.lease?.state ?? "unknown"
      : !publicMcpUrl || status?.credential_material_present !== true
        ? "not_configured"
        : connectMutation.isPending
          ? "connecting"
          : reconnectMutation.isPending
            ? "reconnecting"
            : disconnectMutation.isPending
              ? "disabled"
              : isInterrupted
                ? status?.state === "stale"
                  ? "stale"
                  : "interrupted"
                : remoteMcpSwitchChecked
                  ? status?.state === "live"
                    ? "connected"
                    : status?.state === "connecting" || status?.state === "reconnecting"
                      ? status.state
                      : status?.runtime_running
                        ? "running"
                        : "connected"
                  : "disconnected";
  const remoteMcpSwitchAriaLabel = connectMutation.isPending
    ? t("settings.mcp.http.action.connecting")
    : disconnectMutation.isPending
      ? t("settings.mcp.http.action.disconnecting")
      : reconnectMutation.isPending
        ? t("settings.mcp.http.action.reconnecting")
        : remoteMcpSwitchChecked
          ? t("settings.mcp.http.action.disconnect")
          : isInterrupted
            ? t("settings.mcp.http.action.reconnect")
            : t("settings.mcp.http.action.connect");
  const remoteMcpSwitchDisabled =
    connectMutation.isPending ||
    disconnectMutation.isPending ||
    reconnectMutation.isPending ||
    (isInterrupted
      ? isRetryDisabled
      : remoteMcpSwitchChecked
        ? isDisconnectDisabled
        : isConnectDisabled);
  const showRemoteMcpUrlField =
    !isFreeEdition && Boolean(protectedResourceUrl) && entitlementView.leaseTone === "usable";
  const mcpToolVisibility = mcpToolVisibilityQuery.data;
  const visibleToolCount = mcpToolVisibility?.visibleTools.length ?? 0;
  const inlinePendingAuthorizations = pendingAuthorizationsQuery.data ?? [];
  const connectedOAuthSessions = connectedOAuthSessionsQuery.data ?? [];
  const pendingApprovalsBadgeCount = inlinePendingAuthorizations.length;
  const mcpConnectorRows = useMemo(() => {
    const pendingClientIds = new Set(
      inlinePendingAuthorizations.map((item) => item.client_id),
    );
    return [
      ...inlinePendingAuthorizations.map((item) => ({
        kind: "pending" as const,
        item,
      })),
      ...connectedOAuthSessions
        .filter((item) => !pendingClientIds.has(item.client_id))
        .map((item) => ({
          kind: "connected" as const,
          item,
        })),
    ];
  }, [inlinePendingAuthorizations, connectedOAuthSessions]);
  const mcpConnectorsLoading =
    (pendingAuthorizationsQuery.isLoading || connectedOAuthSessionsQuery.isLoading) &&
    mcpConnectorRows.length === 0;
  const mcpConnectorsQueryWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (pendingAuthorizationsQuery.isError) {
      warnings.push(t("settings.mcp.pendingApproval.error"));
    }
    if (connectedOAuthSessionsQuery.isError) {
      warnings.push(t("settings.mcp.connectedSessions.error"));
    }
    return warnings;
  }, [connectedOAuthSessionsQuery.isError, pendingAuthorizationsQuery.isError, t]);
  const mcpConnectorsShowEmpty =
    mcpConnectorRows.length === 0 &&
    !mcpConnectorsLoading &&
    mcpConnectorsQueryWarnings.length === 0;
  const installedVersionLabel =
    installedDesktopVersion ?? BROWSER_FALLBACK_DESKTOP_VERSION;
  const canUseDesktopUpdater = updaterAvailable();
  const updateButtonLabel = updaterBusy
    ? t("settings.updater.action.installing")
    : updaterRefreshing
      ? t("settings.updater.action.checking")
      : pendingDesktopUpdate
        ? t("settings.updater.action.update")
        : startupUpdateLoaded
          ? t("settings.updater.action.upToDate")
          : t("settings.updater.action.check");
  const showUpdaterRecheckLabel =
    startupUpdateLoaded &&
    !pendingDesktopUpdate &&
    !updaterBusy &&
    !updaterRefreshing &&
    !updaterError;
  const runtimeDiagnostics = runtimeDiagnosticsQuery.data ?? runtimeDiagnosticsSnapshot;
  const runtimeDiagnosticsInitialLoading =
    shouldLoadRuntimeDiagnostics && runtimeDiagnosticsQuery.isLoading && !runtimeDiagnostics;
  const runtimeDiagnosticsRefreshing =
    (shouldLoadRuntimeDiagnostics && runtimeDiagnosticsQuery.isFetching && !!runtimeDiagnostics) ||
    runtimeManualRefreshPending;
  const runtimeServiceItems =
    runtimeDiagnostics?.items.filter(
      (item) => item.category === "service" && runtimeShouldRenderServiceItem(item),
    ) ?? [];
  const runtimeDependencyItems =
    runtimeDiagnostics?.items.filter((item) => item.category === "dependency") ?? [];
  const runtimeSummaryMessage = describeRuntimeSummary(t, runtimeDiagnostics);
  const runtimeActiveEmbeddingMessage =
    runtimeDiagnostics?.embed_provider && runtimeDiagnostics?.embed_model
      ? t("settings.runtime.activeEmbedding", {
          provider: formatEmbeddingProviderLabel(t, runtimeDiagnostics.embed_provider),
          model: runtimeDiagnostics.embed_model,
        })
      : desktopSetupStatusQuery.data
        ? t("settings.runtime.activeEmbedding", {
            provider: formatEmbeddingProviderLabel(
              t,
              desktopSetupStatusQuery.data.embed_provider,
            ),
            model: desktopSetupStatusQuery.data.embed_model,
          })
        : null;
  const runtimeActionAvailabilityMessage = describeRuntimeActionAvailability(
    t,
    runtimeDiagnostics,
  );
  const runtimeDiagnosticsFetchError =
    runtimeDiagnosticsQuery.error && !runtimeDiagnostics ? runtimeDiagnosticsQuery.error : null;
  const runtimeDiagnosticsRefreshError =
    runtimeDiagnosticsQuery.error && runtimeDiagnostics ? runtimeDiagnosticsQuery.error : null;
  const runtimeDiagnosticsErrorMessage =
    runtimeDiagnosticsFetchError instanceof Error
      ? runtimeDiagnosticsFetchError.message
      : runtimeDiagnosticsFetchError
        ? String(runtimeDiagnosticsFetchError)
        : null;
  const runtimeDiagnosticsRefreshErrorMessage =
    runtimeDiagnosticsRefreshError instanceof Error
      ? runtimeDiagnosticsRefreshError.message
      : runtimeDiagnosticsRefreshError
        ? String(runtimeDiagnosticsRefreshError)
        : null;
  const runtimeActionPending =
    runtimeRestartMutation.isPending || runtimeRepairMutation.isPending;
  const runtimeActionProgressMessage = runtimeActionProgressLabel(t, {
    restart: runtimeRestartMutation.isPending,
    repair: runtimeRepairMutation.isPending,
  });
  const canRestartRuntime =
    runtimeCanRestart(runtimeDiagnostics) && runtimeDiagnosticsAvailable();
  const canRepairRuntime =
    runtimeCanRepair(runtimeDiagnostics) && runtimeDiagnosticsAvailable();

  async function refreshDesktopUpdaterState(manual: boolean): Promise<void> {
    if (!updaterAvailable()) {
      setInstalledDesktopVersion(BROWSER_FALLBACK_DESKTOP_VERSION);
      setPendingDesktopUpdate(null);
      setStartupUpdateLoaded(true);
      if (manual) {
        setUpdaterMessage(t("settings.updater.unavailable"));
      }
      return;
    }
    setUpdaterRefreshing(true);
    setUpdaterError(null);
    try {
      const [installedVersion, pendingUpdate] = await Promise.all([
        getInstalledDesktopVersion(),
        manual ? checkForDesktopUpdate() : getPendingDesktopUpdate(),
      ]);
      setInstalledDesktopVersion(installedVersion ?? BROWSER_FALLBACK_DESKTOP_VERSION);
      setPendingDesktopUpdate(pendingUpdate);
      if (manual) {
        setUpdaterMessage(
          pendingUpdate
            ? t("settings.updater.available", { version: pendingUpdate.version })
            : t("settings.updater.noNewer"),
        );
      }
    } catch (error) {
      setUpdaterError(
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : t("settings.updater.loadFailed"),
      );
      if (manual) {
        setUpdaterMessage(null);
      }
    } finally {
      setStartupUpdateLoaded(true);
      setUpdaterRefreshing(false);
    }
  }

  async function handleUpdaterAction(): Promise<void> {
    if (!canUseDesktopUpdater || updaterBusy || updaterRefreshing) {
      return;
    }
    setUpdaterBusy(true);
    setUpdaterError(null);
    setUpdaterInstalled(false);
    try {
      const checkedUpdate = await checkForDesktopUpdate();
      setPendingDesktopUpdate(checkedUpdate);
      if (!checkedUpdate) {
        setUpdaterMessage(t("settings.updater.alreadyLatest"));
        setStartupUpdateLoaded(true);
        return;
      }
      setUpdaterMessage(
        t("settings.updater.installingVersion", { version: checkedUpdate.version }),
      );
      await installPendingDesktopUpdate();
      setPendingDesktopUpdate(null);
      setUpdaterInstalled(true);
      setUpdaterMessage(
        t("settings.updater.installedVersion", { version: checkedUpdate.version }),
      );
    } catch (error) {
      setUpdaterError(
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : t("settings.updater.failed"),
      );
    } finally {
      setUpdaterBusy(false);
    }
  }

  useEffect(() => {
    if (selectedSettingsTab !== "general") {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      void refreshDesktopUpdaterState(false);
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedSettingsTab]);

  useEffect(() => {
    const element = settingsPanelRef.current;
    if (!element) {
      return;
    }
    const updateCollapsedState = () => {
      setIsSettingsRailCollapsed(
        element.getBoundingClientRect().width < SETTINGS_RAIL_COLLAPSE_WIDTH,
      );
    };
    updateCollapsedState();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateCollapsedState);
      return () => window.removeEventListener("resize", updateCollapsedState);
    }
    const observer = new ResizeObserver(updateCollapsedState);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 3_500);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const displayMessage = useMemo(() => {
    if (shouldShowDesktopActivationMessage) return desktopActivationMessage;
    if (isInterrupted && status?.last_error) return status.last_error;
    if (accessSummaryQuery.error?.message)
      return accessSummaryQuery.error.message;
    return "";
  }, [
    desktopActivationMessage,
    shouldShowDesktopActivationMessage,
    isInterrupted,
    status,
    accessSummaryQuery.error,
  ]);
  const networkStatusMessage =
    displayMessage ||
    translatedEntitlementText(t, desktopActivationQuery.data, summary) ||
    (isActivationReauthRequired
      ? t("settings.networkStatus.reauthMessage")
      : !isActivationActive
        ? t("settings.networkStatus.activationState", {
            state: desktopActivationState,
          })
        : "");

  function handleOpenAccountPortal(): void {
    if (!accountPortalUrl) {
      showToast(PRODUCT_WEB_BASE_URL_REQUIRED_MESSAGE, "warning");
      return;
    }
    void openExternalUrl(accountPortalUrl);
  }

  function handleOpenConnectPro(): void {
    if (needsProDeviceActivation) {
      void requestSettingsActivation();
      return;
    }
    if (!connectProUrl) {
      showToast(PRODUCT_WEB_BASE_URL_REQUIRED_MESSAGE, "warning");
      return;
    }
    void openExternalUrl(connectProUrl);
  }

  async function handleApprovePendingAuthorization(requestId: string): Promise<void> {
    setApprovingPendingAuthorizationId(requestId);
    try {
      await approvePendingAuthorization(bridgeBaseUrl, requestId);
      showToast(t("settings.mcp.pendingApproval.toast.approved"), "success");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: pendingAuthorizationsQueryKey(bridgeBaseUrl),
        }),
        queryClient.invalidateQueries({
          queryKey: connectedOAuthSessionsQueryKey(bridgeBaseUrl),
        }),
      ]);
    } catch {
      showToast(t("settings.mcp.pendingApproval.toast.approveFailed"), "warning");
    } finally {
      setApprovingPendingAuthorizationId(null);
    }
  }

  async function handleRevokeConnectedOAuthSession(clientId: string): Promise<void> {
    setRevokingConnectedClientId(clientId);
    try {
      await revokeConnectedOAuthSession(bridgeBaseUrl, clientId);
      showToast(t("settings.mcp.connectedSessions.toast.revoked"), "success");
      await connectedOAuthSessionsQuery.refetch();
    } catch {
      showToast(t("settings.mcp.connectedSessions.toast.revokeFailed"), "warning");
    } finally {
      setRevokingConnectedClientId(null);
    }
  }

  async function handleRevokeAllConnectedOAuthSessions(): Promise<void> {
    setRevokingAllConnectedSessions(true);
    try {
      await revokeAllConnectedOAuthSessions(bridgeBaseUrl);
      showToast(t("settings.mcp.connectedSessions.toast.revokedAll"), "success");
      await connectedOAuthSessionsQuery.refetch();
    } catch {
      showToast(t("settings.mcp.connectedSessions.toast.revokeAllFailed"), "warning");
    } finally {
      setRevokingAllConnectedSessions(false);
    }
  }

  function handleRemoteMcpSwitchChange(checked: boolean): void {
    if (checked) {
      if (isInterrupted) {
        void reconnectMutation.mutateAsync();
        return;
      }
      void connectMutation.mutateAsync();
      return;
    }
    void disconnectMutation.mutateAsync();
  }

  function handleRestartRuntime(): void {
    if (!canRestartRuntime || runtimeActionPending) {
      return;
    }
    setRuntimeActionFeedback(null);
    void runtimeRestartMutation.mutateAsync();
  }

  function handleRepairRuntime(): void {
    if (!canRepairRuntime || runtimeActionPending) {
      return;
    }
    setRuntimeActionFeedback(null);
    void runtimeRepairMutation.mutateAsync();
  }

  return (
    <section
      ref={settingsPanelRef}
      className="bg-background flex h-full min-h-0 flex-col overflow-hidden"
      aria-label={t("settings.region.label")}
    >
      {toastMessage ? (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg",
            toastTone === "success" &&
              "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            toastTone === "warning" &&
              "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
            toastTone === "info" &&
              "border-border bg-background text-foreground",
          )}
          role="status"
        >
          {toastMessage}
        </div>
      ) : null}
      <Tabs
        value={selectedSettingsTab}
        onValueChange={(value) => handleSelectSettingsTab(value as SettingsTab)}
        className="flex h-full min-h-0 w-full"
      >
        <aside
          className={cn(
            "border-border bg-muted/10 flex shrink-0 flex-col border-r p-3 transition-[width]",
            isSettingsRailCollapsed ? "w-16 items-center" : "w-64",
          )}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelectSettingsTab("account")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSelectSettingsTab("account");
              }
            }}
            className={cn(
              "hover:bg-menu-hover-bg w-full rounded-lg p-2 text-left transition-colors",
              selectedSettingsTab === "account" && "bg-menu-hover-bg",
              isSettingsRailCollapsed && "flex justify-center",
            )}
            aria-label={t("settings.tab.account")}
          >
          <div
            className={cn(
              "flex items-start justify-between gap-2",
              isSettingsRailCollapsed && "justify-center",
            )}
          >
            <div
              className={cn(
                "flex min-w-0 gap-3",
                isSettingsRailCollapsed && "justify-center",
              )}
            >
              <div className="bg-background border-border flex h-9 w-9 shrink-0 items-center justify-center rounded-full border">
                <UserIcon size={18} />
              </div>
              <div className={cn("min-w-0", isSettingsRailCollapsed && "hidden")}>
                <div className="text-foreground truncate text-sm font-medium">
                  {accountDisplayName}
                </div>
                <div
                  className={cn(
                    "mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs",
                    SETTINGS_SECONDARY_TEXT_CLASS,
                  )}
                >
                  {hasSignedInAccount ? (
                    <SettingsBadge
                      tone={accountPlanTone(accountPlanState)}
                      className="px-2 py-0.5 text-[10px]"
                    >
                      {accountRailStatusLabel}
                    </SettingsBadge>
                  ) : (
                    <span>{accountRailStatusLabel}</span>
                  )}
                  {shouldShowRailUpgradeButton ? (
                    <SettingsButton
                      compact
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenConnectPro();
                      }}
                    >
                      {t("settings.section.account.action.connectPro")}
                    </SettingsButton>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          </div>
          <TabsList
            aria-label={t("settings.sections.label")}
            className={cn(
              "mt-6 flex flex-col items-stretch gap-1 bg-transparent p-0",
              isSettingsRailCollapsed && "w-full",
            )}
          >
            <SettingsNavigationTabItem
              collapsed={isSettingsRailCollapsed}
              icon={<GeneralSlidersIcon size={18} className="shrink-0" />}
              label={t("settings.tab.general")}
              value="general"
            />
            <SettingsNavigationTabItem
              collapsed={isSettingsRailCollapsed}
              icon={<ModelContextProtocolIcon size={18} className="shrink-0" />}
              label={t("settings.tab.mcp")}
              pendingBadgeCount={pendingApprovalsBadgeCount}
              value="mcp"
            />
            <SettingsNavigationTabItem
              collapsed={isSettingsRailCollapsed}
              icon={<SettingsTerminalIcon size={18} className="shrink-0" />}
              label={t("settings.tab.maintenance")}
              value="maintenance"
            />
          </TabsList>
        </aside>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full">
            <TabsContent
              value="general"
              className="mt-0 h-full overflow-y-auto"
            >
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-6">

                <section className="order-2 flex flex-col gap-3">
                  <div className="grid w-full gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <SettingsGroupHeading label={t("settings.group.embeddings")} />
                    <div className="flex justify-start lg:justify-end">
                      <SettingsButton
                        aria-label={t("settings.embedding.action.save")}
                        className="w-[90px] justify-center"
                        disabled={!embeddingSettingsChanged || embeddingSettingsDisabled}
                        onClick={handleSaveEmbeddingSettings}
                      >
                        {embeddingSettingsMutation.isPending
                          ? t("settings.embedding.action.saving")
                          : t("settings.embedding.action.save")}
                      </SettingsButton>
                    </div>
                  </div>
                  {embeddingSettingsQuery.isLoading || !effectiveEmbeddingDraft ? (
                    <div className={cn("text-sm", SETTINGS_SECONDARY_TEXT_CLASS)}>
                      {t("settings.embedding.loading")}
                    </div>
                  ) : embeddingSettingsQuery.isError ? (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-800">
                      {t("settings.embedding.loadFailed")}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <InterfaceSettingsCard
                        title={t("settings.section.embedding.title")}
                        description={t("settings.section.embedding.description")}
                      >
                        <PopoverSelect<EmbeddingProvider>
                          id="desktop-embedding-provider"
                          ariaLabel={t("settings.section.embedding.title")}
                          disabled={embeddingSettingsDisabled}
                          onChange={(provider) => updateEmbeddingDraft({ provider })}
                          options={embeddingProviderOptions}
                          triggerClassName={APPEARANCE_SELECT_TRIGGER_CLASS_NAME}
                          value={effectiveEmbeddingDraft.provider}
                        />
                      </InterfaceSettingsCard>

                      {effectiveEmbeddingDraft.provider === "huggingface" ? (
                        <InterfaceSettingsCard
                          title={t("settings.embedding.huggingFaceToken.label")}
                          description={t("settings.embedding.huggingFaceToken.description")}
                        >
                          <input
                            id="desktop-huggingface-token"
                            aria-label={t("settings.embedding.huggingFaceToken.label")}
                            autoComplete="off"
                            className={EMBEDDING_INPUT_CLASS_NAME}
                            disabled={embeddingSettingsDisabled}
                            onChange={(event) =>
                              updateEmbeddingDraft({
                                huggingface_api_key: event.currentTarget.value,
                              })
                            }
                            placeholder={t("settings.embedding.huggingFaceToken.placeholder")}
                            type="password"
                            value={effectiveEmbeddingDraft.huggingface_api_key}
                          />
                        </InterfaceSettingsCard>
                      ) : null}

                      {effectiveEmbeddingDraft.provider === "ollama" ? (
                        <>
                          <InterfaceSettingsCard
                            title={t("settings.embedding.ollamaModel.label")}
                            description={t("settings.embedding.ollamaModel.description")}
                          >
                            <input
                              id="desktop-ollama-model"
                              aria-label={t("settings.embedding.ollamaModel.label")}
                              className={EMBEDDING_INPUT_CLASS_NAME}
                              disabled={embeddingSettingsDisabled}
                              onChange={(event) =>
                                updateEmbeddingDraft({
                                  model: event.currentTarget.value,
                                })
                              }
                              placeholder="bge-m3"
                              type="text"
                              value={effectiveEmbeddingDraft.model}
                            />
                          </InterfaceSettingsCard>
                          <InterfaceSettingsCard
                            title={t("settings.embedding.ollamaUrl.label")}
                            description={t("settings.embedding.ollamaUrl.description")}
                          >
                            <input
                              id="desktop-ollama-url"
                              aria-label={t("settings.embedding.ollamaUrl.label")}
                              className={EMBEDDING_INPUT_CLASS_NAME}
                              disabled={embeddingSettingsDisabled}
                              onChange={(event) =>
                                updateEmbeddingDraft({
                                  ollama_url: event.currentTarget.value,
                                })
                              }
                              placeholder="http://localhost:11434"
                              type="text"
                              value={effectiveEmbeddingDraft.ollama_url}
                            />
                          </InterfaceSettingsCard>
                        </>
                      ) : null}
                    </div>
                  )}
                </section>

                <section className="order-3 flex flex-col gap-3">
                  <SettingsGroupHeading
                    label={t("settings.group.appearance")}
                  />
                  <InterfaceSettingsSection />
                  <InterfaceSettingsCard
                    title={t("settings.section.noteLanguage.title")}
                    description={t("settings.section.noteLanguage.description")}
                  >
                    <PopoverSelect<string>
                      id="desktop-note-language-name"
                      ariaLabel={t("settings.section.noteLanguage.label")}
                      contentClassName="max-h-72 overflow-y-auto"
                      disabled={
                        desktopUserSettingsQuery.isLoading || desktopUserSettingsMutation.isPending
                      }
                      onChange={handleNoteLanguageChange}
                      options={noteLanguageOptions}
                      triggerClassName={APPEARANCE_SELECT_TRIGGER_CLASS_NAME}
                      value={noteLanguageDraft}
                    />
                  </InterfaceSettingsCard>
                </section>

                <section className="order-1 flex flex-col gap-3">
                  <SettingsGroupHeading
                    label={t("settings.group.software")}
                  />
                  <SettingsCard
                    title={t("settings.section.software.title")}
                    titleAdornment={
                      <Badge
                        tone="success"
                        className="px-2 py-0.5 text-[10px] font-medium"
                      >
                        {installedVersionLabel}
                      </Badge>
                    }
                    description={t("settings.section.software.description")}
                    actions={
                      <SettingsButton
                        aria-label={t("settings.section.software.checkForUpdates")}
                        className="group w-[90px] justify-center"
                        disabled={updaterBusy || updaterRefreshing}
                        onClick={() => {
                          if (pendingDesktopUpdate && canUseDesktopUpdater) {
                            void handleUpdaterAction();
                            return;
                          }
                          void refreshDesktopUpdaterState(true);
                        }}
                      >
                        {showUpdaterRecheckLabel ? (
                          <>
                            <span className="group-hover:hidden group-focus-visible:hidden">
                              {t("settings.section.software.upToDate")}
                            </span>
                            <span className="hidden group-hover:inline group-focus-visible:inline">
                              {t("settings.section.software.check")}
                            </span>
                          </>
                        ) : (
                          updateButtonLabel
                        )}
                      </SettingsButton>
                    }
                  >
                    {buildProvenanceQuery.data ? (
                      <div className="text-muted-foreground mt-3 space-y-1 font-mono text-xs">
                        <div>
                          {t("settings.section.software.sourceGitSha")}: {buildProvenanceQuery.data.source_git_sha}
                        </div>
                        <div>
                          {t("settings.section.software.runtimeBuildId")}: {buildProvenanceQuery.data.runtime_build_id ?? t("common.unavailable")}
                        </div>
                      </div>
                    ) : null}
                    {embeddingBootstrapMessage ? (
                      <div
                        className={cn(
                          "mt-3 rounded-lg border px-3 py-2 text-sm",
                          desktopSetupStatusQuery.data?.embedding_runtime_phase === "failed"
                            ? "border-amber-500/20 bg-amber-500/5 text-amber-800"
                            : "border-amber-500/20 bg-amber-500/5 text-amber-800",
                        )}
                      >
                        {embeddingBootstrapMessage}
                      </div>
                    ) : null}
                    {updaterMessage || updaterInstalled || updaterError ? (
                      <div
                        className={cn(
                          "mt-3 rounded-lg border px-3 py-2 text-sm",
                          updaterError
                            ? "border-amber-500/20 bg-amber-500/5 text-amber-800"
                            : updaterInstalled
                              ? "border-sky-500/20 bg-sky-500/5 text-sky-700"
                              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-700",
                        )}
                      >
                        {updaterError ??
                          updaterMessage ??
                          t("settings.section.software.installedMessage")}
                      </div>
                    ) : null}
                  </SettingsCard>
                </section>

              </div>
            </TabsContent>

            <TabsContent
              value="maintenance"
              className="mt-0 h-full overflow-y-auto"
            >
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-6">
                <div className="relative flex flex-col gap-4">
                  <SettingsCard
                    title={t("settings.section.runtime.title")}
                    description={t("settings.section.runtime.description")}
                    actionsLayout="stacked"
                    actions={
                      <>
                        <SettingsButton
                          disabled={runtimeManualRefreshPending || runtimeActionPending}
                          onClick={() => void refreshRuntimeDiagnostics()}
                        >
                          <span className="inline-flex items-center gap-2">
                            {runtimeDiagnosticsRefreshing ? <SettingsInlineSpinner /> : null}
                            <span>{t("settings.runtime.action.refresh")}</span>
                          </span>
                        </SettingsButton>
                        <SettingsButton
                          disabled={!canRestartRuntime || runtimeActionPending}
                          onClick={handleRestartRuntime}
                        >
                          <span className="inline-flex items-center gap-2">
                            {runtimeRestartMutation.isPending ? <SettingsInlineSpinner /> : null}
                            <span>
                              {runtimeRestartMutation.isPending
                                ? t("settings.runtime.action.restarting")
                                : t("settings.runtime.action.restart")}
                            </span>
                          </span>
                        </SettingsButton>
                        <SettingsButton
                          disabled={!canRepairRuntime || runtimeActionPending}
                          onClick={handleRepairRuntime}
                        >
                          <span className="inline-flex items-center gap-2">
                            {runtimeRepairMutation.isPending ? <SettingsInlineSpinner /> : null}
                            <span>
                              {runtimeRepairMutation.isPending
                                ? t("settings.runtime.action.repairing")
                                : t("settings.runtime.action.repair")}
                            </span>
                          </span>
                        </SettingsButton>
                      </>
                    }
                    titleAdornment={
                      runtimeDiagnostics ? (
                        <StatusBadge state={runtimeDiagnostics.overall_state} />
                      ) : undefined
                    }
                  >
                    {!runtimeDiagnosticsAvailable() ? (
                      <div className={cn("text-sm", SETTINGS_SECONDARY_TEXT_CLASS)}>
                        {t("settings.runtime.unavailable")}
                      </div>
                    ) : runtimeDiagnosticsInitialLoading ? (
                      <div className={cn("text-sm", SETTINGS_SECONDARY_TEXT_CLASS)}>
                        {t("settings.runtime.loading")}
                      </div>
                    ) : runtimeDiagnostics ? (
                      <div className="flex flex-col gap-4">
                        <div className={cn("text-xs", SETTINGS_SECONDARY_TEXT_CLASS)}>
                          {t("settings.runtime.sourceShell")}
                        </div>
                        {runtimeActionPending && runtimeActionProgressMessage ? (
                          <div
                            className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-sm text-sky-700 dark:text-sky-300"
                            role="status"
                          >
                            <span className="inline-flex items-center gap-2">
                              <SettingsInlineSpinner />
                              <span>{runtimeActionProgressMessage}</span>
                            </span>
                          </div>
                        ) : null}
                        {runtimeActionFeedback ? (
                          <div
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm",
                              runtimeActionFeedback.tone === "success"
                                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700"
                                : "border-amber-500/20 bg-amber-500/5 text-amber-800",
                            )}
                          >
                            {runtimeActionFeedback.message}
                          </div>
                        ) : null}
                        {runtimeDiagnosticsRefreshErrorMessage ? (
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-800">
                            {runtimeDiagnosticsRefreshErrorMessage}
                          </div>
                        ) : null}
                        {runtimeActionAvailabilityMessage ? (
                          <div className={cn("rounded-lg border px-3 py-2 text-xs", SETTINGS_MUTED_NOTICE_CLASS)}>
                            {runtimeActionAvailabilityMessage}
                          </div>
                        ) : null}
                        <div className={cn("rounded-lg border px-3 py-2 text-sm", SETTINGS_MUTED_NOTICE_CLASS)}>
                          {runtimeActiveEmbeddingMessage ?? runtimeSummaryMessage}
                        </div>
                        {runtimeActiveEmbeddingMessage ? (
                          <div className={cn("text-xs", SETTINGS_SECONDARY_TEXT_CLASS)}>
                            {runtimeSummaryMessage}
                          </div>
                        ) : null}
                      </div>
                    ) : runtimeDiagnosticsQuery.error ? (
                      <div className="flex flex-col gap-2">
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-800">
                          {t("settings.runtime.loadFailed")}
                        </div>
                        {runtimeDiagnosticsErrorMessage ? (
                          <div className={cn("rounded-lg border px-3 py-2 text-xs", SETTINGS_MUTED_NOTICE_CLASS)}>
                            {runtimeDiagnosticsErrorMessage}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className={cn("text-sm", SETTINGS_SECONDARY_TEXT_CLASS)}>
                        {t("settings.runtime.noItems")}
                      </div>
                    )}
                  </SettingsCard>

                  {runtimeDiagnostics ? (
                    <>
                      <SettingsCard
                        title={t("settings.runtime.servicesTitle", { count: runtimeServiceItems.length })}
                      >
                        {runtimeServiceItems.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {runtimeServiceItems.map((item) => (
                              <RuntimeInventoryItem key={item.kind} item={item} />
                            ))}
                          </div>
                        ) : (
                          <div className={cn("text-sm", SETTINGS_SECONDARY_TEXT_CLASS)}>
                            {t("settings.runtime.noItems")}
                          </div>
                        )}
                      </SettingsCard>

                      <SettingsCard
                        title={t("settings.runtime.dependenciesTitle", {
                          count: runtimeDependencyItems.length,
                        })}
                      >
                        {runtimeDependencyItems.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {runtimeDependencyItems.map((item) => (
                              <RuntimeInventoryItem key={item.kind} item={item} />
                            ))}
                          </div>
                        ) : (
                          <div className={cn("text-sm", SETTINGS_SECONDARY_TEXT_CLASS)}>
                            {t("settings.runtime.noItems")}
                          </div>
                        )}
                      </SettingsCard>
                    </>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="account"
              className="mt-0 h-full overflow-y-auto"
            >
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-6">
                <section className="flex flex-col gap-3">
                  <SettingsGroupHeading
                    label={t("settings.group.subscription")}
                  />

                  <SettingsCard
                    title={t("settings.section.subscription.title")}
                    description={subscriptionDescription}
                    titleAdornment={
                      <SettingsBadge
                        tone={accountPlanTone(accountPlanState)}
                        className="px-2 py-0.5 text-[10px]"
                      >
                        {accountStateLabel}
                      </SettingsBadge>
                    }
                    actions={
                      accountPlanState === "free" ? (
                        <SettingsButton
                          aria-label={t("settings.section.account.action.connectPro")}
                          disabled={!needsProDeviceActivation && !canConnectPro}
                          title={
                            !needsProDeviceActivation && !canConnectPro
                              ? accountActionUnavailableMessage
                              : undefined
                          }
                          onClick={handleOpenConnectPro}
                        >
                          {activationMutation.isPending
                            ? t("settings.section.account.action.connecting")
                            : t("settings.section.account.action.connectPro")}
                        </SettingsButton>
                      ) : hasSignedInAccount ? (
                        <SettingsButton
                          aria-label={t("settings.section.subscription.action.manage")}
                          disabled={!canOpenAccount}
                          title={!canOpenAccount ? accountActionUnavailableMessage : undefined}
                          onClick={handleOpenAccountPortal}
                        >
                          {t("settings.section.subscription.action.manage")}
                        </SettingsButton>
                      ) : null
                    }
                  />
                </section>

                <section className="flex flex-col gap-3">
                  <SettingsGroupHeading
                    label={t("settings.group.access")}
                  />

                  <SettingsCard
                    title={t("settings.section.account.title")}
                    description={accountActionDescription}
                    actions={
                      shouldShowAccountReconnectAction ? (
                        <SettingsButton
                          aria-label={
                            needsProDeviceActivation
                              ? t("settings.section.account.action.connectPro")
                              : isActivationReauthRequired
                                ? t("settings.section.account.action.reconnect")
                                : t("settings.section.account.action.connect")
                          }
                          disabled={isRegisterDisabled}
                          onClick={() => {
                            void requestSettingsActivation();
                          }}
                        >
                          {activationMutation.isPending
                            ? t("settings.section.account.action.connecting")
                            : needsProDeviceActivation
                              ? t("settings.section.account.action.connectPro")
                              : isActivationReauthRequired
                                ? t("settings.section.account.action.reconnect")
                                : t("settings.section.account.action.connect")}
                        </SettingsButton>
                      ) : hasSignedInAccount ? (
                        <SettingsButton
                          aria-label={t("settings.section.account.action.open")}
                          disabled={!canOpenAccount}
                          title={!canOpenAccount ? accountActionUnavailableMessage : undefined}
                          onClick={handleOpenAccountPortal}
                        >
                          {t("settings.section.account.action.open")}
                        </SettingsButton>
                      ) : null
                    }
                  >
                    {showActivationUrl ? (
                      <details className="mt-3">
                        <summary className={SETTINGS_SUMMARY_CLASS}>
                          {t("settings.section.account.showActivationUrl")}
                        </summary>
                        <div className="mt-2">
                          <FixedField
                            copyable
                            hideLabel
                            label={t("settings.section.account.activationUrl")}
                            multiline
                            value={approvalUrl}
                          />
                        </div>
                      </details>
                    ) : null}
                  </SettingsCard>

                  {productSupportsPro && activationFailureLabel ? (
                    <div
                      className={cn(
                        "mt-1 rounded-lg border px-3 py-2 text-xs",
                        activationFailureTone === "terminal"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
                      )}
                    >
                      <div className="font-medium">{activationFailureLabel}</div>
                      {desktopActivationMessage ? (
                        <div className="mt-1">{desktopActivationMessage}</div>
                      ) : null}
                    </div>
                  ) : null}

                  {isBrowserActivationPending ? (
                    <div className={SETTINGS_MUTED_NOTICE_CLASS}>
                      {isTransferActivationPending
                        ? t("settings.section.account.browserActivationTransfer")
                        : t("settings.section.account.browserActivationCheck")}
                      <details className="mt-2">
                        <summary className="cursor-pointer font-medium text-foreground">
                          {t("settings.section.account.needBrowserLink")}
                        </summary>
                        <SettingsButton
                          className="mt-2"
                          onClick={() => {
                            void openExternalUrl(approvalUrl);
                          }}
                        >
                          {t("settings.section.account.openActivationLink")}
                        </SettingsButton>
                      </details>
                    </div>
                  ) : null}

                  {hasSignedInAccount ? (
                    <div className="flex justify-end gap-2 pr-4">
                      <SettingsButton
                        aria-label={t("settings.section.account.signOut")}
                        disabled={logoutMutation.isPending}
                        onClick={() => {
                          void logoutMutation.mutateAsync();
                        }}
                      >
                        {logoutMutation.isPending
                          ? t("settings.section.account.signOutPending")
                          : t("settings.section.account.signOut")}
                      </SettingsButton>
                    </div>
                  ) : null}
                </section>
              </div>
            </TabsContent>

            <TabsContent
              value="mcp"
              className="mt-0 h-full overflow-y-auto"
            >
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-6">
                <SettingsCard
                  title={t("settings.mcp.stdio.title")}
                  description={t("settings.mcp.stdio.description")}
                >
                  {desktopSetupStatusQuery.isLoading ? (
                    <div className={cn("rounded-lg border px-3 py-2 text-sm", SETTINGS_MUTED_NOTICE_CLASS)}>
                      {t("settings.mcp.stdio.loading")}
                    </div>
                  ) : desktopSetupStatusQuery.isError ? (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-800">
                      {t("settings.mcp.stdio.unavailable")}
                    </div>
                  ) : stdioDesktopSnippet && stdioCodexSnippet ? (
                    <div className="grid gap-3">
                      <SettingsSnippetDisclosure
                        label={t("settings.mcp.stdio.snippet.json.title")}
                        description={t("settings.mcp.stdio.snippet.json.description")}
                        snippet={stdioDesktopSnippet}
                      />
                      <SettingsSnippetDisclosure
                        label={t("settings.mcp.stdio.snippet.yaml.title")}
                        description={t("settings.mcp.stdio.snippet.yaml.description")}
                        snippet={stdioCodexSnippet}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-800">
                      {t("settings.mcp.stdio.launcherMissing")}
                    </div>
                  )}
                </SettingsCard>

                <SettingsCard
                  title={t("settings.mcp.http.title")}
                  description={remoteMcpDescription}
                  titleAdornment={!isFreeEdition ? <StatusBadge state={mcpStatusState} /> : null}
                  actions={
                    isFreeEdition ? (
                      <SettingsButton
                        aria-label={t("settings.mcp.http.action.upgrade")}
                        className="sm:min-w-[124px]"
                        disabled={!canConnectPro}
                        title={!canConnectPro ? accountActionUnavailableMessage : undefined}
                        onClick={handleOpenConnectPro}
                      >
                        {t("settings.mcp.http.action.upgrade")}
                      </SettingsButton>
                    ) : (
                      <div className="flex shrink-0 items-center sm:justify-end">
                        <Switch
                          aria-label={remoteMcpSwitchAriaLabel}
                          checked={remoteMcpSwitchChecked}
                          disabled={remoteMcpSwitchDisabled}
                          onCheckedChange={handleRemoteMcpSwitchChange}
                        />
                      </div>
                    )
                  }
                >
                  {showRemoteMcpUrlField ? (
                    <FileHomeDetailField
                      action={
                        <CopyableId
                          ariaLabel={t("settings.mcp.http.action.copyMcpUrl")}
                          iconOnly
                          title={t("settings.mcp.http.action.copyMcpUrl")}
                          value={protectedResourceUrl}
                        />
                      }
                      label={t("settings.mcp.http.urlLabel")}
                      mono
                      value={protectedResourceUrl}
                    />
                  ) : null}
                  {!isFreeEdition && networkStatusMessage ? (
                    <div
                      className={cn(
                        showRemoteMcpUrlField ? "mt-3" : undefined,
                        "rounded-lg border px-3 py-2 text-xs",
                        entitlementView.leaseTone === "usable"
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                          : entitlementView.leaseTone === "blocked"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                            : SETTINGS_MUTED_NOTICE_CLASS,
                      )}
                    >
                      {networkStatusMessage}
                    </div>
                  ) : null}
                  {!isFreeEdition &&
                  status?.credential_material_present === true &&
                  entitlementView.leaseTone === "usable" ? (
                    <div className="mt-3 flex flex-col gap-3 pt-3">
                      <div className="flex items-start gap-3 px-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-foreground text-sm font-semibold">
                            {t("settings.mcp.connectors.title")}
                          </h4>
                          <p className={SETTINGS_CARD_DESCRIPTION_CLASS}>
                            {t("settings.mcp.connectors.description")}
                          </p>
                        </div>
                        <div className={MCP_CONNECTOR_ACTION_COLUMN_CLASS}>
                          {connectedOAuthSessions.length > 0 ? (
                          <SettingsButton
                            className={cn(
                              MCP_CONNECTOR_ACTION_BUTTON_CLASS,
                              MCP_CONNECTOR_REVOKE_BUTTON_CLASS,
                            )}
                            disabled={
                              revokingAllConnectedSessions ||
                              revokingConnectedClientId !== null
                            }
                            onClick={() => {
                              void handleRevokeAllConnectedOAuthSessions();
                            }}
                          >
                            {revokingAllConnectedSessions
                              ? t("settings.mcp.connectedSessions.revokingAll")
                              : t("settings.mcp.connectedSessions.revokeAll")}
                          </SettingsButton>
                        ) : null}
                        </div>
                      </div>
                      {mcpConnectorsLoading ? (
                        <p className={SETTINGS_SECONDARY_TEXT_CLASS}>
                          {t("settings.mcp.connectors.loading")}
                        </p>
                      ) : null}
                      {mcpConnectorsQueryWarnings.map((warning) => (
                        <p
                          key={warning}
                          className="text-sm text-amber-800 dark:text-amber-300"
                        >
                          {warning}
                        </p>
                      ))}
                      {mcpConnectorsShowEmpty ? (
                        <p className={SETTINGS_SECONDARY_TEXT_CLASS}>
                          {t("settings.mcp.connectors.empty")}
                        </p>
                      ) : null}
                      {mcpConnectorRows.length > 0 ? (
                        <div className="grid gap-2">
                          {mcpConnectorRows.map((row) => {
                            if (row.kind === "pending") {
                              return (
                                <PendingMcpConnectorItemCard
                                  key={`pending-${row.item.request_id}`}
                                  isApproving={
                                    approvingPendingAuthorizationId === row.item.request_id
                                  }
                                  item={row.item}
                                  onApprove={() => {
                                    void handleApprovePendingAuthorization(row.item.request_id);
                                  }}
                                />
                              );
                            }

                            return (
                              <ConnectedMcpConnectorItemCard
                                key={`connected-${row.item.client_id}`}
                                isRevoking={revokingConnectedClientId === row.item.client_id}
                                item={row.item}
                                onRevoke={() => {
                                  void handleRevokeConnectedOAuthSession(row.item.client_id);
                                }}
                              />
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </SettingsCard>

                <SettingsCard
                  title={t("settings.mcp.toolSurface.title")}
                  description={
                    mcpToolVisibility?.canManage
                      ? t("settings.mcp.toolSurface.descriptionManage")
                      : t("settings.mcp.toolSurface.descriptionReadOnly")
                  }
                  actions={
                    mcpToolVisibilityQuery.isLoading ? (
                      <SettingsBadge tone="progress">
                        {t("settings.mcp.toolSurface.loading")}
                      </SettingsBadge>
                    ) : (
                      <SettingsBadge tone={mcpToolVisibility?.canManage ? "premium" : "info"}>
                        {t("settings.mcp.toolSurface.visibleCount", { count: visibleToolCount })}
                      </SettingsBadge>
                    )
                  }
                >
                  {mcpToolVisibility?.canManage ? (
                    <div className="grid gap-2">
                      {mcpToolVisibility.groups.map((group) => {
                        const enabled =
                          mcpToolVisibility.enabledGroups[group.family] ?? group.enabled;
                        const isGroupPending = pendingMcpVisibilityFamilies.has(group.family);
                        const canToggle =
                          mcpToolVisibility.canManage &&
                          !group.required &&
                          !isGroupPending;
                        const labelKey = MCP_FAMILY_LABEL_KEYS[group.family];
                        const descriptionKey =
                          MCP_FAMILY_DESCRIPTION_KEYS[group.family];
                        const familyLabel = labelKey ? t(labelKey) : group.label;
                        const familyDescription = descriptionKey
                          ? t(descriptionKey)
                          : group.description;
                        return (
                          <div
                            key={group.family}
                            className="border-border/70 bg-muted/10 flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-foreground text-xs font-semibold">
                                  {familyLabel}
                                </span>
                                {group.required ? (
                                  <SettingsBadge>
                                    {t("settings.mcp.toolSurface.required")}
                                  </SettingsBadge>
                                ) : group.destructive ? (
                                  <SettingsBadge tone="danger">
                                    {t("settings.mcp.toolSurface.destructive")}
                                  </SettingsBadge>
                                ) : null}
                              </div>
                              <p className={SETTINGS_CARD_DESCRIPTION_CLASS}>
                                {familyDescription}
                              </p>
                              <p className="text-foreground/50 mt-1 text-[11px]">
                                {t("settings.mcp.toolSurface.toolCount", { count: group.tools.length })}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center sm:justify-end">
                              <Switch
                                aria-label={
                                  enabled
                                    ? t("settings.mcp.toolSurface.hideGroup", { label: familyLabel })
                                    : t("settings.mcp.toolSurface.showGroup", { label: familyLabel })
                                }
                                checked={enabled}
                                disabled={!canToggle}
                                onCheckedChange={(checked) => {
                                  if (!canToggle) {
                                    return;
                                  }
                                  void mcpToolVisibilityMutation
                                    .mutateAsync({
                                      enabled: checked,
                                      family: group.family,
                                    })
                                    .catch(() => undefined);
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : mcpToolVisibilityQuery.isError ? (
                    <p className={cn("text-xs", SETTINGS_SECONDARY_TEXT_CLASS)}>
                      {t("settings.mcp.toolSurface.loadError")}
                    </p>
                  ) : null}
                </SettingsCard>
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
      <Modal
        open={shouldBlockSettingsWithSignIn}
        onOpenChange={() => {}}
        closeOnOverlayClick={false}
      >
        <ModalContent className="max-w-md">
          <ModalHeader>
            <div className="space-y-1">
              <ModalTitle>{t("settings.section.account.signInRequiredTitle")}</ModalTitle>
              <ModalDescription>
                {t("settings.section.account.signInRequiredDescription")}
              </ModalDescription>
            </div>
          </ModalHeader>
          <ModalBody className="px-4 py-4">
            {showActivationUrl ? (
              <div className={SETTINGS_MUTED_NOTICE_CLASS}>
                {t("settings.section.account.browserActivationCheck")}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter className="flex items-center justify-end gap-2 border-0 pt-0">
            <SettingsButton
              aria-label={t("settings.section.account.action.connect")}
              disabled={isRegisterDisabled}
              onClick={() => {
                void requestSettingsActivation();
              }}
            >
              {activationMutation.isPending
                ? t("settings.section.account.action.connecting")
                : t("settings.section.account.action.connect")}
            </SettingsButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
}
