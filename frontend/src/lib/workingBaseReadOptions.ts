import { getManagedBrowseSourceAlias } from "@/lib/sources/sourceRegistry";
import type { WorkingBasePageOptions } from "@/api/pagesApi";
import type { ActiveSource } from "@/types/source";

export function workingBaseReadOptions(
  activeSource: ActiveSource | null | undefined,
): WorkingBasePageOptions | undefined {
  if (!activeSource) {
    return undefined;
  }
  if (activeSource.kind === "local-base") {
    return { baseRef: `local:${activeSource.entryId}` };
  }
  if (activeSource.kind === "managed-base") {
    return { baseRef: activeSource.baseRef };
  }
  const managedAlias = getManagedBrowseSourceAlias(activeSource);
  if (managedAlias !== null) {
    return { baseRef: managedAlias.baseRef };
  }
  if (activeSource.kind === "shared-base") {
    return {
      baseRef: `shared:${activeSource.grantId}`,
      recipientActorRef: activeSource.recipientActorRef,
      recipientAccountId: activeSource.recipientAccountId ?? undefined,
    };
  }
  return undefined;
}

export function workingBaseMutationOptions(
  activeSource: ActiveSource | null | undefined,
  activeBaseEntryId: string | null | undefined,
): WorkingBasePageOptions {
  const sourceOptions = workingBaseReadOptions(activeSource);
  if (sourceOptions?.baseRef) {
    return sourceOptions;
  }
  if (!activeSource && activeBaseEntryId) {
    return { baseRef: `local:${activeBaseEntryId}` };
  }
  throw new Error("The current writable base could not be resolved.");
}
