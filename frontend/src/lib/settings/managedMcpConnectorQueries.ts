import type { AccessSummary, DesktopActivationStatus } from "@/types";
import { deriveDesktopEntitlementView } from "@/lib/desktopEntitlements";

export function pendingAuthorizationsQueryKey(baseUrl: string) {
  return ["pending-authorizations", baseUrl] as const;
}

export function connectedOAuthSessionsQueryKey(baseUrl: string) {
  return ["connected-oauth-sessions", baseUrl] as const;
}

export function shouldPollManagedMcpConnectorBridge(
  bridgeBaseUrl: string,
  accessSummary: AccessSummary | undefined,
  desktopActivation: DesktopActivationStatus | undefined,
  desktopEdition: { edition?: string } | undefined,
): boolean {
  if (bridgeBaseUrl.length === 0) {
    return false;
  }
  const edition = desktopActivation?.edition ?? desktopEdition?.edition;
  const entitlement = deriveDesktopEntitlementView(
    desktopActivation,
    accessSummary,
  );
  return (
    edition === "pro" &&
    accessSummary?.status?.credential_material_present === true &&
    entitlement.leaseTone === "usable" &&
    desktopActivation?.usableCapabilities.managedPublicMcp === true
  );
}
