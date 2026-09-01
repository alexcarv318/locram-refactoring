import { type DragEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { LuCheck, LuFolderOpen, LuX } from "react-icons/lu";

import { inspectArtifact } from "@/api/baseManagementApi";
import { fetchDesktopActivation } from "@/api";
import { fetchRuntime } from "@/api/runtimeApi";
import { RegisterBaseIcon } from "@/components/icons/Icons";
import Input from "@/components/ui/Input";
import { useQuery } from "@tanstack/react-query";
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils/cn";
import { useEditorStore } from "@/stores/editorStore";
import { useRegisterExistingBaseModalStore } from "@/stores/registerExistingBaseModalStore";
import type { FileHomeSource } from "@/types/source";

type RegisterExistingBaseModalProps = {
  bridgeBaseUrl: string;
  onOpened?: (source: FileHomeSource) => Promise<void> | void;
};

const tauriRuntime = isTauri();
const desktopRuntime = tauriRuntime;
const sqlitePathPattern = /\.(db|sqlite|sqlite3)$/i;

function dragTransferContainsFiles(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes("Files");
}

function normalizeFileUriToPath(uri: string): string | null {
  const trimmed = uri.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "file:") {
      return null;
    }
    const pathname = parsed.pathname;
    if (pathname.length >= 3 && /^\/[A-Za-z]:/.test(pathname)) {
      return decodeURIComponent(pathname.slice(1));
    }
    return decodeURIComponent(pathname);
  } catch {
    return trimmed.startsWith("file://") ? trimmed.slice("file://".length) : null;
  }
}

function pathsFromDataTransfer(dataTransfer: DataTransfer): string[] {
  const uriList = dataTransfer.getData("text/uri-list").trim();
  if (uriList.length > 0) {
    const filePaths = uriList
      .split(/\r?\n/)
      .map(normalizeFileUriToPath)
      .filter((entry): entry is string => Boolean(entry));
    if (filePaths.length > 0) {
      return filePaths;
    }
  }
  const files = Array.from(dataTransfer.files);
  const declaredPaths = files
    .map((file) => (file as File & { path?: string }).path)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  if (declaredPaths.length > 0) {
    return declaredPaths;
  }
  return [];
}

function preferDatabasePath(paths: string[]): string | undefined {
  if (paths.length === 0) {
    return undefined;
  }
  return paths.find((candidate) => sqlitePathPattern.test(candidate));
}

async function pickDatabasePathWithDialog(
  dialogTitle: string,
  filterName: string,
): Promise<string | null> {
  if (!tauriRuntime) {
    return null;
  }
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      title: dialogTitle,
      multiple: false,
      directory: false,
      filters: [{ name: filterName, extensions: ["db", "sqlite", "sqlite3"] }],
    });
    if (selected === null) {
      return null;
    }
    return typeof selected === "string" ? selected : selected[0] ?? null;
  } catch {
    return null;
  }
}

function labelFromPath(path: string): string {
  const trimmedPath = path.trim();
  const pathSegments = trimmedPath.split(/[\\/]/).filter((segment) => segment.length > 0);
  return pathSegments[pathSegments.length - 1] ?? trimmedPath;
}

function externalFileHomeSource(path: string): FileHomeSource {
  return {
    kind: "file-home",
    id: `external-file:${path}`,
    label: labelFromPath(path),
    path,
    subjectKind: "incoming_sqlite_file",
    managementScope: "external_file",
  };
}

function normalizeExternalPath(
  rawPath: string,
  locramHome: string | undefined,
): string {
  const trimmedPath = rawPath.trim();
  if (!trimmedPath.startsWith("~/")) {
    return trimmedPath;
  }
  if (!locramHome) {
    return trimmedPath;
  }
  const normalizedHome = locramHome.replace(/[\\/]\.locram$/, "");
  return `${normalizedHome}/${trimmedPath.slice(2)}`;
}

