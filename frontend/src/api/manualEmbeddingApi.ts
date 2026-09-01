import { bridgeClient } from "@/lib/bridgeClient";
import type { ManualEmbedOutcome } from "@/types";


export async function runManualEmbed(
  baseUrl: string,
  payload: { baseId?: string; baseRef?: string; force?: boolean },
): Promise<ManualEmbedOutcome> {
  const query = payload.baseRef
    ? `?base_ref=${encodeURIComponent(payload.baseRef)}`
    : "";
  const response = await bridgeClient.post<{ item: ManualEmbedOutcome }>(
    baseUrl,
    `/api/desktop/embeddings/run${query}`,
    {
      base_id: payload.baseId,
      base_ref: payload.baseRef,
      force: payload.force === true ? true : undefined,
    },
  );
  return response.item;
}
