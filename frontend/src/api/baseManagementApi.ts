import { bridgeClient } from "@/lib/bridgeClient";
import type {
  AgentAccessMode,
  ArtifactInspection,
  BackupSummary,
  BaseRegistryEntry,
  ExportRequest,
  ExportResult,
  ManagedBaseSummary,
  MergeOutcomeSummary,
  MergePlanSummary,
  RestoreResult,
} from "@/types";

function normalizeAgentAccessMode(
  item: BaseRegistryEntry,
): AgentAccessMode {
  if (
    item.agent_access_mode === "write"
    || item.agent_access_mode === "read"
    || item.agent_access_mode === "hidden"
  ) {
    return item.agent_access_mode;
  }
  return item.visible_in_mcp === false ? "hidden" : "write";
}

function normalizeBaseRegistryEntry(item: BaseRegistryEntry): BaseRegistryEntry {
  const agent_access_mode = normalizeAgentAccessMode(item);
  return {
    ...item,
    agent_access_mode,
    visible_in_mcp: agent_access_mode !== "hidden",
  };
}

export async function fetchBases(
  baseUrl: string,
): Promise<{
  items: BaseRegistryEntry[];
  active_base: BaseRegistryEntry | null;
  built_in_bases: ManagedBaseSummary[];
}> {
  const payload = await bridgeClient.get<{
    items: BaseRegistryEntry[];
    active_base: BaseRegistryEntry | null;
    built_in_bases?: ManagedBaseSummary[];
  }>(
    baseUrl,
    "/api/bases",
  );
  return {
    items: payload.items.map((item) => normalizeBaseRegistryEntry(item)),
    active_base: payload.active_base
      ? normalizeBaseRegistryEntry(payload.active_base)
      : null,
    built_in_bases: payload.built_in_bases ?? [],
  };
}

export async function registerBase(
  baseUrl: string,
  payload: { path: string; display_name?: string; activate?: boolean },
): Promise<BaseRegistryEntry> {
  const json = await bridgeClient.post<{ item: BaseRegistryEntry }>(
    baseUrl,
    "/api/bases/register",
    payload,
  );
  return json.item;
}

export async function createBase(
  baseUrl: string,
  payload: { path: string; display_name: string; activate?: boolean },
): Promise<BaseRegistryEntry> {
  const json = await bridgeClient.post<{ item: BaseRegistryEntry }>(
    baseUrl,
    "/api/bases/create",
    payload,
  );
  return json.item;
}

export async function switchBase(baseUrl: string, entryId: string): Promise<BaseRegistryEntry> {
  const json = await bridgeClient.post<{ item: BaseRegistryEntry }>(
    baseUrl,
    `/api/bases/${entryId}/switch`,
  );
  return json.item;
}

export async function replaceActiveBase(
  baseUrl: string,
  path: string,
): Promise<BaseRegistryEntry> {
  const json = await bridgeClient.post<{ item: BaseRegistryEntry }>(
    baseUrl,
    "/api/bases/replace-active",
    { path },
  );
  return json.item;
}

export async function unregisterBase(
  baseUrl: string,
  entryId: string,
): Promise<{ removed: boolean; entry_id: string }> {
  return bridgeClient.post<{ removed: boolean; entry_id: string }>(
    baseUrl,
    `/api/bases/${entryId}/unregister`,
  );
}

export async function renameBase(
  baseUrl: string,
  entryId: string,
  displayName: string,
): Promise<BaseRegistryEntry> {
  const json = await bridgeClient.put<{ item: BaseRegistryEntry }>(
    baseUrl,
    `/api/bases/${entryId}/rename`,
    { display_name: displayName },
  );
  return json.item;
}

export async function setBaseAgentAccessMode(
  baseUrl: string,
  entryId: string,
  agentAccessMode: AgentAccessMode,
): Promise<BaseRegistryEntry> {
  const json = await bridgeClient.post<{ item: BaseRegistryEntry }>(
    baseUrl,
    `/api/bases/${entryId}/mcp-visibility`,
    { agent_access_mode: agentAccessMode },
  );
  return normalizeBaseRegistryEntry(json.item);
}

export async function setBaseMcpVisibility(
  baseUrl: string,
  entryId: string,
  visibleInMcp: boolean,
): Promise<BaseRegistryEntry> {
  return setBaseAgentAccessMode(
    baseUrl,
    entryId,
    visibleInMcp ? "write" : "hidden",
  );
}

export async function deleteBase(
  baseUrl: string,
  entryId: string,
  force = false,
): Promise<{ deleted: boolean; path: string }> {
  return bridgeClient.post<{ deleted: boolean; path: string }>(
    baseUrl,
    `/api/bases/${entryId}/delete`,
    { force },
  );
}

