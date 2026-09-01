import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";

type UnsavedChangesDialogProps = {
  description: string;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
  open: boolean;
  title?: string;
};

export default function UnsavedChangesDialog({
  description,
  onCancel,
  onDiscard,
  onSave,
  open,
  title = "Unsaved changes",
}: UnsavedChangesDialogProps) {
  return (
    <Modal closeOnOverlayClick={false} onOpenChange={(nextOpen) => !nextOpen && onCancel()} open={open}>
      <ModalContent aria-label={title} aria-modal="true" className="max-w-md" role="dialog">
        <ModalHeader>
          <div className="space-y-1">
            <ModalTitle>{title}</ModalTitle>
            <ModalDescription>{description}</ModalDescription>
          </div>
        </ModalHeader>
        <ModalBody className="px-4 py-4">
          <p className="text-muted-foreground text-sm">
            Save your changes before continuing, discard them, or cancel and keep editing.
          </p>
        </ModalBody>
        <ModalFooter className="flex items-center justify-end gap-2">
          <button
            className="border-border text-foreground hover:bg-menu-hover-bg rounded-md border px-3 py-1.5 text-sm transition-colors"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="border-border text-foreground hover:bg-menu-hover-bg rounded-md border px-3 py-1.5 text-sm transition-colors"
            onClick={onDiscard}
            type="button"
          >
            Discard
          </button>
          <button
            className="bg-menu-active-fg hover:opacity-90 rounded-md px-3 py-1.5 text-sm text-white transition-opacity"
            onClick={onSave}
            type="button"
          >
            Save
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
