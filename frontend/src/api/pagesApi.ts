import { bridgeClient } from "@/lib/bridgeClient";
import type { PageAncestorItem, PageDetail, PageGraph, PageSummary } from "@/types";

export type WorkingBasePageOptions = {
  baseRef?: string;
  recipientActorRef?: string;
  recipientAccountId?: string;
};

function applyWorkingBaseParams(
  params: URLSearchParams,
  options?: WorkingBasePageOptions,
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

function buildPageGraphPath(
  pageId: string,
  expandHops?: number,
  options?: WorkingBasePageOptions,
): string {
  const params = new URLSearchParams();
  if (expandHops !== undefined) {
    params.set("expand_hops", String(expandHops));
  }
  applyWorkingBaseParams(params, options);
  const query = params.toString();
  return query ? `/api/pages/${pageId}/graph?${query}` : `/api/pages/${pageId}/graph`;
}

export async function fetchPages(
  baseUrl: string,
  options?: WorkingBasePageOptions,
): Promise<PageSummary[]> {
  const params = new URLSearchParams();
  applyWorkingBaseParams(params, options);
  const path = params.toString() ? `/api/pages?${params.toString()}` : "/api/pages";
  const payload = await bridgeClient.get<{ items: PageSummary[] }>(baseUrl, path);
  return payload.items;
}

export async function fetchPagesByParent(
  baseUrl: string,
  parentId: "root" | string,
  options?: WorkingBasePageOptions,
): Promise<PageSummary[]> {
  const params = new URLSearchParams({ parent_id: parentId });
  applyWorkingBaseParams(params, options);
  const payload = await bridgeClient.get<{ items: PageSummary[] }>(
    baseUrl,
    `/api/pages?${params.toString()}`,
  );
  return payload.items;
}

export async function fetchPage(
  baseUrl: string,
  pageId: string,
  options?: WorkingBasePageOptions,
): Promise<PageDetail> {
  const params = new URLSearchParams();
  applyWorkingBaseParams(params, options);
  const path = params.toString()
    ? `/api/pages/${pageId}?${params.toString()}`
    : `/api/pages/${pageId}`;
  const payload = await bridgeClient.get<{ item: PageDetail }>(baseUrl, path);
  return payload.item;
}

export async function fetchPageAncestry(
  baseUrl: string,
  pageId: string,
  options?: WorkingBasePageOptions,
): Promise<PageAncestorItem[]> {
  const params = new URLSearchParams();
  applyWorkingBaseParams(params, options);
  const path = params.toString()
    ? `/api/pages/${pageId}/ancestry?${params.toString()}`
    : `/api/pages/${pageId}/ancestry`;
  const payload = await bridgeClient.get<{ items: PageAncestorItem[] }>(baseUrl, path);
  return payload.items;
}

export async function fetchPageGraph(
  baseUrl: string,
  pageId: string,
  expandHops?: number,
  options?: WorkingBasePageOptions,
): Promise<PageGraph> {
  const payload = await bridgeClient.get<{ item: PageGraph }>(
    baseUrl,
    buildPageGraphPath(pageId, expandHops, options),
  );
  return payload.item;
}

export async function createPage(
  baseUrl: string,
  payload: { title: string; content: string; type?: string; parent_id?: string | null },
  options?: WorkingBasePageOptions,
): Promise<PageDetail> {
  const params = new URLSearchParams();
  applyWorkingBaseParams(params, options);
  const path = params.toString() ? `/api/pages?${params.toString()}` : "/api/pages";
  const json = await bridgeClient.post<{ item: PageDetail }>(baseUrl, path, payload);
  return json.item;
}

export async function updatePage(
  baseUrl: string,
  pageId: string,
  payload: {
    title?: string;
    content?: string;
  },
  options?: WorkingBasePageOptions,
): Promise<PageDetail> {
  const params = new URLSearchParams();
  applyWorkingBaseParams(params, options);
  const path = params.toString()
    ? `/api/pages/${pageId}?${params.toString()}`
    : `/api/pages/${pageId}`;
  const json = await bridgeClient.put<{ item: PageDetail }>(baseUrl, path, payload);
  return json.item;
}

export function deletePage(
  baseUrl: string,
  pageId: string,
  options?: WorkingBasePageOptions,
): Promise<{ deleted: true; id: string }> {
  const params = new URLSearchParams();
  applyWorkingBaseParams(params, options);
  const path = params.toString()
    ? `/api/pages/${pageId}?${params.toString()}`
    : `/api/pages/${pageId}`;
  return bridgeClient.delete<{ deleted: true; id: string }>(baseUrl, path);
}