export async function refreshManagedBase(
  baseUrl: string,
  kind: ManagedBaseSummary["kind"],
  locale?: string,
): Promise<ManagedBaseSummary> {
  const json = await bridgeClient.post<{ item: ManagedBaseSummary }>(
    baseUrl,
    `/api/bases/managed/${kind}/refresh`,
    locale ? { locale } : undefined,
  );
  return json.item;
}

export async function deleteBackup(
  baseUrl: string,
  filename: string,
): Promise<{ deleted: boolean; filename: string }> {
  return bridgeClient.delete<{ deleted: boolean; filename: string }>(
    baseUrl,
    `/api/backups/${encodeURIComponent(filename)}`,
  );
}

export async function renameBackup(
  baseUrl: string,
  filename: string,
  newFilename: string,
): Promise<BackupSummary> {
  const json = await bridgeClient.put<{ item: BackupSummary }>(
    baseUrl,
    `/api/backups/${encodeURIComponent(filename)}/rename`,
    { filename: newFilename },
  );
  return json.item;
}

export async function fetchBackups(baseUrl: string): Promise<BackupSummary[]> {
  const payload = await bridgeClient.get<{ items: BackupSummary[] }>(baseUrl, "/api/backups");
  return payload.items;
}

export async function createBackup(
  baseUrl: string,
  trigger = "manual",
): Promise<BackupSummary> {
  const json = await bridgeClient.post<{ item: BackupSummary }>(baseUrl, "/api/backups", {
    trigger,
  });
  return json.item;
}

export async function restoreBackup(
  baseUrl: string,
  request: string | { filename?: string; path?: string; allowBaseReplacement?: boolean },
  allowBaseReplacement = false,
): Promise<RestoreResult> {
  const payload =
    typeof request === "string"
      ? allowBaseReplacement
        ? { filename: request, allow_base_replacement: true }
        : { filename: request }
      : request.allowBaseReplacement
        ? {
            ...(request.filename ? { filename: request.filename } : {}),
            ...(request.path ? { path: request.path } : {}),
            allow_base_replacement: true,
          }
        : {
            ...(request.filename ? { filename: request.filename } : {}),
            ...(request.path ? { path: request.path } : {}),
          };
  const json = await bridgeClient.post<{ item: RestoreResult }>(
    baseUrl,
    "/api/backups/restore",
    payload,
  );
  return json.item;
}

export async function inspectArtifact(baseUrl: string, path: string): Promise<ArtifactInspection> {
  const json = await bridgeClient.post<{ item: ArtifactInspection }>(
    baseUrl,
    "/api/artifacts/inspect",
    { path },
  );
  return json.item;
}

export async function fetchMergePlan(baseUrl: string, path: string): Promise<MergePlanSummary> {
  const json = await bridgeClient.post<{ item: MergePlanSummary }>(
    baseUrl,
    "/api/merges/plan",
    { path },
  );
  return json.item;
}

export async function executeMerge(baseUrl: string, path: string): Promise<MergeOutcomeSummary> {
  const json = await bridgeClient.post<{ item: MergeOutcomeSummary }>(
    baseUrl,
    "/api/merges/execute",
    { path },
  );
  return json.item;
}

export type ExportSummary = {
  filename: string;
  path: string;
  size_bytes: number;
  created_at: string;
  package_label: string | null;
  artifact_id: string | null;
  source_base_id: string | null;
  page_count: number;
  active_page_count?: number | null;
  link_count: number;
  attachment_coverage_label: string | null;
  compatibility: string;
  provenance_summary: string | null;
};

export async function fetchExports(baseUrl: string): Promise<ExportSummary[]> {
  const payload = await bridgeClient.get<{ items: ExportSummary[] }>(baseUrl, "/api/exports");
  return payload.items;
}

export async function exportSubgraph(baseUrl: string, request: ExportRequest): Promise<ExportResult> {
  const json = await bridgeClient.post<{ item: ExportResult }>(baseUrl, "/api/export", request);
  return json.item;
}

export async function deleteExport(baseUrl: string, filename: string): Promise<void> {
  await bridgeClient.delete(baseUrl, `/api/exports/${encodeURIComponent(filename)}`);
}

export async function renameExport(
  baseUrl: string,
  filename: string,
  newFilename: string,
): Promise<ExportSummary> {
  const json = await bridgeClient.put<{ item: ExportSummary }>(
    baseUrl,
    `/api/exports/${encodeURIComponent(filename)}/rename`,
    { filename: newFilename },
  );
  return json.item;
}