export default function RegisterExistingBaseModal({
  bridgeBaseUrl,
  onOpened,
}: RegisterExistingBaseModalProps) {
  const t = useT();
  const closeModal = useRegisterExistingBaseModalStore((state) => state.closeModal);
  const isOpen = useRegisterExistingBaseModalStore((state) => state.isOpen);
  const openSource = useEditorStore((state) => state.openSource);
  const runtimeQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["runtime-summary", bridgeBaseUrl] as const,
    queryFn: () => fetchRuntime(bridgeBaseUrl),
    retry: false,
    staleTime: 30_000,
  });
  const desktopActivationQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0,
    queryKey: ["desktop-activation", bridgeBaseUrl] as const,
    queryFn: () => fetchDesktopActivation(bridgeBaseUrl),
    retry: false,
    staleTime: 10_000,
  });
  const multiBaseUsable = desktopActivationQuery.data?.usableCapabilities.multiBase === true;
  const [pathDraft, setPathDraft] = useState("");
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [domDragOver, setDomDragOver] = useState(false);
  const [nativeDragActive, setNativeDragActive] = useState(false);
  const pathInputRef = useRef<HTMLInputElement>(null);
  const dropCounterRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      setPathDraft("");
      setSubmitErrorMessage("");
      setIsSubmitting(false);
      setDomDragOver(false);
      setNativeDragActive(false);
      dropCounterRef.current = 0;
      return;
    }
    setSubmitErrorMessage("");
    requestAnimationFrame(() => pathInputRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !tauriRuntime) {
      setNativeDragActive(false);
      return;
    }

    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        const stop = await getCurrentWebview().onDragDropEvent((evt) => {
          const payload = evt.payload;
          if (payload.type === "enter") {
            setNativeDragActive(preferDatabasePath(payload.paths) !== undefined);
            return;
          }
          if (payload.type === "leave") {
            setNativeDragActive(false);
            return;
          }
          if (payload.type === "drop") {
            setNativeDragActive(false);
            const chosen = preferDatabasePath(payload.paths);
            if (chosen !== undefined) {
              setPathDraft(chosen);
              setSubmitErrorMessage("");
              return;
            }
            if (payload.paths.length > 0) {
              setSubmitErrorMessage(t("bases.openDatabase.error.wrongExtension"));
            }
          }
        });
        if (cancelled) {
          stop();
        } else {
          unlisten = stop;
        }
      } catch {
        setSubmitErrorMessage(t("bases.openDatabase.error.nativeDropUnavailable"));
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
      setNativeDragActive(false);
    };
  }, [isOpen, t]);

  async function handleSubmit() {
    const trimmedPath = normalizeExternalPath(pathDraft, runtimeQuery.data?.locram_home);
    if (!trimmedPath || isSubmitting || bridgeBaseUrl.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitErrorMessage("");
    try {
      const inspection = await inspectArtifact(bridgeBaseUrl, trimmedPath);
      const source = externalFileHomeSource(inspection.path);
      openSource(source, { mode: "inspect" });
      await onOpened?.(source);
      closeModal();
    } catch (error) {
      setSubmitErrorMessage(
        error instanceof Error ? error.message : t("bases.openDatabase.error.openFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }
    closeModal();
  }

  function handlePathInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
    }
  }

  async function handleBrowse() {
    if (isSubmitting || !desktopRuntime) {
      return;
    }
    setSubmitErrorMessage("");
    const picked = await pickDatabasePathWithDialog(
      t("bases.openDatabase.dialogPickerTitle"),
      t("bases.openDatabase.dialogPickerFilter"),
    );
    if (picked !== null) {
      setPathDraft(picked);
    }
  }

  function handleDropZoneDragEnter(event: DragEvent<HTMLDivElement>) {
    if (desktopRuntime || !dragTransferContainsFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    dropCounterRef.current += 1;
    setDomDragOver(true);
  }

  function handleDropZoneDragLeave(event: DragEvent<HTMLDivElement>) {
    if (desktopRuntime || !dragTransferContainsFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    dropCounterRef.current -= 1;
    if (dropCounterRef.current <= 0) {
      dropCounterRef.current = 0;
      setDomDragOver(false);
    }
  }

  function handleDropZoneDragOver(event: DragEvent<HTMLDivElement>) {
    if (desktopRuntime || !dragTransferContainsFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDropZoneDrop(event: DragEvent<HTMLDivElement>) {
    if (desktopRuntime || !dragTransferContainsFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    dropCounterRef.current = 0;
    setDomDragOver(false);
    const paths = pathsFromDataTransfer(event.dataTransfer);
    const chosen = preferDatabasePath(paths);
    if (chosen !== undefined) {
      setPathDraft(chosen);
      setSubmitErrorMessage("");
      return;
    }
    if (paths.length > 0) {
      setSubmitErrorMessage(t("bases.openDatabase.error.wrongExtension"));
      return;
    }
    setSubmitErrorMessage(t("bases.openDatabase.error.browserDropPathHidden"));
  }

  const trimmedPath = pathDraft.trim();
  const canSubmit = trimmedPath.length > 0 && !isSubmitting && bridgeBaseUrl.length > 0;
  const dropHighlight = domDragOver || nativeDragActive;

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <ModalContent className="flex h-auto max-h-[90vh] max-w-xl flex-col">
        <ModalCloseButton
          className="text-text-secondary hover:text-foreground hover:bg-menu-hover-bg flex size-7 cursor-pointer items-center justify-center rounded-md bg-transparent p-1 transition-all duration-150"
        >
          <LuX className="size-3.5" />
        </ModalCloseButton>

        <ModalHeader>
          <div className="flex min-w-0 items-start gap-3 pe-8">
            <span className="bg-menu-hover-bg text-menu-active-fg mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <RegisterBaseIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <ModalTitle>{t("bases.openDatabase.title")}</ModalTitle>
              <ModalDescription>
                {multiBaseUsable
                  ? t("bases.openDatabase.description.multiBase")
                  : t("bases.openDatabase.description.singleBase")}
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="min-h-0 overflow-auto">
          <div className="space-y-5 p-4 sm:p-5">
            <section className="space-y-2">
              <div className="text-text-secondary text-xs font-semibold tracking-wider uppercase">
                {t("bases.openDatabase.pathLabel")}
              </div>
              <Input
                ref={pathInputRef}
                placeholder={t("bases.openDatabase.pathPlaceholder")}
                value={pathDraft}
                onValueChange={setPathDraft}
                onKeyDown={handlePathInputKeyDown}
                className="h-9 rounded-xl px-3 text-sm"
                disabled={isSubmitting}
                autoComplete="off"
                spellCheck={false}
              />
            </section>

            <section className="space-y-2">
              <div className="text-text-secondary text-xs font-semibold tracking-wider uppercase">
                {t("bases.openDatabase.fileSectionLabel")}
              </div>
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
                  dropHighlight
                    ? "border-menu-active-bg bg-menu-active-bg/10"
                    : "border-border hover:border-menu-active-bg/40 hover:bg-menu-hover-bg/40",
                  isSubmitting && "pointer-events-none opacity-60",
                  !desktopRuntime && "hover:border-border opacity-95",
                )}
                {...(!desktopRuntime
                  ? {
                      onDragEnter: handleDropZoneDragEnter,
                      onDragLeave: handleDropZoneDragLeave,
                      onDragOver: handleDropZoneDragOver,
                      onDrop: handleDropZoneDrop,
                    }
                  : {})}
              >
                <p className="text-text-secondary text-xs leading-relaxed">
                  {desktopRuntime
                    ? t("bases.openDatabase.dropHint.desktop")
                    : t("bases.openDatabase.dropHint.browser")}
                </p>
                <button
                  type="button"
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                    "border-border bg-panel-background text-foreground hover:bg-menu-hover-bg",
                    !desktopRuntime && "text-text-secondary cursor-not-allowed opacity-70",
                  )}
                  onClick={() => void handleBrowse()}
                  disabled={isSubmitting || !desktopRuntime}
                  title={
                    desktopRuntime ? undefined : t("bases.openDatabase.chooseFileDisabled")
                  }
                >
                  <LuFolderOpen className="h-3.5 w-3.5" />
                  {t("bases.openDatabase.chooseFile")}
                </button>
              </div>
              <p className="text-text-secondary text-xs">
                {multiBaseUsable
                  ? t("bases.openDatabase.footerHint.multiBase")
                  : t("bases.openDatabase.footerHint.singleBase")}
              </p>
            </section>

            {submitErrorMessage ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                {submitErrorMessage}
              </div>
            ) : null}
          </div>
        </ModalBody>

        <ModalFooter className="border-0 pt-3">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="border-border hover:bg-menu-hover-bg cursor-pointer rounded-lg border px-3 py-2 text-sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("bases.openDatabase.action.cancel")}
            </button>
            <button
              type="button"
              className={cn(
                "flex min-w-[100px] cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                canSubmit
                  ? "bg-menu-active-bg text-menu-active-fg"
                  : "bg-panel-muted text-text-secondary cursor-not-allowed",
              )}
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
            >
              <LuCheck className="h-3.5 w-3.5" />
              {isSubmitting
                ? t("bases.openDatabase.action.opening")
                : t("bases.openDatabase.action.open")}
            </button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
