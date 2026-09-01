import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import InlineItemEditor from "@/components/tree/InlineItemEditor";
import TreeHeader from "@/components/tree/TreeHeader";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/i18n/useT";

import { ChevronUpIcon } from "@/components/icons/Icons";
import ActionButton from "@/components/ui/ActionButton";

import SmartFolderModal from "@/components/tree/SmartFolderModal";
import SmartFoldersSection from "@/components/tree/SmartFoldersSection";
import { isSeedScopeNode } from "@/lib/graph/scopeOrigin";
import { buildEagerTreeNotesFromGraph } from "@/lib/tree/mergeSharedSourceNotes";
import { includeAncestorChain } from "@/lib/tree/notesTreeBuilder";
import { useGraphStore } from "@/stores/graphStore";
import type { PageSummary } from "@/types";
import type { GraphResponseNode } from "@/types/graph/Graph";

import LocramTreeHeader from "./LocramTreeHeader";
import LocramTreeNotesFolder from "./LocramTreeNotesFolder";
import SourceNotesTree from "./SourceNotesTree";

function mergeUniquePages(primary: PageSummary[], fallback: PageSummary[]) {
  return [
    ...primary,
    ...fallback.filter((page) => !primary.some((primaryPage) => primaryPage.id === page.id)),
  ];
}

function graphNodeToPageSummary(node: GraphResponseNode): PageSummary {
  return {
    id: String(node.id),
    title: String(node.title ?? ""),
    type: node.type ?? "fleeting",
    status: node.status ?? "active",
    subject: Array.isArray(node.subject) ? node.subject : [],
    tags: Array.isArray(node.tags) ? node.tags : [],
    parent_id: node.parentId ? String(node.parentId) : null,
    created_at: node.created_at ?? "",
    updated_at: node.updated_at ?? "",
  };
}

function getSmartFolderVisibleTreePages(
  notes: PageSummary[],
  graphNodes: GraphResponseNode[],
) {
  const notesPagesById = new Map(notes.map((page) => [page.id, page]));
  const smartFolderSeedPages = graphNodes
    .filter((node) => isSeedScopeNode(node))
    .map(
      (node) =>
        notesPagesById.get(String(node.id)) ??
        graphNodeToPageSummary(node),
    );
  if (smartFolderSeedPages.length === 0) {
    return [];
  }
  const matchedIds = new Set(smartFolderSeedPages.map((page) => page.id));
  return includeAncestorChain(
    mergeUniquePages(notes, smartFolderSeedPages),
    matchedIds,
  );
}

export default function LocramTree() {
  const t = useT();
  const {
    activeSource,
    activeTreeSelectionKind,
    createNoteDraft,
    isCreatingNote,
    isSubmitting,
    notes,
    onCancelCreateNote,
    onConfirmCreateNote,
    onStartCreateNote,
  } = useDesktopShellContext();
  const graphNodes = useGraphStore((state) => state.graphData?.nodes ?? []);
  const collapseAllHandlerRef = useRef<(() => void) | null>(null);
  const [collapseAllAvailable, setCollapseAllAvailable] = useState(false);
  const registerCollapseAll = useCallback((handler: (() => void) | null) => {
    collapseAllHandlerRef.current = handler;
    setCollapseAllAvailable(handler !== null);
  }, []);
  const invokeCollapseAll = useCallback(() => {
    collapseAllHandlerRef.current?.();
  }, []);
  const [isSmartFoldersExpanded, setIsSmartFoldersExpanded] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(true);
  const collapseAllLabel = t("common.collapseAll");
  const smartFoldersVisible = true;

  const visibleTreePages = useMemo(() => {
    if (activeTreeSelectionKind !== "smart-folder") {
      return notes;
    }
    return getSmartFolderVisibleTreePages(notes, graphNodes);
  }, [activeTreeSelectionKind, graphNodes, notes]);

  const scopedEagerTreeNotes =
    activeTreeSelectionKind === "smart-folder"
      ? visibleTreePages
      : buildEagerTreeNotesFromGraph(activeSource, visibleTreePages, graphNodes) ?? undefined;

  const inlineEditorPlaceholder = t("tree.notes.titlePlaceholder");

  let notesTreeContent: ReactNode;
  if (!activeSource || activeSource.kind === "local-base") {
    notesTreeContent = (
      <LocramTreeNotesFolder
        onRegisterCollapseAll={registerCollapseAll}
        eagerTreeNotes={scopedEagerTreeNotes}
        notes={visibleTreePages}
      />
    );
  } else if (activeSource.kind === "shared-base") {
    notesTreeContent = (
      <LocramTreeNotesFolder
        onRegisterCollapseAll={registerCollapseAll}
        eagerTreeNotes={scopedEagerTreeNotes}
        notes={visibleTreePages}
      />
    );
  } else if (activeSource.kind === "managed-base") {
    notesTreeContent = (
      <LocramTreeNotesFolder
        onRegisterCollapseAll={registerCollapseAll}
        eagerTreeNotes={scopedEagerTreeNotes}
        notes={visibleTreePages}
      />
    );
  } else {
    notesTreeContent = <SourceNotesTree activeSource={activeSource} notes={visibleTreePages} />;
  }

  return (
    <div className="bg-panel-background flex h-full flex-col pb-2">
      {smartFoldersVisible ? (
        <SmartFoldersSection
          expanded={isSmartFoldersExpanded}
          onExpandedChange={setIsSmartFoldersExpanded}
          extraActions={
            collapseAllAvailable ? (
              <ActionButton
                ariaLabel={collapseAllLabel}
                icon={<ChevronUpIcon className="h-3.5 w-3.5" />}
                onClick={(event) => {
                  event?.stopPropagation();
                  invokeCollapseAll();
                }}
                title={collapseAllLabel}
              />
            ) : null
          }
        />
      ) : null}

      <TreeHeader
        expanded={isNotesExpanded}
        actions={
          <LocramTreeHeader
            collapseAllAvailable={collapseAllAvailable}
            isNewNoteDisabled={isSubmitting || Boolean(activeSource && activeSource.kind !== "local-base")}
            onCollapseAll={invokeCollapseAll}
            onNewNote={() => onStartCreateNote()}
          />
        }
        onToggle={() => setIsNotesExpanded((previous) => !previous)}
        title={t("tree.notes.title")}
      />
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          !isNotesExpanded && "hidden",
        )}
      >
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {isCreatingNote && !createNoteDraft?.parent_id ? (
            <div className="mb-2">
              <InlineItemEditor
                initialValue=""
                isSubmitting={isSubmitting}
                onCancel={onCancelCreateNote}
                onConfirm={onConfirmCreateNote}
                placeholder={inlineEditorPlaceholder}
              />
            </div>
          ) : null}
          {notesTreeContent}
        </div>
      </div>

      <SmartFolderModal />
    </div>
  );
}
