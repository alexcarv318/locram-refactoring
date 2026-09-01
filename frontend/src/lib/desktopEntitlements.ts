import type {
  AccessSummary,
  DesktopActivationStatus,
  DesktopEntitlementLeaseStatus,
  DesktopUsableCapabilities,
} from "@/types";

export type DesktopEntitlementView = {
  lease: DesktopEntitlementLeaseStatus | null;
  leaseStateLabel: string;
  leaseMessage: string;
  leaseGuidance: string | null;
  leaseTone: "usable" | "blocked" | "pending";
  usableCapabilities: DesktopUsableCapabilities;
  networkFeaturesUsable: boolean;
  networkConveniencesDisabled: boolean;
};

const EMPTY_USABLE_CAPABILITIES: DesktopUsableCapabilities = {
  managedPublicMcp: false,
  localMcpToolVisibility: false,
  browserAccountSetup: false,
  shareBase: false,
  multiBase: false,
  managedUpdates: false,
  docsGglUpdates: false,
  agentBaseAdministration: false,
};

export function deriveDesktopEntitlementView(
  activation: DesktopActivationStatus | undefined,
  accessSummary: AccessSummary | undefined,
): DesktopEntitlementView {
  const lease = activation?.entitlementLease ?? null;
  const usableCapabilities =
    activation?.usableCapabilities ?? EMPTY_USABLE_CAPABILITIES;
  const networkFeaturesUsable = activation?.networkFeaturesUsable === true;
  const brokerEnrollmentAvailable =
    activation?.brokerEnrollmentAvailable === true;
  const enrollmentMaterialPresent =
    accessSummary?.status.enrollment_material_present === true;
  const networkConveniencesDisabled =
    brokerEnrollmentAvailable &&
    enrollmentMaterialPresent &&
    !networkFeaturesUsable;
  return {
    lease,
    leaseStateLabel: lease?.state.split("_").join(" ") ?? "unknown",
    leaseMessage:
      lease?.reason ??
      (enrollmentMaterialPresent
        ? "Entitlement lease has not been received yet."
        : "Entitlement lease is created after activation."),
    leaseGuidance: entitlementLeaseGuidance(lease, activation),
    leaseTone:
      lease?.state === "active" || lease?.state === "grace"
        ? "usable"
        : networkConveniencesDisabled
          ? "blocked"
          : "pending",
    usableCapabilities,
    networkFeaturesUsable,
    networkConveniencesDisabled,
  };
}

export function entitlementLeaseGuidance(
  lease: DesktopEntitlementLeaseStatus | null,
  activation?: DesktopActivationStatus,
): string | null {
  switch (lease?.state) {
    case "active":
      return null;
    case "expired":
      return "This device entitlement expired. Sign in again to refresh activation. Local notes remain readable while managed network features are unavailable.";
    case "revoked":
      if (activation?.lastAttempt?.errorCode === "activation_transferred") {
        return "Pro activation was transferred to another device. Local notes remain readable here, but managed network features are disabled until you reactivate this device.";
      }
      return "This entitlement was revoked by the broker. Sign in again or contact support before reconnecting managed network features.";
    case "invalid":
      return "The saved entitlement lease could not be verified. Sign in again to replace it with a fresh signed lease.";
    case "missing":
      return "Activation has not produced a signed entitlement lease yet. Sign in again to finish device activation before using managed network features.";
    case "grace":
      return "Renew before grace ends to avoid managed network interruption.";
    default:
      return null;
  }
}
