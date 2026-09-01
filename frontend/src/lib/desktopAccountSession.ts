import type {
  AccessSummary,
  DesktopActivationStatus,
} from "@/types";

function hasLexragAccountSession(accessSummary: AccessSummary | undefined): boolean {
  const accountIdentity = accessSummary?.accountIdentity;
  return Boolean(accountIdentity?.email ?? accountIdentity?.display_name);
}

function hasBrokerBoundAccountIdentity(
  accessSummary: AccessSummary | undefined,
): boolean {
  return Boolean(accessSummary?.accountIdentity?.account_id);
}

export function resolveHasSignedInAccount(
  activation: DesktopActivationStatus | undefined,
  accessSummary: AccessSummary | undefined,
): boolean {
  const status = accessSummary?.status;
  const lastAttempt = activation?.lastAttempt;

  if (activation?.state === "signed_out") {
    return false;
  }
  if (lastAttempt?.state === "pending") {
    if (lastAttempt.errorCode === "transfer_required") {
      return hasLexragAccountSession(accessSummary);
    }
    return false;
  }
  if (activation?.state === "active") {
    return (
      hasLexragAccountSession(accessSummary) ||
      hasBrokerBoundAccountIdentity(accessSummary)
    );
  }
  if (activation?.state === "not_activated") {
    return hasLexragAccountSession(accessSummary);
  }
  if (activation?.state === "free") {
    return hasLexragAccountSession(accessSummary);
  }
  if (activation?.state === "reauth_required") {
    return hasLexragAccountSession(accessSummary);
  }
  const hasLiveSession =
    status?.enrollment_material_present === true &&
    status?.credential_material_present === true;
  if (hasLiveSession) {
    return hasLexragAccountSession(accessSummary);
  }
  if (lastAttempt?.state === "succeeded") {
    return hasLexragAccountSession(accessSummary);
  }
  return false;
}

export function shouldRequireAccountSignIn(
  activation: DesktopActivationStatus | undefined,
  accessSummary: AccessSummary | undefined,
  queriesReady: boolean,
): boolean {
  if (!queriesReady) {
    return false;
  }
  return !resolveHasSignedInAccount(activation, accessSummary);
}

export function needsProDesktopActivation(
  activation: DesktopActivationStatus | undefined,
  accessSummary: AccessSummary | undefined,
  productSupportsPro: boolean,
  hasPaidSubscription: boolean,
): boolean {
  if (!productSupportsPro || !hasPaidSubscription) {
    return false;
  }
  if (!resolveHasSignedInAccount(activation, accessSummary)) {
    return false;
  }
  if (activation?.state === "active") {
    return false;
  }
  if (activation?.state === "signed_out") {
    return false;
  }
  return true;
}
