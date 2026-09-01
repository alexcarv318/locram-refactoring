import type { DictionaryKey } from "@/i18n/dictionaries/en";
import type { Translator } from "@/i18n/translate";
import type { BaseShareGrantPermission, BaseShareGrantState, BaseStats } from "@/types";

export type ManagedBaseKind = "ggl" | "documentation";

export type FileHomeSubjectKind =
  | "export_artifact"
  | "backup_artifact"
  | "incoming_sqlite_file";

export type FileHomeManagementScope =
  | "managed_export"
  | "managed_backup"
  | "external_file";

export type LocalBaseSource = {
  kind: "local-base";
  id: string;
  label: string;
  entryId: string;
  baseId: string;
  stats?: BaseStats | null;
};

export type SharedBaseSource = {
  kind: "shared-base";
  id: string;
  label: string;
  grantId: string;
  shareBaseId: string;
  entryId?: string | null;
  recipientActorRef: string;
  recipientAccountId?: string | null;
  permission: BaseShareGrantPermission;
  ownerActorRef: string;
  ownerDisplayName?: string | null;
  expiresAt?: string | null;
  grantState?: BaseShareGrantState;
  createdAt?: string | null;
  activatedAt?: string | null;
  visibleInMcp?: boolean;
  authorityDbPath?: string | null;
  authorityAvailable?: boolean;
  baseStats?: BaseStats | null;
};

export type ManagedBaseSource = {
  kind: "managed-base";
  id: string;
  label: string;
  baseRef: string;
  managedBaseKind: ManagedBaseKind;
};

export type FileHomeSource = {
  kind: "file-home";
  id: string;
  label: string;
  path: string;
  filename?: string;
  sizeBytes?: number | null;
  subjectKind: FileHomeSubjectKind;
  managementScope: FileHomeManagementScope;
};

export type ActiveSource =
  | LocalBaseSource
  | FileHomeSource
  | ManagedBaseSource
  | SharedBaseSource;

export function sourceLabel(source: ActiveSource | null): string | null {
  return source?.label ?? null;
}

export function managedBaseDisplayLabelKey(
  managedBaseKind: ManagedBaseKind,
): DictionaryKey {
  if (managedBaseKind === "ggl") {
    return "bases.builtIn.governance";
  }
  return "bases.builtIn.documentation";
}

export function resolveManagedBaseDisplayLabel(
  managedBaseKind: ManagedBaseKind,
  translate: Translator,
): string {
  return translate(managedBaseDisplayLabelKey(managedBaseKind));
}

export function isSourceActive(
  activeSource: ActiveSource | null,
  candidate: ActiveSource,
): boolean {
  if (!activeSource) {
    return false;
  }
  return activeSource.id === candidate.id;
}

export function defaultSourceNodeId(source: ActiveSource): string | null {
  void source;
  return null;
}
