import { createPortal } from "react-dom";

import { Modal, ModalContent } from "@/components/ui/Modal";
import { PanelLoader } from "@/components/ui/PanelLoader";
import type { useDesktopAccountGate } from "@/hooks/useDesktopAccountGate";
import { useT } from "@/i18n/useT";
import { settingsButtonClassName } from "@/lib/settings/settingsUi";
import { cn } from "@/lib/utils/cn";

const SIGN_IN_BUTTON_WIDTH_CLASS = "w-[10.5rem]";

type AccountSignInGateProps = {
  gate: ReturnType<typeof useDesktopAccountGate>;
};

export function AccountSignInGate({ gate }: AccountSignInGateProps) {
  const t = useT();
  const {
    approvalUrl,
    beginSignIn,
    cancelBrowserSignInWait,
    desktopActivationQuery,
    hasResolutionFailed,
    isAwaitingBrowserSignIn,
    isResolving,
    requiresSignIn,
    retryResolution,
    signInMutation,
  } = gate;
  const signInLabel = t("settings.section.account.action.connect");
  const lastAttempt = desktopActivationQuery.data?.lastAttempt;
  const lastAttemptFailed =
    lastAttempt?.state === "failed_retryable" || lastAttempt?.state === "failed_terminal";
  const signInError =
    signInMutation.error instanceof Error
      ? signInMutation.error.message
      : lastAttemptFailed
        ? lastAttempt.message
        : null;

  if (isResolving && hasResolutionFailed) {
    return createPortal(
      <div className="bg-background/80 fixed inset-0 z-[80] flex items-center justify-center backdrop-blur-sm">
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <h2 className="text-lg font-semibold">{t("app.signInGate.errorTitle")}</h2>
          <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-6">
            {t("app.signInGate.errorDescription")}
          </p>
          <button
            className={cn(settingsButtonClassName(false), SIGN_IN_BUTTON_WIDTH_CLASS, "mt-6 shrink-0")}
            onClick={retryResolution}
            type="button"
          >
            <span className="block w-full truncate text-center">{t("app.signInGate.retry")}</span>
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  if (isResolving) {
    return createPortal(
      <div className="bg-background/80 fixed inset-0 z-[80] flex items-center justify-center backdrop-blur-sm">
        <PanelLoader
          description={t("app.signInGate.loadingDescription")}
          message={t("app.signInGate.loadingTitle")}
          size="lg"
        />
      </div>,
      document.body,
    );
  }

  if (!requiresSignIn) {
    return null;
  }

  if (isAwaitingBrowserSignIn) {
    return createPortal(
      <div className="bg-background/80 fixed inset-0 z-[80] flex items-center justify-center backdrop-blur-sm">
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <PanelLoader
            description={t("app.signInGate.browserActivationCheck")}
            message={t("app.signInGate.waitingTitle")}
            size="lg"
          />
          {approvalUrl ? (
            <a
              className="text-muted-foreground mt-6 text-sm underline"
              href={approvalUrl}
              rel="noreferrer"
              target="_blank"
            >
              {t("app.signInGate.openSignInPage")}
            </a>
          ) : null}
          <button
            className={cn(settingsButtonClassName(false), SIGN_IN_BUTTON_WIDTH_CLASS, "mt-4 shrink-0")}
            onClick={cancelBrowserSignInWait}
            type="button"
          >
            <span className="block w-full truncate text-center">{t("common.cancel")}</span>
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <Modal open onOpenChange={() => {}} closeOnOverlayClick={false}>
      <ModalContent className="max-w-md">
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <h2 className="text-lg font-semibold">{t("app.signInGate.title")}</h2>
          <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-6">
            {t("app.signInGate.description")}
          </p>
          {signInError ? (
            <p className="text-destructive mt-4 max-w-sm text-sm leading-6">{signInError}</p>
          ) : null}
          <button
            aria-label={signInLabel}
            className={cn(
              settingsButtonClassName(signInMutation.isPending),
              SIGN_IN_BUTTON_WIDTH_CLASS,
              "mt-8 shrink-0",
            )}
            disabled={signInMutation.isPending}
            onClick={beginSignIn}
            type="button"
          >
            <span className="block w-full truncate text-center">{signInLabel}</span>
          </button>
          {approvalUrl ? (
            <a
              className="text-muted-foreground mt-4 text-sm underline"
              href={approvalUrl}
              rel="noreferrer"
              target="_blank"
            >
              {t("app.signInGate.openSignInPage")}
            </a>
          ) : null}
        </div>
      </ModalContent>
    </Modal>
  );
}
