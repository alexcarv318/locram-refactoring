import { useState } from "react";
import { LuX } from "react-icons/lu";

import { restoreBackup } from "@/api/baseManagementApi";
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
import type { BackupSummary, RestoreResult } from "@/types";

interface BackupRestoreModalProps {
  backup: BackupSummary;
  baseUrl: string;
  onClose: () => void;
  onRestored: () => void;
}

export default function BackupRestoreModal({ backup, baseUrl, onClose, onRestored }: BackupRestoreModalProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowBaseReplacement, setAllowBaseReplacement] = useState(false);

  async function handleRestore() {
    setIsRestoring(true);
    setError(null);
    try {
      const restoreResult = await restoreBackup(
        baseUrl,
        {
          filename: backup.filename,
          path: backup.path ?? undefined,
          allowBaseReplacement,
        },
      );
      setResult(restoreResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }}>
      <ModalContent className="flex h-auto max-h-[90vh] max-w-lg flex-col">
        <ModalHeader>
          <div className="flex flex-col gap-0.5">
            <ModalTitle>Restore Backup</ModalTitle>
            <ModalDescription>This will replace the current active base with the backup.</ModalDescription>
          </div>
          <ModalCloseButton>
            <LuX className="h-4 w-4" />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody className="overflow-y-auto p-4">
          {result ? (
            <div className="space-y-3">
              <div className="bg-primary/10 rounded-lg border border-primary/20 p-3">
                <p className="text-primary text-sm font-medium">Restore completed successfully.</p>
              </div>
              <div className="bg-panel-background rounded-lg border p-3 space-y-2">
                <div>
                  <p className="text-text-secondary text-xs font-medium">Restored from</p>
                  <p className="truncate font-mono text-xs">{result.restored_from}</p>
                </div>
                {result.restored_from_path && (
                  <div>
                    <p className="text-text-secondary text-xs font-medium">Restored from path</p>
                    <p className="truncate font-mono text-xs">{result.restored_from_path}</p>
                  </div>
                )}
                {result.pre_restore_backup && (
                  <div>
                    <p className="text-text-secondary text-xs font-medium">Pre-restore backup saved to</p>
                    <p className="truncate font-mono text-xs">{result.pre_restore_backup}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-panel-background rounded-lg border p-3 space-y-2">
                <div>
                  <p className="text-text-secondary text-xs font-medium">Backup file</p>
                  <p className="truncate font-mono text-xs">{backup.filename}</p>
                </div>
                {backup.created_at && (
                  <div>
                    <p className="text-text-secondary text-xs font-medium">Created</p>
                    <p className="text-sm">{backup.created_at}</p>
                  </div>
                )}
                {backup.display_name && (
                  <div>
                    <p className="text-text-secondary text-xs font-medium">Snapshot base</p>
                    <p className="text-sm">{backup.display_name}</p>
                  </div>
                )}
                {backup.base_id && (
                  <div>
                    <p className="text-text-secondary text-xs font-medium">Snapshot base_id</p>
                    <p className="truncate font-mono text-xs">{backup.base_id}</p>
                  </div>
                )}
                {backup.source_base_id && (
                  <div>
                    <p className="text-text-secondary text-xs font-medium">Source base_id</p>
                    <p className="truncate font-mono text-xs">{backup.source_base_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-text-secondary text-xs font-medium">Trigger</p>
                  <p className="text-sm">{backup.trigger}</p>
                </div>
              </div>

              <div className="bg-warning/10 rounded-lg border border-warning/20 p-3">
                <p className="text-warning text-sm">
                  A pre-restore backup of your current base will be created automatically before the restore proceeds.
                </p>
              </div>

              <label className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowBaseReplacement}
                  onChange={(event) => setAllowBaseReplacement(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Allow replacing the current base even if this snapshot belongs to a different
                  base identity.
                </span>
              </label>

              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <div className="flex items-center justify-end gap-2">
            {result ? (
              <button
                type="button"
                onClick={onRestored}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isRestoring}
                  className="border-border hover:bg-menu-hover-bg rounded-md border px-4 py-1.5 text-sm transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleRestore()}
                  disabled={isRestoring}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isRestoring ? "Restoring…" : "Restore"}
                </button>
              </>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
