import { bridgeClient } from "@/lib/bridgeClient";
import type { PageSearchHit, SessionBootstrap } from "@/types";

type SearchPagesOptions = {
  baseRef?: string;
  recipientActorRef?: string;
  recipientAccountId?: string;
};

export async function fetchSessionBootstrap(baseUrl: string): Promise<SessionBootstrap> {
  return bridgeClient.get<SessionBootstrap>(baseUrl, "/api/session/bootstrap");
}

export async function searchPages(
  baseUrl: string,
  query: string,
  options?: SearchPagesOptions,
): Promise<PageSearchHit[]> {
  const params = new URLSearchParams({ q: query });
  if (options?.baseRef) {
    params.set("base_ref", options.baseRef);
  }
  if (options?.recipientActorRef) {
    params.set("recipient_actor_ref", options.recipientActorRef);
  }
  if (options?.recipientAccountId) {
    params.set("recipient_account_id", options.recipientAccountId);
  }
  const payload = await bridgeClient.get<{ items: PageSearchHit[] }>(
    baseUrl,
    `/api/pages/search?${params.toString()}`,
  );
  return payload.items;
}
