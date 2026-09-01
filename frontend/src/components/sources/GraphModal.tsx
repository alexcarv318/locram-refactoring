import { useEffect, useMemo, useRef, useState } from "react";
import { LuX } from "react-icons/lu";

import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import { PanelLoader } from "@/components/ui/PanelLoader";
import ActionButton from "@/components/ui/ActionButton";
import { Modal, ModalBody, ModalContent } from "@/components/ui/Modal";
import { SidebarToggleLeftIcon, SidebarToggleRightIcon } from "@/components/icons/Icons";
import { useGraphStore } from "@/stores/graphStore";
import { MIN_SOURCES_TAB_WIDTH, useShellLayoutStore } from "@/stores/shellLayoutStore";
import { useT } from "@/i18n/useT";

import { GraphCanvasView } from "./GraphCanvasView";
import { PanelHorizontalResizeHandle } from "./PanelHorizontalResizeHandle";
import SourcesListPanel from "./SourcesListPanel";

const DEFAULT_MODAL_SOURCES_PANEL_WIDTH = 520;

interface GraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GraphModal({ open, onOpenChange }: GraphModalProps) {
  const t = useT();
  const { isGraphRefreshing } = useDesktopShellContext();
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [modalSourcesPanelWidth, setModalSourcesPanelWidth] = useState(DEFAULT_MODAL_SOURCES_PANEL_WIDTH);
  const setGraphMode = useGraphStore((state) => state.setGraphMode);
  const workspaceSourcesPanelWidth = useShellLayoutStore(
    (state) => state.tabs.find((tab) => tab.id === "sources")?.width ?? DEFAULT_MODAL_SOURCES_PANEL_WIDTH,
  );
  const resetVisibleTabWidthsToDefault = useShellLayoutStore((state) => state.resetVisibleTabWidthsToDefault);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      setModalSourcesPanelWidth(
        Math.min(workspaceSourcesPanelWidth, DEFAULT_MODAL_SOURCES_PANEL_WIDTH),
      );
      setGraphMode("frozen");
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      resetVisibleTabWidthsToDefault();
    }
  }, [open, resetVisibleTabWidthsToDefault, setGraphMode, workspaceSourcesPanelWidth]);

  const panelActions = useMemo(
    () => (
      <>
        <ActionButton
          className="h-7 w-7"
          icon={
            isPanelVisible ? (
              <SidebarToggleRightIcon className="h-4 w-4" />
            ) : (
              <SidebarToggleLeftIcon className="h-4 w-4" />
            )
          }
          onClick={() => setIsPanelVisible((current) => !current)}
          title={isPanelVisible ? t("graph.modal.hideSourcesPanel") : t("graph.modal.showSourcesPanel")}
        />
        <ActionButton
          className="h-7 w-7"
          icon={<LuX className="h-3.5 w-3.5" />}
          onClick={() => onOpenChange(false)}
          title={t("graph.modal.closeModal")}
        />
      </>
    ),
    [isPanelVisible, onOpenChange],
  );

  return (
    <Modal onOpenChange={onOpenChange} open={open}>
      <ModalContent
        aria-label={t("graph.modal.expandedGraphScope")}
        aria-modal="true"
        className="mx-[-0.75rem] flex h-full max-w-none flex-col sm:mx-[-2rem]"
        role="dialog"
      >
        <ModalBody className="flex md:flex-row">
          <div className="bg-background relative min-w-0 flex-1 overflow-hidden">
            <GraphCanvasView isModal />
            {isPanelVisible ? (
              <PanelHorizontalResizeHandle
                panelId="graph-modal-sources-panel"
                onResize={setModalSourcesPanelWidth}
                width={modalSourcesPanelWidth}
                minWidth={MIN_SOURCES_TAB_WIDTH}
                side="start"
                position="end"
              />
            ) : null}
          </div>
          {isPanelVisible ? (
            <div
              data-panel-id="graph-modal-sources-panel"
              className="bg-background relative hidden h-full shrink-0 overflow-hidden md:flex"
              style={{ width: `${modalSourcesPanelWidth}px`, minWidth: `${MIN_SOURCES_TAB_WIDTH}px` }}
            >
              <div className="h-full w-full overflow-hidden">
                <SourcesListPanel toolbarActions={panelActions} borderlessToolbar showGraphToggle={false} />
              </div>
            </div>
          ) : null}
          {!isPanelVisible ? (
            <div className="pointer-events-none absolute top-0 end-0 z-10 hidden md:block">
              <div className="pointer-events-auto flex min-w-0 items-center justify-end gap-1 px-2 py-1.5 sm:px-3">
                {panelActions}
              </div>
            </div>
          ) : null}
          {isGraphRefreshing ? (
            <div className="bg-background/35 absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm">
              <PanelLoader
                description={t("graph.modal.refreshing.description")}
                message={t("graph.modal.refreshing.message")}
                size="lg"
              />
            </div>
          ) : null}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
