import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approvePendingAuthorization,
  fetchDesktopEdition,
  fetchPendingAuthorizations,
} from "@/api";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { useDesktopActivationController } from "@/hooks/useDesktopActivationController";
import { useT } from "@/i18n/useT";
import {
  connectedOAuthSessionsQueryKey,
  pendingAuthorizationsQueryKey,
  shouldPollManagedMcpConnectorBridge,
} from "@/lib/settings/managedMcpConnectorQueries";
import {
  markPendingAuthorizationsSeen,
  pickNewestPendingAuthorization,
  selectAutoModalPendingAuthorizations,
} from "@/lib/settings/pendingAuthorizationPrompt";
import { cn } from "@/lib/utils/cn";
import type { PendingAuthorizationRequest } from "@/types";

const POLL_INTERVAL_MS = 12_000;

function redirectHost(redirectUri: string): string {
  try {
    return new URL(redirectUri).host;
  } catch {
    return redirectUri;
  }
}

function PendingAuthorizationApprovalModal({
  errorMessage,
  isApproving,
  item,
  onApprove,
  onNotNow,
}: {
  errorMessage: string | null;
  isApproving: boolean;
  item: PendingAuthorizationRequest | null;
  onApprove: () => void;
  onNotNow: () => void;
}) {
  const t = useT();

  return (
    <Modal
      open={item !== null}
      onOpenChange={(open) => {
        if (!open && item) {
          onNotNow();
        }
      }}
    >
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>
            {t("settings.mcp.pendingApproval.modal.title")}
          </ModalTitle>
        </ModalHeader>
        <ModalBody className="px-4 py-4">
          {item ? (
            <div>
              <div className="grid gap-2 text-sm">
                <div>
                  <p className="text-foreground/60 text-xs font-medium uppercase tracking-wide">
                    {t("settings.mcp.pendingApproval.modal.redirectHost")}
                  </p>
                  <p className="text-2xl font-semibold">
                    {redirectHost(item.redirect_uri)}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {t("settings.mcp.pendingApproval.modal.description")}
                  </p>
                </div>
                <details className="border-border/70 bg-muted/10 rounded-lg border px-3 py-2">
                  <summary className="text-foreground/70 cursor-pointer text-xs font-medium">
                    {t("settings.mcp.pendingApproval.modal.details")}
                  </summary>
                  <div className="mt-2 grid gap-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">
                        {t("settings.mcp.pendingApproval.clientId")}
                      </span>{" "}
                      <span className="font-mono break-all">
                        {item.client_id}
                      </span>
                    </div>
                    <div className="break-all">
                      <span className="text-muted-foreground">
                        {t("settings.mcp.pendingApproval.redirectUri")}
                      </span>{" "}
                      <span>{item.redirect_uri}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("settings.mcp.pendingApproval.expiresAt")}
                      </span>{" "}
                      <span>{new Date(item.expires_at).toLocaleString()}</span>
                    </div>
                  </div>
                </details>
                {errorMessage ? (
                  <p
                    className="text-amber-700 dark:text-amber-300"
                    role="alert"
                  >
                    {errorMessage}
                  </p>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  className={cn(
                    "border-border bg-background hover:bg-muted inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium",
                    isApproving && "cursor-not-allowed opacity-60",
                  )}
                  disabled={isApproving}
                  onClick={onApprove}
                  type="button"
                >
                  {isApproving
                    ? t("settings.mcp.pendingApproval.approving")
                    : t("settings.mcp.pendingApproval.approve")}
                </button>
                <button
                  className="border-border bg-background hover:bg-muted inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isApproving}
                  onClick={onNotNow}
                  type="button"
                >
                  {t("settings.mcp.pendingApproval.notNow")}
                </button>
              </div>
            </div>
          ) : null}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default function PendingMcpApprovalController({
  bridgeBaseUrl,
  enabled = true,
}: {
  bridgeBaseUrl: string;
  enabled?: boolean;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const activationController = useDesktopActivationController();
  const [dismissedRequestIds, setDismissedRequestIds] = useState<string[]>([]);
  const [modalRequestId, setModalRequestId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const seenRequestIdsRef = useRef<Set<string>>(new Set());
  const deferredRequestIdRef = useRef<string | null>(null);

  const desktopEditionQuery = useQuery({
    enabled: enabled && bridgeBaseUrl.length > 0,
    queryKey: ["desktop-edition", bridgeBaseUrl],
    queryFn: () => fetchDesktopEdition(bridgeBaseUrl),
    staleTime: Infinity,
  });
  const eligible =
    enabled &&
    shouldPollManagedMcpConnectorBridge(
      bridgeBaseUrl,
      activationController.accessSummaryQuery.data,
      activationController.desktopActivationQuery.data,
      desktopEditionQuery.data,
    );
  const pendingQuery = useQuery<PendingAuthorizationRequest[]>({
    enabled: eligible,
    queryKey: pendingAuthorizationsQueryKey(bridgeBaseUrl),
    queryFn: () => fetchPendingAuthorizations(bridgeBaseUrl),
    retry: false,
    refetchInterval: eligible ? POLL_INTERVAL_MS : false,
  });

  const modalItem = useMemo(() => {
    if (!modalRequestId) {
      return null;
    }
    return (
      pendingQuery.data?.find((item) => item.request_id === modalRequestId) ??
      null
    );
  }, [modalRequestId, pendingQuery.data]);

  const approveMutation = useMutation({
    mutationFn: (requestId: string) =>
      approvePendingAuthorization(bridgeBaseUrl, requestId),
    onMutate: () => {
      setApprovalError(null);
    },
    onSuccess: async (_result, requestId) => {
      if (modalRequestId === requestId) {
        setModalRequestId(null);
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: pendingAuthorizationsQueryKey(bridgeBaseUrl),
        }),
        queryClient.invalidateQueries({
          queryKey: connectedOAuthSessionsQueryKey(bridgeBaseUrl),
        }),
      ]);
    },
    onError: () => {
      setApprovalError(t("settings.mcp.pendingApproval.toast.approveFailed"));
    },
  });

  useEffect(() => {
    seenRequestIdsRef.current = new Set();
    deferredRequestIdRef.current = null;
    setDismissedRequestIds([]);
    setModalRequestId(null);
    setApprovalError(null);
  }, [bridgeBaseUrl]);

  useEffect(() => {
    if (eligible) {
      return;
    }
    seenRequestIdsRef.current = new Set();
    deferredRequestIdRef.current = null;
    setModalRequestId(null);
    setApprovalError(null);
  }, [eligible]);

  useEffect(() => {
    if (!eligible || !pendingQuery.isSuccess) {
      return;
    }
    const items = pendingQuery.data ?? [];
    const candidates = selectAutoModalPendingAuthorizations(
      items,
      seenRequestIdsRef.current,
      new Set(dismissedRequestIds),
    );
    markPendingAuthorizationsSeen(items, seenRequestIdsRef.current);
    const newest = pickNewestPendingAuthorization(candidates);
    if (!newest) {
      return;
    }
    if (document.visibilityState === "visible" && document.hasFocus()) {
      setApprovalError(null);
      setModalRequestId(newest.request_id);
      deferredRequestIdRef.current = null;
      return;
    }
    deferredRequestIdRef.current = newest.request_id;
  }, [
    dismissedRequestIds,
    eligible,
    pendingQuery.data,
    pendingQuery.isSuccess,
  ]);

  useEffect(() => {
    const handleForeground = async () => {
      if (document.visibilityState === "hidden") {
        return;
      }
      if (eligible) {
        await pendingQuery.refetch();
      }
      const deferredRequestId = deferredRequestIdRef.current;
      if (
        !deferredRequestId ||
        dismissedRequestIds.includes(deferredRequestId)
      ) {
        return;
      }
      setApprovalError(null);
      setModalRequestId(deferredRequestId);
      deferredRequestIdRef.current = null;
    };

    const foregroundListener = () => {
      void handleForeground();
    };
    window.addEventListener("focus", foregroundListener);
    document.addEventListener("visibilitychange", foregroundListener);
    return () => {
      window.removeEventListener("focus", foregroundListener);
      document.removeEventListener("visibilitychange", foregroundListener);
    };
  }, [dismissedRequestIds, eligible, pendingQuery.refetch]);

  const dismiss = () => {
    if (!modalRequestId) {
      return;
    }
    const requestId = modalRequestId;
    setDismissedRequestIds((current) =>
      current.includes(requestId) ? current : [...current, requestId],
    );
    setModalRequestId(null);
    setApprovalError(null);
    if (deferredRequestIdRef.current === requestId) {
      deferredRequestIdRef.current = null;
    }
  };

  return (
    <PendingAuthorizationApprovalModal
      errorMessage={approvalError}
      isApproving={approveMutation.isPending}
      item={modalItem}
      onApprove={() => {
        if (modalItem) {
          approveMutation.mutate(modalItem.request_id);
        }
      }}
      onNotNow={dismiss}
    />
  );
}
