import type { ReactNode } from "react";

import Badge, { type BadgeTone } from "@/components/ui/Badge";
import type { DictionaryKey } from "@/i18n/dictionaries/en";
import type { Translator } from "@/i18n/translate";
import type { AccessSummary, BaseShareGrantPermission, OwnerBaseShareManagementItem } from "@/types";

const GRANT_STATE_LABEL_KEYS: Record<string, DictionaryKey> = {
  active: "network.grantState.active",
  created: "network.grantState.created",
  expired: "network.grantState.expired",
  pending: "network.grantState.pending",
  revoked: "network.grantState.revoked",
};

const PERMISSION_LABEL_KEYS: Record<BaseShareGrantPermission, DictionaryKey> = {
  admin: "network.permission.admin",
  read: "network.permission.read",
  write: "network.permission.write",
};

const ACTIVATION_STATE_LABEL_KEYS: Record<string, DictionaryKey> = {
  active: "network.activationState.active",
  created: "network.activationState.created",
  pending: "network.activationState.pending",
};

function grantStateTone(grantState: string): BadgeTone {
  if (grantState === "active") {
    return "success";
  }
  if (grantState === "expired") {
    return "warning";
  }
  if (grantState === "revoked") {
    return "danger";
  }
  return "neutral";
}

function permissionTone(permission: BaseShareGrantPermission): BadgeTone {
  if (permission === "read") {
    return "info";
  }
  if (permission === "write") {
    return "warning";
  }
  if (permission === "admin") {
    return "danger";
  }
  return "neutral";
}

function activationStateTone(activationState: string): BadgeTone {
  if (activationState === "active") {
    return "success";
  }
  if (activationState === "pending" || activationState === "created") {
    return "warning";
  }
  return "neutral";
}

export function BaseShareGrantStateBadge({
  grantState,
  t,
}: {
  grantState: string;
  t: Translator;
}) {
  const labelKey = GRANT_STATE_LABEL_KEYS[grantState];
  const label = labelKey ? t(labelKey) : grantState;
  return (
    <Badge tone={grantStateTone(grantState)} uppercase>
      {label}
    </Badge>
  );
}

export function BaseSharePermissionBadge({
  permission,
  t,
}: {
  permission: BaseShareGrantPermission;
  t: Translator;
}) {
  return (
    <Badge tone={permissionTone(permission)} uppercase>
      {t(PERMISSION_LABEL_KEYS[permission])}
    </Badge>
  );
}

export function BaseShareActivationStateBadge({
  activationState,
  t,
}: {
  activationState: NonNullable<OwnerBaseShareManagementItem["activation_state"]>;
  t: Translator;
}) {
  const labelKey = ACTIVATION_STATE_LABEL_KEYS[activationState];
  const label = labelKey ? t(labelKey) : activationState;
  return (
    <Badge tone={activationStateTone(activationState)} uppercase>
      {label}
    </Badge>
  );
}

export function shouldShowActivationStateBadge(
  activationState: OwnerBaseShareManagementItem["activation_state"],
): activationState is "pending" {
  return activationState === "pending";
}

export function inviteMintingReady(accessSummary: AccessSummary | undefined): boolean {
  return Boolean(
    accessSummary?.status.enabled &&
      accessSummary.record &&
      accessSummary.status.mode === "managed_public",
  );
}

export function resolveInviteReadinessNotice(
  t: Translator,
  accessSummary: AccessSummary | undefined,
): string | null {
  if (inviteMintingReady(accessSummary)) {
    return null;
  }
  if (!accessSummary?.status.enabled) {
    return t("sharing.owner.readiness.accessDisabled");
  }
  if (!accessSummary.record) {
    return t("sharing.owner.readiness.noCredential");
  }
  if (accessSummary.status.mode !== "managed_public") {
    return t("sharing.owner.readiness.requiresManagedPublic");
  }
  return null;
}

export function SharingFormFieldRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] lg:items-center lg:gap-4">
      <span className="text-foreground text-sm font-medium">{label}</span>
      <div className="min-w-0">{children}</div>
    </label>
  );
}
