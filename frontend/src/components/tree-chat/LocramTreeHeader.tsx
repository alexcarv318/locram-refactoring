import ActionButton from "@/components/ui/ActionButton";
import { AddChatIcon, ChevronUpIcon } from "@/components/icons/Icons";
import { useT } from "@/i18n/useT";

interface LocramTreeHeaderProps {
  collapseAllAvailable?: boolean;
  onCollapseAll?: () => void;
  onNewNote: () => void;
  isNewNoteDisabled?: boolean;
}

export default function LocramTreeHeader({
  collapseAllAvailable = false,
  onCollapseAll,
  onNewNote,
  isNewNoteDisabled,
}: LocramTreeHeaderProps) {
  const t = useT();
  const addLabel = t("tree.notes.addNewNote");
  const collapseAllLabel = t("common.collapseAll");
  return (
    <>
      {collapseAllAvailable && onCollapseAll ? (
        <ActionButton
          ariaLabel={collapseAllLabel}
          icon={<ChevronUpIcon className="h-3.5 w-3.5" />}
          onClick={(event) => {
            event?.stopPropagation();
            onCollapseAll();
          }}
          title={collapseAllLabel}
        />
      ) : null}
      <ActionButton
        ariaLabel={addLabel}
        disabled={isNewNoteDisabled}
        icon={<AddChatIcon className="h-3.5 w-3.5" />}
        onClick={(event) => {
          event?.stopPropagation();
          onNewNote();
        }}
        title={addLabel}
      />
    </>
  );
}
