import ActionButton from "@/components/ui/ActionButton";
import { DatabaseIcon, NoteIcon, ShareBaseIcon } from "@/components/icons/Icons";
import { useT } from "@/i18n/useT";

export type TreeMode = "notes" | "bases" | "network";

interface DockProps {
  treeMode?: TreeMode;
  onTreeModeChange?: (mode: TreeMode) => void;
  onSelectNotes?: () => void;
  showNetwork?: boolean;
}

export default function Dock({
  treeMode = "notes",
  onTreeModeChange,
  onSelectNotes,
  showNetwork = true,
}: DockProps) {
  const t = useT();
  return (
    <div className="border-border flex h-9 w-full items-center justify-center gap-3 border-b p-2">
      <ActionButton
        active={treeMode === "bases"}
        ariaLabel={t("dock.sources")}
        icon={<DatabaseIcon className="size-4" />}
        onClick={() => onTreeModeChange?.("bases")}
        title={t("dock.sources")}
      />
      {showNetwork && (
        <ActionButton
          active={treeMode === "network"}
          ariaLabel={t("dock.network")}
          icon={<ShareBaseIcon className="h-4 w-4" />}
          onClick={() => onTreeModeChange?.("network")}
          title={t("dock.network")}
        />
      )}
      <ActionButton
        active={treeMode === "notes"}
        ariaLabel={t("dock.notes")}
        icon={<NoteIcon className="size-4" />}
        onClick={() => {
          onTreeModeChange?.("notes");
          onSelectNotes?.();
        }}
        title={t("dock.notes")}
      />
    </div>
  );
}
