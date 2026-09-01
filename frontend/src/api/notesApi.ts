import { bridgeClient } from "@/lib/bridgeClient";
import type { PageSummary, ScopeGraph } from "@/types";

export type WorkingBaseNotesOptions = {
  baseRef?: string;
  recipientActorRef?: string;
  recipientAccountId?: string;
};

function applyWorkingBaseParams(
  params: URLSearchParams,
  options?: WorkingBaseNotesOptions,
) {
  if (!options) {
    return;
  }
  if (options.baseRef) {
    params.set("base_ref", options.baseRef);
  }
  if (options.recipientActorRef) {
    params.set("recipient_actor_ref", options.recipientActorRef);
  }
  if (options.recipientAccountId) {
    params.set("recipient_account_id", options.recipientAccountId);
  }
}

export async function fetchNotesGraph(
  baseUrl: string,
  expandHops = 2,
  options?: WorkingBaseNotesOptions,
): Promise<ScopeGraph> {
  const params = new URLSearchParams({ expand_hops: String(expandHops) });
  applyWorkingBaseParams(params, options);
  const payload = await bridgeClient.get<{ item: ScopeGraph }>(
    baseUrl,
    `/api/notes/graph?${params.toString()}`,
  );
  return payload.item;
}

export type NotesSummariesPayload = {
  items: PageSummary[];
  builtInCounts: Record<string, number>;
  presetCounts: Record<string, number>;
  quickAccessScopeIds?: string[];
};

export function notesSummariesQueryKey(baseUrl: string, notesScopeKey: string) {
  return ["folders-notes-summaries", baseUrl, notesScopeKey] as const;
}

export async function fetchNotesSummaries(
  baseUrl: string,
  options?: WorkingBaseNotesOptions,
): Promise<NotesSummariesPayload> {
  const params = new URLSearchParams();
  applyWorkingBaseParams(params, options);
  const path = params.toString() ? `/api/notes/summaries?${params.toString()}` : "/api/notes/summaries";
  const payload = await bridgeClient.get<{
    items: PageSummary[];
    built_in_counts: Record<string, number>;
    preset_counts?: Record<string, number>;
    quick_access_scope_ids?: string[];
  }>(baseUrl, path);
  return {
    items: payload.items,
    builtInCounts: payload.built_in_counts ?? {},
    presetCounts: payload.preset_counts ?? {},
    quickAccessScopeIds: payload.quick_access_scope_ids ?? [],
  };
}

export async function fetchSmartFolderGraph(
  baseUrl: string,
  presetId: string,
  expandHops = 2,
  options?: WorkingBaseNotesOptions,
): Promise<ScopeGraph> {
  const params = new URLSearchParams({ expand_hops: String(expandHops) });
  applyWorkingBaseParams(params, options);
  const payload = await bridgeClient.get<{ item: ScopeGraph }>(
    baseUrl,
    `/api/presets/${presetId}/graph?${params.toString()}`,
  );
  return payload.item;
}
