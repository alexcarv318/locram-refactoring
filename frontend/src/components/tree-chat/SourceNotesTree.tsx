import { useMemo } from "react";

import { DocumentIcon, GlobalIcon } from "@/components/icons/Icons";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import TreeItem from "@/components/tree/TreeItem";
import { getSourceEmptyMessage } from "@/lib/sources/sourceRegistry";
import type { PageSummary } from "@/types";
import type { ActiveSource } from "@/types/source";

export default function SourceNotesTree({
  activeSource,
  notes,
}: {
  activeSource: ActiveSource;
  notes: PageSummary[];
}) {
  const { activeSourceNodeId, onSelectSourceNode } = useDesktopShellContext();

  const emptyMessage = useMemo(
    () => getSourceEmptyMessage(activeSource),
    [activeSource],
  );

  return (
    <div className="flex-1 overflow-y-auto px-2 py-1">
      {notes.length === 0 ? (
        <div className="px-2 py-4 text-center text-xs text-text-secondary">{emptyMessage}</div>
      ) : (
        notes.map((note) => (
          <TreeItem
            key={note.id}
            icon={
              activeSource.kind === "managed-base"
                ? <GlobalIcon />
                : <DocumentIcon />
            }
            isActive={activeSourceNodeId === note.id}
            label={note.title}
            onClick={() => {
              void onSelectSourceNode(note.id);
            }}
          />
        ))
      )}
    </div>
  );
}
