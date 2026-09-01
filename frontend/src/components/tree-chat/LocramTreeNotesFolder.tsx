import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isModifierOpenInNewTab } from "@/lib/pageOpenTabs";
import type { PageSummary } from "@/types";
import { expandedIdsForActiveBranch } from "@/lib/tree/collapseNotesTreeBranch";
import { ancestorParentIdsForPage } from "@/lib/tree/mergeSharedSourceNotes";
import {
  buildLazyChildNodes,
  buildLazyRootTree,
  buildNotesTree,
  countDescendants,
  FOLDER_TYPES,
} from "@/lib/tree/notesTreeBuilder";
import type { TreeNode } from "@/lib/tree/notesTreeBuilder";

import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import ActionButton from "@/components/ui/ActionButton";
import { AddChatIcon, DeleteIcon, EditIcon, FolderIcon, LayerIcon, NoteIcon } from "@/components/icons/Icons";
import InlineConfirm from "@/components/tree/InlineConfirm";
import InlineItemEditor from "@/components/tree/InlineItemEditor";
import TreeFolder from "@/components/tree/TreeFolder";
import TreeItem from "@/components/tree/TreeItem";
import CopyableId from "@/components/ui/CopyableId";
import { useT } from "@/i18n/useT";
import {
  buildNotesTreeScopeKey,
  selectScopedChildrenByParentId,
  useNotesTreeStore,
} from "@/stores/notesTreeStore";

interface LocramTreeNotesFolderProps {
  notes: PageSummary[];
  eagerTreeNotes?: PageSummary[] | null;
  onRegisterCollapseAll?: (handler: (() => void) | null) => void;
}

