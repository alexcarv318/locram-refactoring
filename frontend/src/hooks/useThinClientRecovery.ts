import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { activateDesktop, recoverAccess } from "@/api";
import { QUERY_KEYS } from "@/hooks/useDesktopBridgeData";
import { useEditorStore } from "@/stores/editorStore";
import type { AccessRecoverResult, SessionBootstrap, ThinClientRecoveryGuidance } from "@/types";
import { openExternalUrl } from "../lib/externalLinks";

export type ThinClientRecoveryBanner = {
  actionLabel?: string;
  actionPending: boolean;
  description: string;
  onAction?: () => Promise<void>;
  title: string;
  tone: "info" | "warning";
};

type UseThinClientRecoveryParams = {
  bootstrap: SessionBootstrap | undefined;
  bridgeBaseUrl: string;
};

type PendingReturnFlow = {
  kind: "reauthenticate" | "re_enroll";
};

type ThinClientRecoveryOverride = {
  guidance: ThinClientRecoveryGuidance;
  sessionState?: string;
};

function buildRecoverySignature(
  bootstrap: SessionBootstrap,
  guidance: ThinClientRecoveryGuidance,
): string {
  return [
    String(bootstrap.data_version.version),
    bootstrap.thin_client_session_state ?? "",
    bootstrap.thin_client_startup_state ?? "",
    guidance.recommended_action,
    guidance.browser_reauth_available ? "browser-reauth" : "no-browser-reauth",
  ].join(":");
}

function recoveryErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Remote session recovery failed.";
}

function sessionStateFromRecoveryResult(result: AccessRecoverResult): string | undefined {
  if (result.status.state === "connecting" || result.status.state === "reconnecting") {
    return "establishing";
  }
  if (result.status.state === "live") {
    return "healthy";
  }
  return undefined;
}

function applyRecoveryResultToBootstrap(
  current: SessionBootstrap | undefined,
  result: AccessRecoverResult,
): SessionBootstrap | undefined {
  if (!current) {
    return current;
  }
  const nextSessionState = sessionStateFromRecoveryResult(result);
  return {
    ...current,
    thin_client_recovery: result.recovery,
    thin_client_session_state: nextSessionState ?? current.thin_client_session_state,
    thin_client_startup_state: nextSessionState ?? current.thin_client_startup_state,
  };
}

