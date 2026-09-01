import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activateDesktop,
  fetchAccessSummary,
  fetchDesktopActivation,
  resolveBridgeBaseUrl,
} from "@/api";
import { DESKTOP_BRIDGE_QUERY_KEYS } from "@/hooks/desktopBridgeQueryKeys";
import { shouldRequireAccountSignIn } from "@/lib/desktopAccountSession";
import { openExternalUrl } from "@/lib/externalLinks";
import {
  activationGainedManagedPublicMcpCapability,
  logActivationAutoRepairFailure,
  repairDesktopRuntimeServices,
  runtimeDiagnosticsAvailable,
} from "@/lib/runtimeDiagnostics";
import { setTelemetryConsentGranted } from "@/lib/telemetry";
import type { DesktopActivationStatus } from "@/types";

type ActivationRequestSource = "account_gate" | "settings_panel" | "controller_poll";

type ActivationRequest = {
  machineLabel?: string;
  source: ActivationRequestSource;
};

type ActivationRequestResult = {
  activationStatus: DesktopActivationStatus;
  autoRepairFailed: boolean;
};

type DesktopActivationControllerProviderProps = {
  children: ReactNode;
  bridgeBaseUrlOverride?: string;
};

export type ActivationAutoPollWindow = {
  sessionKey: string;
  deadlineMs: number;
  expired: boolean;
};

export function accessQueryKey(baseUrl: string) {
  return ["access-summary", baseUrl] as const;
}

const BRIDGE_STARTUP_RETRY_COUNT = 30;
const ACTIVATION_AUTO_POLL_INTERVAL_MS = 2_000;
const ACTIVATION_AUTO_POLL_MAX_MS = 5 * 60_000;

function bridgeStartupRetryDelay(attempt: number) {
  return Math.min(1_000 * 2 ** attempt, 5_000);
}

export function shouldOpenApprovalUrl(
  previousActivation: DesktopActivationStatus | undefined,
  nextActivation: DesktopActivationStatus,
) {
  const nextAttempt = nextActivation.lastAttempt;
  if (!nextAttempt?.approvalUrl) {
    return false;
  }
  const previousAttempt = previousActivation?.lastAttempt;
  if (!previousAttempt?.approvalUrl) {
    return true;
  }
  if (nextAttempt.activationSessionId !== previousAttempt.activationSessionId) {
    return true;
  }
  if (nextAttempt.transferSessionId !== previousAttempt.transferSessionId) {
    return true;
  }
  if (
    previousAttempt.errorCode !== "transfer_required" &&
    nextAttempt.errorCode === "transfer_required" &&
    nextAttempt.approvalUrl !== previousAttempt.approvalUrl
  ) {
    return true;
  }
  return false;
}

