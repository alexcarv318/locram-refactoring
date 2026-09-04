import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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

export function accessQueryKey(baseUrl: string) {
  return ["access-summary", baseUrl] as const;
}

const BRIDGE_STARTUP_RETRY_COUNT = 30;

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

function useProvideDesktopActivationController(bridgeBaseUrlOverride?: string) {
  const queryClient = useQueryClient();
  const activationRequestPromiseRef = useRef<Promise<ActivationRequestResult> | null>(null);
  const didMountContinueRef = useRef(false);
  const wasHiddenRef = useRef(false);
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

  useEffect(() => {
    const granted =
      accessSummaryQuery.data?.accountIdentity?.analyticsConsent?.granted ?? true;
    setTelemetryConsentGranted(granted);
  }, [accessSummaryQuery.data?.accountIdentity?.analyticsConsent?.granted]);

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
          throw new Error(
            "Could not open the sign-in page. Allow popups for this site and try again.",
          );
        }
      }
      return { activationStatus, autoRepairFailed };
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

  useEffect(() => {
    if (!queriesReady || !bridgeBaseUrl) {
      return;
    }

    if (didMountContinueRef.current) {
      return;
    }

    didMountContinueRef.current = true;

    if (!isBrowserActivationPending) {
      return;
    }

    void requestActivation({ source: "controller_poll" }).catch(() => undefined);
  }, [bridgeBaseUrl, isBrowserActivationPending, queriesReady, requestActivation]);

  useEffect(() => {
    const resumeAfterHidden = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
        return;
      }

      if (!wasHiddenRef.current) {
        return;
      }

      wasHiddenRef.current = false;

      if (!isBrowserActivationPending || !bridgeBaseUrl || activationRequestPromiseRef.current) {
        return;
      }

      void requestActivation({ source: "controller_poll" }).catch(() => undefined);
    };

    document.addEventListener("visibilitychange", resumeAfterHidden);

    return () => {
      document.removeEventListener("visibilitychange", resumeAfterHidden);
    };
  }, [bridgeBaseUrl, isBrowserActivationPending, requestActivation]);

  const beginSignIn = () => {
    void requestActivation({ source: "account_gate" }).catch(() => undefined);
  };

  return {
    accessSummaryQuery,
    activationMutation,
    approvalUrl,
    beginSignIn,
    bridgeBaseUrl,
    bridgeBaseUrlQuery,
    desktopActivationQuery,
    hasResolutionFailed,
    isBrowserActivationPending,
    isTransferActivationPending,
    queriesReady,
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