export function useThinClientRecovery({
  bootstrap,
  bridgeBaseUrl,
}: UseThinClientRecoveryParams): ThinClientRecoveryBanner | null {
  const queryClient = useQueryClient();
  const openSettings = useEditorStore((state) => state.openSettings);
  const [actionError, setActionError] = useState("");
  const [pendingReturnFlow, setPendingReturnFlow] = useState<PendingReturnFlow | null>(null);
  const [recoveryOverride, setRecoveryOverride] = useState<ThinClientRecoveryOverride | null>(null);
  const lastAutoRecoverySignatureRef = useRef<string | null>(null);
  const returnCheckInFlightRef = useRef(false);

  const recoverMutation = useMutation({
    mutationFn: () => recoverAccess(bridgeBaseUrl),
    onSuccess: async (result) => {
      setActionError("");
      setRecoveryOverride({
        guidance: result.recovery,
        sessionState: sessionStateFromRecoveryResult(result),
      });
      queryClient.setQueryData<SessionBootstrap>(
        QUERY_KEYS.sessionBootstrap(bridgeBaseUrl),
        (current) => applyRecoveryResultToBootstrap(current, result),
      );
    },
  });

  const activationMutation = useMutation({
    mutationFn: () =>
      activateDesktop(bridgeBaseUrl, {
        machine_label: "",
      }),
  });

  const effectiveBootstrap = useMemo(() => {
    if (!bootstrap) {
      return bootstrap;
    }
    if (!recoveryOverride) {
      return bootstrap;
    }
    return {
      ...bootstrap,
      thin_client_recovery: recoveryOverride.guidance,
      thin_client_session_state:
        recoveryOverride.sessionState ?? bootstrap.thin_client_session_state,
      thin_client_startup_state:
        recoveryOverride.sessionState ?? bootstrap.thin_client_startup_state,
    };
  }, [bootstrap, recoveryOverride]);

  const guidance = effectiveBootstrap?.thin_client_recovery;
  const autoRecoverySignature =
    effectiveBootstrap && guidance ? buildRecoverySignature(effectiveBootstrap, guidance) : null;
  const { isPending, mutateAsync } = recoverMutation;
  const isActivationPending = activationMutation.isPending;

  const checkRecoveryAfterReturn = useCallback(async () => {
    if (!bridgeBaseUrl || isPending || returnCheckInFlightRef.current) {
      return;
    }
    returnCheckInFlightRef.current = true;
    try {
      setActionError("");
      await mutateAsync();
      setPendingReturnFlow(null);
    } catch (error) {
      setActionError(recoveryErrorMessage(error));
    } finally {
      returnCheckInFlightRef.current = false;
    }
  }, [bridgeBaseUrl, isPending, mutateAsync, queryClient]);

  useEffect(() => {
    if (!bridgeBaseUrl || !effectiveBootstrap || !guidance) {
      return;
    }
    if (effectiveBootstrap.desktop_operating_mode !== "thin_client") {
      return;
    }
    if (guidance.recommended_action !== "reconnect") {
      return;
    }
    if (isPending) {
      return;
    }
    if (lastAutoRecoverySignatureRef.current === autoRecoverySignature) {
      return;
    }
    lastAutoRecoverySignatureRef.current = autoRecoverySignature;
    void mutateAsync().catch((error) => {
      lastAutoRecoverySignatureRef.current = null;
      setActionError(recoveryErrorMessage(error));
    });
  }, [
    autoRecoverySignature,
    effectiveBootstrap,
    bridgeBaseUrl,
    guidance,
    isPending,
    mutateAsync,
  ]);

  useEffect(() => {
    if (!pendingReturnFlow) {
      return;
    }

    const handleReturn = () => {
      if (document.visibilityState === "hidden") {
        return;
      }
      void checkRecoveryAfterReturn();
    };

    window.addEventListener("focus", handleReturn);
    document.addEventListener("visibilitychange", handleReturn);
    return () => {
      window.removeEventListener("focus", handleReturn);
      document.removeEventListener("visibilitychange", handleReturn);
    };
  }, [checkRecoveryAfterReturn, pendingReturnFlow]);

  return useMemo(() => {
    if (actionError) {
      return {
        actionLabel: "Open network settings",
        actionPending: false,
        description: actionError,
        onAction: async () => {
          openSettings({ tab: "mcp" });
        },
        title: "Thin-client recovery failed",
        tone: "warning" as const,
      };
    }
    if (
      !effectiveBootstrap ||
      effectiveBootstrap.desktop_operating_mode !== "thin_client" ||
      !guidance
    ) {
      return null;
    }
    if (pendingReturnFlow?.kind === "reauthenticate") {
      return {
        actionLabel: "Check status",
        actionPending: isPending || isActivationPending,
        description: "Finish sign-in in the browser, then return to Locram to check the remote session.",
        onAction: checkRecoveryAfterReturn,
        title: "Waiting for browser sign-in",
        tone: "info" as const,
      };
    }
    if (pendingReturnFlow?.kind === "re_enroll") {
      return {
        actionLabel: "Check status",
        actionPending: isPending || isActivationPending,
        description: "Complete enrollment in Network settings, then check the remote session.",
        onAction: checkRecoveryAfterReturn,
        title: "Waiting for device enrollment",
        tone: "info" as const,
      };
    }
    if (guidance.recommended_action === "reauthenticate") {
      return {
        actionLabel: "Continue in browser",
        actionPending: isPending || isActivationPending,
        description: "Sign in again to restore this device session.",
        onAction: async () => {
          try {
            const activationStatus = await activationMutation.mutateAsync();
            const approvalUrl = activationStatus.lastAttempt?.approvalUrl ?? "";
            if (approvalUrl) {
              void openExternalUrl(approvalUrl);
              setPendingReturnFlow({ kind: "reauthenticate" });
              return;
            }
            openSettings({ tab: "mcp" });
            setPendingReturnFlow({ kind: "reauthenticate" });
          } catch (error) {
            setActionError(recoveryErrorMessage(error));
          }
        },
        title: "Remote session expired",
        tone: "warning" as const,
      };
    }
    if (guidance.recommended_action === "re_enroll") {
      return {
        actionLabel: "Open network settings",
        actionPending: isPending || isActivationPending,
        description: guidance.requires_redemption_code
          ? "This device needs a fresh enrollment before it can reconnect."
          : "This device needs to be enrolled again before it can reconnect.",
        onAction: async () => {
          try {
            await mutateAsync();
          } catch (error) {
            setActionError(recoveryErrorMessage(error));
          }
          openSettings({ tab: "mcp" });
          setPendingReturnFlow({ kind: "re_enroll" });
        },
        title: "Remote session is no longer valid",
        tone: "warning" as const,
      };
    }
    if (
      guidance.recommended_action === "wait" &&
      effectiveBootstrap.thin_client_startup_state === "establishing"
    ) {
      return {
        actionPending: isPending,
        description: "Locram is reconnecting to the remote session in the background.",
        title: "Reconnecting remote session",
        tone: "info" as const,
      };
    }
    return null;
  }, [
    actionError,
    effectiveBootstrap,
    checkRecoveryAfterReturn,
    guidance,
    isPending,
    isActivationPending,
    mutateAsync,
    openSettings,
    pendingReturnFlow,
  ]);
}
