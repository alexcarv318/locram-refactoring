import type { PendingAuthorizationRequest } from "@/types";

export function pickNewestPendingAuthorization(
  items: PendingAuthorizationRequest[],
): PendingAuthorizationRequest | null {
  if (items.length === 0) {
    return null;
  }
  return items.reduce((latest, item) =>
    new Date(item.created_at) > new Date(latest.created_at) ? item : latest,
  );
}

export function selectAutoModalPendingAuthorizations(
  items: PendingAuthorizationRequest[],
  seenRequestIds: ReadonlySet<string>,
  modalDismissedRequestIds: ReadonlySet<string>,
): PendingAuthorizationRequest[] {
  return items.filter(
    (item) =>
      !seenRequestIds.has(item.request_id) &&
      !modalDismissedRequestIds.has(item.request_id),
  );
}

export function markPendingAuthorizationsSeen(
  items: PendingAuthorizationRequest[],
  seenRequestIds: Set<string>,
): void {
  for (const item of items) {
    seenRequestIds.add(item.request_id);
  }
}