function parseTimestampMs(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function pendingActivationSessionKey(
  activation: DesktopActivationStatus | undefined,
): string | null {
  const attempt = activation?.lastAttempt;
  if (!attempt || attempt.state !== "pending" || !attempt.approvalUrl) {
    return null;
  }
  return [attempt.activationSessionId ?? "activation:none", attempt.transferSessionId ?? "transfer:none"].join("|");
}

export function nextActivationAutoPollWindow(
  currentWindow: ActivationAutoPollWindow | null,
  activation: DesktopActivationStatus | undefined,
  nowMs: number,
): ActivationAutoPollWindow | null {
  const sessionKey = pendingActivationSessionKey(activation);
  if (!sessionKey) {
    return null;
  }
  const expiresAtMs = parseTimestampMs(activation?.lastAttempt?.expiresAt);
  const nextDeadlineMs =
    currentWindow?.sessionKey === sessionKey
      ? Math.min(currentWindow.deadlineMs, expiresAtMs ?? Number.POSITIVE_INFINITY)
      : Math.min(expiresAtMs ?? Number.POSITIVE_INFINITY, nowMs + ACTIVATION_AUTO_POLL_MAX_MS);
  return {
    sessionKey,
    deadlineMs: nextDeadlineMs,
    expired:
      (currentWindow?.sessionKey === sessionKey && currentWindow.expired) ||
      nextDeadlineMs <= nowMs,
  };
}

function useProvideDesktopActivationController(bridgeBaseUrlOverride?: string) {
  const queryClient = useQueryClient();
  const activationRequestPromiseRef = useRef<Promise<ActivationRequestResult> | null>(null);
  const [isAwaitingBrowserSignIn, setIsAwaitingBrowserSignIn] = useState(false);
  const [activationAutoPollWindow, setActivationAutoPollWindow] =
    useState<ActivationAutoPollWindow | null>(null);
  const bridgeBaseUrlQuery = useQuery({
    queryKey: DESKTOP_BRIDGE_QUERY_KEYS.bridgeBaseUrl,
    queryFn: resolveBridgeBaseUrl,
    retry: 0,
    enabled: bridgeBaseUrlOverride === undefined,
    initialData: bridgeBaseUrlOverride,
    staleTime: bridgeBaseUrlOverride ? Infinity : 0,
  });
  const bridgeBaseUrl = bridgeBaseUrlOverride ?? bridgeBaseUrlQuery.data ?? "";
  const accessSummaryQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: accessQueryKey(bridgeBaseUrl),
    queryFn: () => fetchAccessSummary(bridgeBaseUrl),
    retry: BRIDGE_STARTUP_RETRY_COUNT,
    retryDelay: bridgeStartupRetryDelay,
    refetchInterval: 30_000,
  });
  const desktopActivationQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-activation", bridgeBaseUrl],
    queryFn: () => fetchDesktopActivation(bridgeBaseUrl),
    retry: BRIDGE_STARTUP_RETRY_COUNT,
    retryDelay: bridgeStartupRetryDelay,
    staleTime: 10_000,
  });
  const queriesReady =
    bridgeBaseUrl.length > 0 &&
    accessSummaryQuery.isSuccess &&
    desktopActivationQuery.isSuccess;
  const hasResolutionFailed =
    (bridgeBaseUrlOverride === undefined && bridgeBaseUrlQuery.isError) ||
    accessSummaryQuery.isError ||
    desktopActivationQuery.isError;
  const retryResolution = () => {
    if (bridgeBaseUrlOverride === undefined) {
      void bridgeBaseUrlQuery.refetch();
    }
    void accessSummaryQuery.refetch();
    void desktopActivationQuery.refetch();
  };
  const requiresSignIn = shouldRequireAccountSignIn(
    desktopActivationQuery.data,
    accessSummaryQuery.data,
    queriesReady,
  );
  const approvalUrl = desktopActivationQuery.data?.lastAttempt?.approvalUrl ?? "";
  const isBrowserActivationPending =
    desktopActivationQuery.data?.lastAttempt?.state === "pending" &&
    approvalUrl.length > 0;
  const isTransferActivationPending =
    isBrowserActivationPending &&
    desktopActivationQuery.data?.lastAttempt?.errorCode === "transfer_required";
  const currentPendingActivationSessionKey = pendingActivationSessionKey(
    desktopActivationQuery.data,
  );

  useEffect(() => {
    const attemptState = desktopActivationQuery.data?.lastAttempt?.state;
    if (attemptState === "failed_retryable" || attemptState === "failed_terminal") {
      setIsAwaitingBrowserSignIn(false);
    }
  }, [desktopActivationQuery.data?.lastAttempt?.state]);

  useEffect(() => {
    if (!requiresSignIn) {
      setIsAwaitingBrowserSignIn(false);
    }
  }, [requiresSignIn]);

  useEffect(() => {
    const granted =
      accessSummaryQuery.data?.accountIdentity?.analyticsConsent?.granted ?? true;
    setTelemetryConsentGranted(granted);
  }, [accessSummaryQuery.data?.accountIdentity?.analyticsConsent?.granted]);

  useEffect(() => {
    setActivationAutoPollWindow((current) =>
      nextActivationAutoPollWindow(current, desktopActivationQuery.data, Date.now()),
    );
  }, [currentPendingActivationSessionKey, desktopActivationQuery.data?.lastAttempt?.expiresAt]);

  useEffect(() => {
    if (!activationAutoPollWindow || activationAutoPollWindow.expired) {
      return;
    }

    const remainingMs = activationAutoPollWindow.deadlineMs - Date.now();
    if (remainingMs <= 0) {
      setActivationAutoPollWindow((current) =>
        current && current.sessionKey === activationAutoPollWindow.sessionKey
          ? { ...current, expired: true }
          : current,
      );
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActivationAutoPollWindow((current) =>
        current && current.sessionKey === activationAutoPollWindow.sessionKey
          ? { ...current, expired: true }
          : current,
      );
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [activationAutoPollWindow]);

  const activationMutation = useMutation({
    mutationFn: async ({
      machineLabel,
      source,
    }: ActivationRequest): Promise<ActivationRequestResult> => {
      if (!bridgeBaseUrl) {
        throw new Error("Desktop bridge is not ready yet.");
      }
      const trimmedMachineLabel = machineLabel?.trim() ?? "";
      const payload =
        source === "settings_panel"
          ? { machine_label: trimmedMachineLabel }
          : trimmedMachineLabel
            ? { machine_label: trimmedMachineLabel }
            : {};
      const activationStatus = await activateDesktop(
        bridgeBaseUrl,
        payload,
      );
      const previousActivation = queryClient.getQueryData<DesktopActivationStatus>([
        "desktop-activation",
        bridgeBaseUrl,
      ]);
      const approvalUrlToOpen = activationStatus.lastAttempt?.approvalUrl ?? "";
      const shouldReopenApprovalUrl = shouldOpenApprovalUrl(
        previousActivation,
        activationStatus,
      );
      queryClient.setQueryData(["desktop-activation", bridgeBaseUrl], activationStatus);
      if (approvalUrlToOpen.length === 0) {
        setIsAwaitingBrowserSignIn(false);
      }
      let autoRepairFailed = false;
      if (
        runtimeDiagnosticsAvailable() &&
        activationGainedManagedPublicMcpCapability(previousActivation, activationStatus)
      ) {
        try {
          await repairDesktopRuntimeServices();
          await queryClient.invalidateQueries({
            queryKey: ["desktop-runtime-diagnostics"],
          });
        } catch (error) {
          autoRepairFailed = true;
          logActivationAutoRepairFailure(
            source === "settings_panel" ? "settings_panel" : "account_gate",
            error,
          );
          await queryClient.invalidateQueries({
            queryKey: ["desktop-runtime-diagnostics"],
          });
        }
      }
      await queryClient.invalidateQueries({
        queryKey: accessQueryKey(bridgeBaseUrl),
      });
      const shouldOpenForUser =
        source !== "controller_poll" && approvalUrlToOpen.length > 0;
      if (shouldOpenForUser || shouldReopenApprovalUrl) {
        const opened = await openExternalUrl(approvalUrlToOpen);
        if (!opened) {
          setIsAwaitingBrowserSignIn(false);
          throw new Error(
            "Could not open the sign-in page. Allow popups for this site and try again.",
          );
        }
      }
      return { activationStatus, autoRepairFailed };
    },
    onError: (_error, request) => {
      if (request.source === "account_gate") {
        setIsAwaitingBrowserSignIn(false);
      }
    },
  });

  const requestActivation = useCallback(
    (request: ActivationRequest) => {
      const inFlightRequest = activationRequestPromiseRef.current;
      if (inFlightRequest) {
        return inFlightRequest;
      }

      const requestPromise = activationMutation.mutateAsync(request).finally(() => {
        if (activationRequestPromiseRef.current === requestPromise) {
          activationRequestPromiseRef.current = null;
        }
      });
      activationRequestPromiseRef.current = requestPromise;
      return requestPromise;
    },
    [activationMutation],
  );

  const activationAutoPollAllowed =
    isBrowserActivationPending && activationAutoPollWindow?.expired !== true;

  useEffect(() => {
    if (!activationAutoPollAllowed || !bridgeBaseUrl) {
      return;
    }
    const pollId = window.setInterval(() => {
      if (activationRequestPromiseRef.current) {
        return;
      }
      void requestActivation({ source: "controller_poll" }).catch(() => undefined);
    }, ACTIVATION_AUTO_POLL_INTERVAL_MS);
    return () => window.clearInterval(pollId);
  }, [activationAutoPollAllowed, bridgeBaseUrl, requestActivation]);

  useEffect(() => {
    if (!activationAutoPollAllowed) {
      return;
    }
    const resumeActivation = () => {
      if (document.visibilityState === "hidden" || activationRequestPromiseRef.current) {
        return;
      }
      void requestActivation({ source: "controller_poll" }).catch(() => undefined);
    };

    window.addEventListener("focus", resumeActivation);
    document.addEventListener("visibilitychange", resumeActivation);
    return () => {
      window.removeEventListener("focus", resumeActivation);
      document.removeEventListener("visibilitychange", resumeActivation);
    };
  }, [activationAutoPollAllowed, requestActivation]);

  const beginSignIn = () => {
    setIsAwaitingBrowserSignIn(true);
    void requestActivation({ source: "account_gate" }).catch(() => undefined);
  };

  const cancelBrowserSignInWait = () => {
    setIsAwaitingBrowserSignIn(false);
  };

  return {
    accessSummaryQuery,
    activationMutation,
    approvalUrl,
    beginSignIn,
    cancelBrowserSignInWait,
    bridgeBaseUrl,
    bridgeBaseUrlQuery,
    desktopActivationQuery,
    hasResolutionFailed,
    isAwaitingBrowserSignIn,
    isBrowserActivationPending,
    isResolving: bridgeBaseUrl.length === 0 || bridgeBaseUrlQuery.isPending || !queriesReady,
    isTransferActivationPending,
    requestActivation,
    requiresSignIn,
    retryResolution,
  };
}

type DesktopActivationController = ReturnType<typeof useProvideDesktopActivationController>;

const DesktopActivationControllerContext = createContext<DesktopActivationController | null>(null);

export function DesktopActivationControllerProvider({
  children,
  bridgeBaseUrlOverride,
}: DesktopActivationControllerProviderProps) {
  const controller = useProvideDesktopActivationController(bridgeBaseUrlOverride);
  return (
    <DesktopActivationControllerContext.Provider value={controller}>
      {children}
    </DesktopActivationControllerContext.Provider>
  );
}

export function useDesktopActivationController() {
  const controller = useContext(DesktopActivationControllerContext);
  if (controller === null) {
    throw new Error("DesktopActivationControllerProvider is missing.");
  }
  return controller;
}
