import { bridgeClient } from "@/lib/bridgeClient";
import type {
  BaseShareGrantPermission,
  BaseShareGrantRecord,
  BaseShareInvite,
  OwnerBaseShareManagementItem,
  RecipientBaseShareViewItem,
} from "@/types";

export async function fetchOwnerBaseShareManagement(
  baseUrl: string,
  query: { ownerActorRef: string; evaluationAt?: string; baseId?: string; entryId?: string },
): Promise<OwnerBaseShareManagementItem[]> {
  const params = new URLSearchParams({ owner_actor_ref: query.ownerActorRef });
  if (query.evaluationAt) {
    params.set("evaluation_at", query.evaluationAt);
  }
  if (query.baseId) {
    params.set("base_id", query.baseId);
  }
  if (query.entryId) {
    params.set("entry_id", query.entryId);
  }
  const json = await bridgeClient.get<{ items: OwnerBaseShareManagementItem[] }>(
    baseUrl,
    `/api/base-share-grants/owner-view?${params.toString()}`,
  );
  return json.items;
}

export async function fetchRecipientBaseShareView(
  baseUrl: string,
  query: { recipientActorRef?: string; recipientAccountId?: string; includeInactive?: boolean; evaluationAt?: string },
): Promise<RecipientBaseShareViewItem[]> {
  const params = new URLSearchParams();
  if (query.recipientActorRef) {
    params.set("recipient_actor_ref", query.recipientActorRef);
  }
  if (query.recipientAccountId) {
    params.set("recipient_account_id", query.recipientAccountId);
  }
  if (query.includeInactive) {
    params.set("include_inactive", "true");
  }
  if (query.evaluationAt) {
    params.set("evaluation_at", query.evaluationAt);
  }
  const json = await bridgeClient.get<{ items: RecipientBaseShareViewItem[] }>(
    baseUrl,
    `/api/base-share-grants/recipient-view?${params.toString()}`,
  );
  return json.items.map((item) => ({
    ...item,
    visible_in_mcp: item.visible_in_mcp !== false,
  }));
}

export async function setRecipientBaseShareMcpVisibility(
  baseUrl: string,
  grantId: string,
  visibleInMcp: boolean,
): Promise<RecipientBaseShareViewItem> {
  const json = await bridgeClient.post<{ item: RecipientBaseShareViewItem }>(
    baseUrl,
    `/api/base-share-grants/${grantId}/mcp-visibility`,
    { visible_in_mcp: visibleInMcp },
  );
  return {
    ...json.item,
    visible_in_mcp: json.item.visible_in_mcp !== false,
  };
}

export async function renameRecipientBaseShare(
  baseUrl: string,
  grantId: string,
  shareBaseTitle: string,
): Promise<RecipientBaseShareViewItem> {
  const json = await bridgeClient.put<{ item: RecipientBaseShareViewItem }>(
    baseUrl,
    `/api/base-share-grants/${grantId}/rename`,
    { share_base_title: shareBaseTitle },
  );
  return {
    ...json.item,
    visible_in_mcp: json.item.visible_in_mcp !== false,
  };
}

export async function removeRecipientBaseShare(
  baseUrl: string,
  grantId: string,
): Promise<{ removed: boolean; grant_id: string }> {
  return bridgeClient.post<{ removed: boolean; grant_id: string }>(
    baseUrl,
    `/api/base-share-grants/${grantId}/remove`,
  );
}

export async function backupRecipientBaseShare(
  baseUrl: string,
  grantId: string,
  trigger = "manual",
) {
  const json = await bridgeClient.post<{ item: { filename: string } }>(
    baseUrl,
    `/api/base-share-grants/${grantId}/backup`,
    { trigger },
  );
  return json.item;
}

export async function createBaseShareGrant(
  baseUrl: string,
  payload: {
    owner_actor_ref: string;
    recipient_actor_ref?: string;
    recipient_account_id?: string;
    base_id?: string;
    entry_id?: string;
    permission: BaseShareGrantPermission;
    expires_at?: string;
  },
): Promise<BaseShareGrantRecord> {
  const json = await bridgeClient.post<{ item: BaseShareGrantRecord }>(
    baseUrl,
    "/api/base-share-grants",
    payload,
  );
  return json.item;
}

export async function revokeBaseShareGrant(
  baseUrl: string,
  grantId: string,
  payload?: { revocation_reason?: string },
): Promise<BaseShareGrantRecord> {
  const json = await bridgeClient.post<{ item: BaseShareGrantRecord }>(
    baseUrl,
    `/api/base-share-grants/${grantId}/revoke`,
    payload,
  );
  return json.item;
}

export async function deleteBaseShareGrant(
  baseUrl: string,
  grantId: string,
): Promise<{ removed: boolean; grant_id: string }> {
  return bridgeClient.post<{ removed: boolean; grant_id: string }>(
    baseUrl,
    `/api/base-share-grants/${grantId}/delete`,
  );
}

export async function fetchBaseShareInvite(
  baseUrl: string,
  grantId: string,
  query?: { ownerDisplayName?: string; message?: string },
): Promise<BaseShareInvite> {
  const params = new URLSearchParams();
  if (query?.ownerDisplayName) {
    params.set("owner_display_name", query.ownerDisplayName);
  }
  if (query?.message) {
    params.set("message", query.message);
  }
  const querySuffix = params.toString() ? `?${params.toString()}` : "";
  const json = await bridgeClient.get<{ item: BaseShareInvite }>(
    baseUrl,
    `/api/base-share-grants/${grantId}/invite${querySuffix}`,
  );
  return json.item;
}
