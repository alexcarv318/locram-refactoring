import { useEffect, useRef } from "react";

type UseDesktopWindowCloseGuardParams = {
  dirtyPageIds: string[];
  onDiscardAllDirtyPages: () => void;
  onSaveAllDirtyPages: () => Promise<boolean>;
  setWindowClosePending: (pending: boolean) => void;
};

function isTauriWebview() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function useDesktopWindowCloseGuard({
  dirtyPageIds,
  onDiscardAllDirtyPages,
  onSaveAllDirtyPages,
  setWindowClosePending,
}: UseDesktopWindowCloseGuardParams) {
  const bypassCloseRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyPageIds.length === 0) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirtyPageIds.length]);

  useEffect(() => {
    if (!isTauriWebview()) {
      return;
    }

    let unlisten: (() => void) | undefined;

    void import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      const currentWindow = getCurrentWindow();
      unlisten = await currentWindow.onCloseRequested((event) => {
        if (bypassCloseRef.current || dirtyPageIds.length === 0) {
          return;
        }

        event.preventDefault();
        setWindowClosePending(true);
      });
    });

    return () => {
      unlisten?.();
    };
  }, [dirtyPageIds.length, setWindowClosePending]);

  const closeWindow = async () => {
    if (!isTauriWebview()) {
      return;
    }
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    bypassCloseRef.current = true;
    await getCurrentWindow().close();
  };

  return {
    onCancelWindowClose: () => {
      setWindowClosePending(false);
    },
    onConfirmWindowCloseDiscard: async () => {
      onDiscardAllDirtyPages();
      setWindowClosePending(false);
      await closeWindow();
    },
    onConfirmWindowCloseSave: async () => {
      const saved = await onSaveAllDirtyPages();
      if (!saved) {
        return;
      }
      setWindowClosePending(false);
      await closeWindow();
    },
  };
}