export default function LocramTreeNotesFolder({
  notes,
  eagerTreeNotes,
  onRegisterCollapseAll,
}: LocramTreeNotesFolderProps) {
  const t = useT();
  const isEagerRemoteTree = eagerTreeNotes !== undefined;
  const titlePlaceholder = t("tree.notes.titlePlaceholder");
  const emptyLabel = t("tree.notes.empty");
  const addInsideLabel = t("tree.notes.addInside");
  const editLabel = t("tree.notes.edit");
  const deleteLabel = t("tree.notes.delete");
  const confirmLabel = t("common.confirm");
  const cancelLabel = t("common.cancel");
  const deleteActionLabel = t("common.delete");
  const {
    activeSource,
    activeSourceNodeId,
    activeTreeSelectionKind,
    bridgeBaseUrl,
    createNoteDraft,
    isCreatingNote,
    isSubmitting,
    onCancelCreateNote,
    onConfirmCreateNote,
    onDeleteNote,
    onRenameNote,
    onSelectPage,
    onSelectSourceNode,
    onStartCreateNote,
    selectedPage,
    notesScopeKey,
  } = useDesktopShellContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [collapsedSelectionId, setCollapsedSelectionId] = useState<string | null>(null);

  const selectedPageRef = useRef(selectedPage);
  selectedPageRef.current = selectedPage;
  const eagerTreeNotesRef = useRef(eagerTreeNotes);
  eagerTreeNotesRef.current = eagerTreeNotes;
  const activeSourceRef = useRef(activeSource);
  activeSourceRef.current = activeSource;
  const bridgeBaseUrlRef = useRef(bridgeBaseUrl);
  bridgeBaseUrlRef.current = bridgeBaseUrl;
  const notesScopeKeyRef = useRef(notesScopeKey);
  notesScopeKeyRef.current = notesScopeKey;
  const isEagerRemoteTreeRef = useRef(isEagerRemoteTree);
  isEagerRemoteTreeRef.current = isEagerRemoteTree;

  const { childrenByParentId, loadAncestorPath, loadChildren, setExpandedParentIdsForScope } =
    useNotesTreeStore();
  const expandedIdsSignature = useMemo(() => [...expandedIds].sort().join("\0"), [expandedIds]);
  const notesTreeScopeKey = useMemo(
    () => (bridgeBaseUrl ? buildNotesTreeScopeKey(bridgeBaseUrl, notesScopeKey) : null),
    [bridgeBaseUrl, notesScopeKey],
  );
  const scopedChildrenByParentId = useMemo(
    () =>
      notesTreeScopeKey
        ? selectScopedChildrenByParentId(childrenByParentId, notesTreeScopeKey)
        : {},
    [childrenByParentId, notesTreeScopeKey],
  );

  useEffect(() => {
    if (notesScopeKey.length === 0) {
      return;
    }
    setExpandedParentIdsForScope(notesScopeKey, expandedIds);
  }, [expandedIds, expandedIdsSignature, notesScopeKey, setExpandedParentIdsForScope]);

  const eagerRoots = useMemo(() => {
    if (!isEagerRemoteTree) {
      return null;
    }
    return buildNotesTree(eagerTreeNotes ?? []);
  }, [eagerTreeNotes, isEagerRemoteTree]);

  const lazyRoots = useMemo(
    () =>
      buildLazyRootTree(notes).map((rootNode) => {
        if (!expandedIds.has(rootNode.note.id)) {
          return rootNode;
        }
        const loadedChildren = scopedChildrenByParentId[rootNode.note.id];
        if (!loadedChildren) {
          return rootNode;
        }
        return {
          ...rootNode,
          children: buildLazyChildNodes(loadedChildren, scopedChildrenByParentId),
          hasChildren: true,
        };
      }),
    [notes, expandedIds, scopedChildrenByParentId],
  );

  const roots = eagerRoots ?? lazyRoots;

  const collapseAllHandlerRef = useRef<() => void>(() => {});
  collapseAllHandlerRef.current = () => {
    const page = selectedPageRef.current;
    if (!page) {
      setCollapsedSelectionId(null);
      setExpandedIds(new Set());
      return;
    }

    const applyActiveBranch = (ancestorIds: string[]) => {
      setCollapsedSelectionId(page.id);
      setExpandedIds(expandedIdsForActiveBranch(page, ancestorIds));
    };

    const eagerNotes = eagerTreeNotesRef.current;
    const eagerTreeActive = isEagerRemoteTreeRef.current;
    const baseUrl = bridgeBaseUrlRef.current;

    if (eagerTreeActive && eagerNotes && eagerNotes.length > 0) {
      const eagerById = new Map(eagerNotes.map((note) => [note.id, note]));
      if (eagerById.has(page.id)) {
        applyActiveBranch(ancestorParentIdsForPage(page.id, eagerNotes));
        return;
      }
    }

    if (!baseUrl) {
      applyActiveBranch([]);
      return;
    }

    void loadAncestorPath(
      baseUrl,
      page.id,
      activeSourceRef.current,
      notesScopeKeyRef.current,
    ).then((ancestorIds) => {
      applyActiveBranch(ancestorIds);
    });
  };

  useEffect(() => {
    if (!onRegisterCollapseAll) {
      return;
    }
    onRegisterCollapseAll(() => collapseAllHandlerRef.current());
    return () => onRegisterCollapseAll(null);
  }, [onRegisterCollapseAll]);

  useEffect(() => {
    if (collapsedSelectionId == null) {
      return;
    }
    if (selectedPage?.id === collapsedSelectionId) {
      return;
    }
    setCollapsedSelectionId(null);
  }, [collapsedSelectionId, selectedPage?.id]);

  useEffect(() => {
    if (!selectedPage) {
      return;
    }
    if (collapsedSelectionId === selectedPage.id) {
      return;
    }

    if (!selectedPage.parent_id) {
      const rafId = requestAnimationFrame(() => {
        const activeEl = containerRef.current?.querySelector("[data-active-tree-item]");
        activeEl?.scrollIntoView({ block: "nearest", behavior: "instant" });
      });
      return () => cancelAnimationFrame(rafId);
    }

    if (isEagerRemoteTree && eagerTreeNotes && eagerTreeNotes.length > 0) {
      const ancestorIds = ancestorParentIdsForPage(selectedPage.id, eagerTreeNotes);
      if (ancestorIds.length > 0) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          for (const id of ancestorIds) {
            next.add(id);
          }
          return next;
        });
      }
      const rafId = requestAnimationFrame(() => {
        const activeEl = containerRef.current?.querySelector("[data-active-tree-item]");
        activeEl?.scrollIntoView({ block: "nearest", behavior: "instant" });
      });
      return () => cancelAnimationFrame(rafId);
    }

    if (!bridgeBaseUrl) {
      return;
    }

    let cancelled = false;
    let rafId = 0;

    void (async () => {
      const ancestorIds = await loadAncestorPath(
        bridgeBaseUrl,
        selectedPage.id,
        activeSource,
        notesScopeKey,
      );
      if (cancelled) {
        return;
      }

      if (ancestorIds.length > 0) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          for (const id of ancestorIds) {
            next.add(id);
          }
          return next;
        });
      }

      rafId = requestAnimationFrame(() => {
        const activeEl = containerRef.current?.querySelector("[data-active-tree-item]");
        activeEl?.scrollIntoView({ block: "nearest", behavior: "instant" });
      });
    })();

    return () => {
      cancelled = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [
    activeSource,
    bridgeBaseUrl,
    collapsedSelectionId,
    eagerTreeNotes,
    isEagerRemoteTree,
    loadAncestorPath,
    selectedPage?.id,
    selectedPage?.parent_id,
  ]);

  const toggleId = useCallback(
    (id: string) => {
      const isCurrentlyExpanded = expandedIds.has(id);
      if (
        !isCurrentlyExpanded &&
        !isEagerRemoteTree &&
        bridgeBaseUrl &&
        !scopedChildrenByParentId[id]
      ) {
        void loadChildren(bridgeBaseUrl, id, activeSource, notesScopeKey);
      }
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [
      activeSource,
      bridgeBaseUrl,
      expandedIds,
      isEagerRemoteTree,
      loadChildren,
      scopedChildrenByParentId,
    ],
  );

  function startChildCreation(parentId: string) {
    if (activeSource && activeSource.kind !== "local-base") {
      return;
    }
    if (bridgeBaseUrl && !scopedChildrenByParentId[parentId]) {
      void loadChildren(bridgeBaseUrl, parentId, activeSource, notesScopeKey);
    }
    setExpandedIds((prev) => new Set([...prev, parentId]));
    onStartCreateNote({ parent_id: parentId });
  }

  function iconForType(type: string) {
    if (type === "hub") return <LayerIcon />;
    if (type === "structure") return <FolderIcon />;
    return <NoteIcon />;
  }

  function renderNodeActions(note: PageSummary) {
    if (activeSource && activeSource.kind !== "local-base") {
      return undefined;
    }
    if (renamingNoteId === note.id || deletingNoteId === note.id) {
      return undefined;
    }
    return (
      <>
        <CopyableId
          kind="note"
          value={note.id}
          iconOnly
          stopPropagation
        />
        <ActionButton
          ariaLabel={addInsideLabel}
          icon={<AddChatIcon className="h-3.5 w-3.5" />}
          onClick={(event) => {
            event?.stopPropagation();
            startChildCreation(note.id);
          }}
          title={addInsideLabel}
        />
        <ActionButton
          ariaLabel={editLabel}
          icon={<EditIcon className="h-3.5 w-3.5" />}
          onClick={(event) => {
            event?.stopPropagation();
            setRenamingNoteId(note.id);
          }}
          title={editLabel}
        />
        <ActionButton
          ariaLabel={deleteLabel}
          className="group"
          icon={<DeleteIcon className="group-hover:text-destructive h-3.5 w-3.5" />}
          onClick={(event) => {
            event?.stopPropagation();
            setDeletingNoteId(note.id);
          }}
          title={deleteLabel}
        />
      </>
    );
  }

  function renderInlineState(note: PageSummary) {
    if (renamingNoteId === note.id) {
      return (
        <InlineItemEditor
          initialValue={note.title}
          isSubmitting={false}
          onCancel={() => setRenamingNoteId(null)}
          onConfirm={(title) => {
            void onRenameNote(note.id, title);
            setRenamingNoteId(null);
          }}
          placeholder={titlePlaceholder}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
        />
      );
    }
    if (deletingNoteId === note.id) {
      return (
        <InlineConfirm
          actionName={deleteActionLabel}
          isSubmitting={false}
          label={t("tree.notes.deleteConfirmLabel", { title: note.title })}
          subjectIcon={<NoteIcon />}
          subjectName={note.title}
          onCancel={() => setDeletingNoteId(null)}
          onConfirm={() => {
            void onDeleteNote(note.id);
            setDeletingNoteId(null);
          }}
          confirmLabel={deleteActionLabel}
          cancelLabel={cancelLabel}
          tone="danger"
        />
      );
    }
    return null;
  }

  function selectNote(
    noteId: string,
    event: { altKey: boolean; metaKey: boolean; ctrlKey: boolean },
  ) {
    const tabDisposition = isModifierOpenInNewTab(event) ? "new-tab" : "default";
    void onSelectPage(noteId, { tabDisposition });
  }

  function renderChildCreationEditor(parentId: string) {
    if (!isCreatingNote || createNoteDraft?.parent_id !== parentId) {
      return null;
    }
    return (
      <div className="mb-1">
        <InlineItemEditor
          initialValue=""
          isSubmitting={isSubmitting}
          onCancel={onCancelCreateNote}
          onConfirm={onConfirmCreateNote}
          placeholder={titlePlaceholder}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
        />
      </div>
    );
  }

  function renderTreeNode(treeNode: TreeNode) {
    const { note, children, hasChildren } = treeNode;
    const isActive =
      selectedPage?.id === note.id ||
      (Boolean(activeSource) && activeSource?.kind !== "local-base" && activeSourceNodeId === note.id);
    const inlineState = renderInlineState(note);
    const isExpanded = expandedIds.has(note.id);
    const descendantCount = isEagerRemoteTree
      ? countDescendants(treeNode)
      : (note.active_descendant_count ?? 0);
    const hasDisplayableChildren = descendantCount > 0 || children.length > 0;

    if (FOLDER_TYPES.has(note.type)) {
      if (inlineState) {
        return (
          <div className="mb-0.5 px-2" key={note.id}>
            {inlineState}
          </div>
        );
      }
      return (
        <TreeFolder
          key={note.id}
          actions={renderNodeActions(note)}
          count={descendantCount}
          icon={iconForType(note.type)}
          isActive={isActive}
          isExpanded={isExpanded}
          label={note.title}
          onClick={(event) => void selectNote(note.id, event)}
          onToggle={hasDisplayableChildren ? () => toggleId(note.id) : undefined}
        >
          {renderChildCreationEditor(note.id)}
          {children.map((child) => renderTreeNode(child))}
        </TreeFolder>
      );
    }

    if (inlineState) {
      return (
        <div className="mb-0.5 px-2" key={note.id}>
          {inlineState}
        </div>
      );
    }

    if (hasChildren || children.length > 0) {
      return (
        <TreeItem
          key={note.id}
          actions={renderNodeActions(note)}
          count={descendantCount}
          icon={iconForType(note.type)}
          isActive={isActive}
          isExpanded={isExpanded}
          label={note.title}
          onClick={(event) => void selectNote(note.id, event)}
          onToggle={() => toggleId(note.id)}
        >
          {renderChildCreationEditor(note.id)}
          {children.map((child) => renderTreeNode(child))}
        </TreeItem>
      );
    }

    const creationEditor = renderChildCreationEditor(note.id);
    if (creationEditor) {
      return (
        <TreeItem
          key={note.id}
          actions={renderNodeActions(note)}
          icon={iconForType(note.type)}
          isActive={isActive}
          isExpanded={true}
          label={note.title}
          onClick={(event) => void selectNote(note.id, event)}
          onToggle={() => toggleId(note.id)}
          count={0}
        >
          {creationEditor}
        </TreeItem>
      );
    }

    return (
      <TreeItem
        key={note.id}
        actions={renderNodeActions(note)}
        icon={iconForType(note.type)}
        isActive={isActive}
        label={note.title}
        onClick={(event) => void selectNote(note.id, event)}
      />
    );
  }

  if (isEagerRemoteTree && (!eagerTreeNotes || eagerTreeNotes.length === 0)) {
    return (
      <p className="text-text-secondary px-2 py-4 text-center text-xs">{emptyLabel}</p>
    );
  }

  if (!isEagerRemoteTree && notes.length === 0) {
    return (
      <p className="text-text-secondary px-2 py-4 text-center text-xs">{emptyLabel}</p>
    );
  }

  return <div ref={containerRef}>{roots.map((treeNode) => renderTreeNode(treeNode))}</div>;
}
