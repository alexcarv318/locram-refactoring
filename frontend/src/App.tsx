import { useEffect, useRef } from "react";

import UnsavedChangesDialog from "@/components/editor/UnsavedChangesDialog";
import { AccountSignInGate } from "@/components/shell/AccountSignInGate";
import { DesktopShellContext } from "@/components/shell/desktopShellContext";
import PendingMcpApprovalController from "@/components/shell/PendingMcpApprovalController";
import { PanelLoader } from "@/components/ui/PanelLoader";
import { useDesktopAccountGate } from "@/hooks/useDesktopAccountGate";
import { DesktopActivationControllerProvider } from "@/hooks/useDesktopActivationController";
import { useDesktopShellApp } from "@/hooks/useDesktopShellApp";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { useDirection } from "@/providers/direction-provider";
import { useGraphModalStore } from "@/stores/graphModalStore";

export default function App() {
  return (
    <DesktopActivationControllerProvider>
      <AppContent />
    </DesktopActivationControllerProvider>
  );
}

function AppContent() {
  const isGraphModalOpen = useGraphModalStore((state) => state.isOpen);
  const accountGate = useDesktopAccountGate();
  const shellWrapperRef = useRef<HTMLDivElement | null>(null);
  const { resolvedDirection } = useDirection();
  const {
    activeBaseLabel,
    canGoBackInPageHistory,
    canGoForwardInPageHistory,
    errorMessage,
    layoutTabs,
    noticeMessage,
    onCancelWindowClose,
    pendingCloseTabId,
    onConfirmWindowCloseDiscard,
    onConfirmWindowCloseSave,
    onGoBackInPageHistory,
    onGoForwardInPageHistory,
    onSearch,
    onSelectSearchItem,
    recoveryBanner,
    shellContextValue,
    windowClosePending,
  } = useDesktopShellApp();
  const showBlockingOverlay =
    !isGraphModalOpen &&
    shellContextValue.isLoading &&
    shellContextValue.notes.length === 0 &&
    shellContextValue.selectedPage === null;
  const accountGateBlocksShell = accountGate.requiresSignIn;

  useEffect(() => {
    const shellWrapper = shellWrapperRef.current;
    if (!shellWrapper) {
      return;
    }

    if (accountGateBlocksShell) {
      shellWrapper.setAttribute("inert", "");
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && shellWrapper.contains(activeElement)) {
        activeElement.blur();
      }
      return;
    }

    shellWrapper.removeAttribute("inert");
  }, [accountGateBlocksShell]);

  return (
    <DesktopShellContext.Provider value={shellContextValue}>
      <PendingMcpApprovalController
        bridgeBaseUrl={shellContextValue.bridgeBaseUrl}
        enabled={!accountGateBlocksShell}
      />
      <div
        className="relative h-screen w-full"
        dir={resolvedDirection}
        data-dir={resolvedDirection}
      >
        {errorMessage ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {errorMessage}
          </div>
        ) : null}
        {noticeMessage ? (
          <div className="border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
            {noticeMessage}
          </div>
        ) : null}
        {recoveryBanner ? (
          <div
            className={[
              "flex items-center justify-between gap-3 px-4 py-3 text-sm",
              recoveryBanner.tone === "warning"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                : "border-blue-500/30 bg-blue-500/10 text-blue-950 dark:text-blue-100",
            ].join(" ")}
          >
            <div className="min-w-0">
              <div className="font-medium">{recoveryBanner.title}</div>
              <div>{recoveryBanner.description}</div>
            </div>
            {recoveryBanner.actionLabel && recoveryBanner.onAction ? (
              <button
                className="rounded-md border border-current/20 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-60"
                disabled={recoveryBanner.actionPending}
                onClick={() => {
                  void recoveryBanner.onAction?.();
                }}
                type="button"
              >
                {recoveryBanner.actionLabel}
              </button>
            ) : null}
          </div>
        ) : null}
        <div
          ref={shellWrapperRef}
          aria-hidden={accountGateBlocksShell ? true : undefined}
          className={accountGateBlocksShell ? "pointer-events-none select-none" : undefined}
        >
          <WorkspaceLayout
            activeBaseLabel={activeBaseLabel}
            canGoBackInPageHistory={canGoBackInPageHistory}
            canGoForwardInPageHistory={canGoForwardInPageHistory}
            onGoBackInPageHistory={onGoBackInPageHistory}
            onGoForwardInPageHistory={onGoForwardInPageHistory}
            onSearch={onSearch}
            onSelectSearchItem={onSelectSearchItem}
            tabs={layoutTabs}
          />
        </div>
        {showBlockingOverlay ? (
          <div className="bg-background/20 fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm">
            <PanelLoader description="preparing your workspace…" message="Loading Notes" size="lg" />
          </div>
        ) : null}
        <AccountSignInGate gate={accountGate} />
      </div>
      <UnsavedChangesDialog
        description="This tab has unsaved changes."
        onCancel={shellContextValue.onCancelCloseDirtyTab}
        onDiscard={() => {
          void shellContextValue.onConfirmCloseDirtyTabDiscard();
        }}
        onSave={() => {
          void shellContextValue.onConfirmCloseDirtyTabSave();
        }}
        open={pendingCloseTabId !== null}
        title="Close tab with unsaved changes?"
      />
      <UnsavedChangesDialog
        description="This window has unsaved changes."
        onCancel={onCancelWindowClose}
        onDiscard={() => {
          void onConfirmWindowCloseDiscard();
        }}
        onSave={() => {
          void onConfirmWindowCloseSave();
        }}
        open={windowClosePending}
        title="Close window with unsaved changes?"
      />
    </DesktopShellContext.Provider>
  );
}
