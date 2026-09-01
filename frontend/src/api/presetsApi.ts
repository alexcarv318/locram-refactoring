import { bridgeClient } from "@/lib/bridgeClient";
import type { FilterPreset, GraphFiltersState } from "@/lib/graph/filter-state/index";

export async function fetchPresets(baseUrl: string): Promise<FilterPreset[]> {
  const payload = await bridgeClient.get<{ items: FilterPreset[] }>(baseUrl, "/api/presets");
  return payload.items;
}

export async function createPreset(
  baseUrl: string,
  payload: { name: string; filter: GraphFiltersState },
): Promise<FilterPreset> {
  const json = await bridgeClient.post<{ item: FilterPreset }>(baseUrl, "/api/presets", payload);
  return json.item;
}

export async function updatePreset(
  baseUrl: string,
  presetId: string,
  payload: { name?: string; filter?: GraphFiltersState },
): Promise<FilterPreset> {
  const json = await bridgeClient.put<{ item: FilterPreset }>(
    baseUrl,
    `/api/presets/${presetId}`,
    payload,
  );
  return json.item;
}

export function deletePreset(
  baseUrl: string,
  presetId: string,
): Promise<{ deleted: true; id: string }> {
  return bridgeClient.delete<{ deleted: true; id: string }>(
    baseUrl,
    `/api/presets/${presetId}`,
  );
}
