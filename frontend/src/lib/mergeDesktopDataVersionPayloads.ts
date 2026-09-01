import { isPageDataChange } from "@/lib/notesCacheRefreshPolicy";
import type {
  DataVersion,
  DesktopDataChange,
  DesktopPageDataChange,
  PageChangeKind,
} from "@/types";

const PAGE_CHANGE_KIND_PRIORITY: Record<PageChangeKind, number> = {
  content: 0,
  metadata: 1,
  topology: 2,
};

function pageChangeKindPriority(changeKind?: PageChangeKind): number {
  if (changeKind === undefined) {
    return PAGE_CHANGE_KIND_PRIORITY.content;
  }
  return PAGE_CHANGE_KIND_PRIORITY[changeKind];
}

function mergePageChangeKinds(
  existing?: PageChangeKind,
  incoming?: PageChangeKind,
): PageChangeKind | undefined {
  if (pageChangeKindPriority(incoming) > pageChangeKindPriority(existing)) {
    return incoming;
  }
  return existing;
}

function mergePageUpdateChangeKinds(
  existing: DesktopPageDataChange,
  incoming: DesktopPageDataChange,
): PageChangeKind | undefined {
  if (existing.operation !== "update" || incoming.operation !== "update") {
    return incoming.version >= existing.version
      ? incoming.change_kind
      : existing.change_kind;
  }
  return mergePageChangeKinds(existing.change_kind, incoming.change_kind);
}

function desktopDataChangeKey(change: DesktopDataChange): string {
  if (change.entity_kind === "page") {
    return `page:${change.page_id}:${change.operation}`;
  }
  return `link:${change.source_id ?? ""}:${change.target_id ?? ""}:${change.link_type ?? ""}:${change.operation}`;
}

function mergeDesktopDataChanges(
  existing: DesktopDataChange,
  incoming: DesktopDataChange,
): DesktopDataChange {
  const version = Math.max(existing.version, incoming.version);
  const occurred_at =
    incoming.version >= existing.version ? incoming.occurred_at : existing.occurred_at;

  if (isPageDataChange(existing) && isPageDataChange(incoming)) {
    return {
      ...incoming,
      version,
      occurred_at,
      change_kind: mergePageUpdateChangeKinds(existing, incoming),
      base_ref: incoming.base_ref ?? existing.base_ref,
      entry_id: incoming.entry_id ?? existing.entry_id,
    };
  }

  if (incoming.version >= existing.version) {
    return { ...incoming, version, occurred_at };
  }
  return { ...existing, version, occurred_at };
}

export function mergeDesktopDataVersionPayloads(payloads: DataVersion[]): DataVersion | null {
  const validPayloads = payloads.filter((payload): payload is DataVersion => payload !== undefined);
  if (validPayloads.length === 0) {
    return null;
  }

  const changeMap = new Map<string, DesktopDataChange>();
  let version = validPayloads[0].version;
  let updated_at = validPayloads[0].updated_at;

  for (const payload of validPayloads) {
    if (payload.version > version) {
      version = payload.version;
      updated_at = payload.updated_at;
    }
    for (const change of payload.changes ?? []) {
      const key = desktopDataChangeKey(change);
      const existing = changeMap.get(key);
      changeMap.set(key, existing ? mergeDesktopDataChanges(existing, change) : change);
    }
  }

  const changes = [...changeMap.values()].sort((left, right) => left.version - right.version);
  if (changes.length === 0) {
    return { version, updated_at };
  }
  return { version, updated_at, changes };
}
