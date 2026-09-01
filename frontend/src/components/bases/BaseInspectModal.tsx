import { useEffect, useState } from "react";
import { LuX } from "react-icons/lu";

import {
  executeMerge,
  fetchMergePlan,
  inspectArtifact,
  registerBase,
  replaceActiveBase,
} from "@/api/baseManagementApi";
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
import type { ArtifactInspection, MergePlanSummary } from "@/types";

type ActionStep =
  | { kind: "idle" }
  | { kind: "merge_planning" }
  | { kind: "merge_plan_ready"; plan: MergePlanSummary }
  | { kind: "merge_executing" }
  | { kind: "merge_done"; inserted: number; links: number; backup: string }
  | { kind: "register_pending" }
  | { kind: "register_done"; display_name: string }
  | { kind: "replace_pending" }
  | { kind: "replace_done"; display_name: string };

interface BaseInspectModalProps {
  path: string;
  baseUrl: string;
  freeReplaceEnabled?: boolean;
  onClose: () => void;
  onRegistered?: () => void;
  onMerged?: () => void;
  onReplaced?: () => void;
}

export default function BaseInspectModal({
  path,
  baseUrl,
  freeReplaceEnabled = false,
  onClose,
  onRegistered,
  onMerged,
  onReplaced,
}: BaseInspectModalProps) {
  const [result, setResult] = useState<ArtifactInspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [actionStep, setActionStep] = useState<ActionStep>({ kind: "idle" });
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setInspectError(null);
    inspectArtifact(baseUrl, path)
      .then(setResult)
      .catch((err: unknown) => {
        setInspectError(err instanceof Error ? err.message : "Inspection failed");
      })
      .finally(() => setIsLoading(false));
  }, [baseUrl, path]);

  async function handleMergePlan() {
    setActionStep({ kind: "merge_planning" });
    setActionError(null);
    try {
      const plan = await fetchMergePlan(baseUrl, path);
      setActionStep({ kind: "merge_plan_ready", plan });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Merge plan failed");
      setActionStep({ kind: "idle" });
    }
  }

  async function handleMergeExecute() {
    setActionStep({ kind: "merge_executing" });
    setActionError(null);
    try {
      const outcome = await executeMerge(baseUrl, path);
      setActionStep({
        kind: "merge_done",
        inserted: outcome.inserted_page_count,
        links: outcome.inserted_link_count,
        backup: outcome.backup_filename,
      });
      onMerged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Merge failed");
      setActionStep({ kind: "idle" });
    }
  }

  async function handleRegister() {
    setActionStep({ kind: "register_pending" });
    setActionError(null);
    try {
      const displayName = result?.package_label ?? undefined;
      const entry = await registerBase(baseUrl, { path, display_name: displayName, activate: false });
      setActionStep({ kind: "register_done", display_name: entry.display_name });
      onRegistered?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Registration failed");
      setActionStep({ kind: "idle" });
    }
  }

  async function handleReplaceActiveBase() {
    setActionStep({ kind: "replace_pending" });
    setActionError(null);
    try {
      const entry = await replaceActiveBase(baseUrl, path);
      setActionStep({ kind: "replace_done", display_name: entry.display_name });
      onReplaced?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Replace failed");
      setActionStep({ kind: "idle" });
    }
  }

  const canRegister =
    !freeReplaceEnabled && (result?.valid_actions.includes("register_as_base") ?? false);
  const canReplaceFree =
    freeReplaceEnabled &&
    result?.artifact_class === "ordinary_base" &&
    result.compatibility === "ready";
  const canMerge = result?.valid_actions.includes("merge_into_active") ?? false;
  const isCompatible = result?.compatibility === "ready";

  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }}>
      <ModalContent className="flex h-auto max-h-[90vh] max-w-2xl flex-col">
        <ModalHeader>
          <div className="flex flex-col gap-0.5">
            <ModalTitle>Inspect Artifact</ModalTitle>
            <ModalDescription className="truncate font-mono text-xs">{path}</ModalDescription>
            <ModalDescription className="text-xs">
              This dialog now stays focused on registration and merge workflows. Registered bases keep
              their common summary in BaseHome.
            </ModalDescription>
          </div>
          <ModalCloseButton>
            <LuX className="h-4 w-4" />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody className="overflow-y-auto p-4">
          {isLoading && (
            <p className="text-text-secondary py-8 text-center text-sm">Inspecting…</p>
          )}
          {inspectError && (
            <p className="text-destructive py-4 text-sm">{inspectError}</p>
          )}
          {result && !isLoading && (
            <div className="space-y-4">
              <div className="bg-panel-background rounded-lg border p-3">
                <p className="text-text-secondary mb-1 text-xs font-semibold uppercase tracking-wider">
                  Action Context
                </p>
                <p className="text-sm">{result.summary}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <InspectField label="Artifact Class" value={result.artifact_class} />
                  <InspectField label="Compatibility" value={result.compatibility} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InspectField
                  label="Pages"
                  value={
                    result.active_page_count !== null && result.active_page_count !== undefined
                      ? result.active_page_count !== result.page_count
                        ? `${result.active_page_count} active / ${result.page_count} total`
                        : `${result.active_page_count} active`
                      : String(result.page_count)
                  }
                />
                <InspectField label="Links" value={String(result.link_count)} />
                {result.base_id ? <InspectField label="Base ID" value={result.base_id} mono /> : null}
                {result.artifact_id ? <InspectField label="Artifact ID" value={result.artifact_id} mono /> : null}
                {result.source_base_id ? <InspectField label="Source Base ID" value={result.source_base_id} mono /> : null}
                {result.created_at ? <InspectField label="Created" value={result.created_at} /> : null}
                {result.attachment_coverage_label ? (
                  <InspectField label="Attachment Coverage" value={result.attachment_coverage_label} />
                ) : null}
                {result.package_label ? <InspectField label="Package Label" value={result.package_label} /> : null}
              </div>

              {result.errors.length > 0 && (
                <div>
                  <p className="text-destructive mb-1 text-xs font-semibold uppercase tracking-wider">Errors</p>
                  <ul className="space-y-1">
                    {result.errors.map((err, index) => (
                      <li key={index} className="text-destructive text-sm">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.provenance_summary ? (
                <div>
                  <p className="text-text-secondary mb-1 text-xs font-semibold uppercase tracking-wider">Provenance</p>
                  <p className="text-text-secondary text-sm">{result.provenance_summary}</p>
                </div>
              ) : null}

              {actionStep.kind === "merge_plan_ready" && (
                <MergePlanCard plan={actionStep.plan} />
              )}

              {actionStep.kind === "merge_done" && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 space-y-1">
                  <p className="text-sm font-semibold text-green-600">Merge complete</p>
                  <p className="text-text-secondary text-xs">
                    {actionStep.inserted} pages and {actionStep.links} links inserted.
                  </p>
                  {actionStep.backup && (
                    <p className="text-text-secondary font-mono text-xs truncate">
                      Pre-merge backup: {actionStep.backup}
                    </p>
                  )}
                </div>
              )}

              {actionStep.kind === "register_done" && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                  <p className="text-sm font-semibold text-green-600">
                    Registered as base "{actionStep.display_name}"
                  </p>
                  <p className="text-text-secondary text-xs mt-0.5">
                    Switch to it from the Sources panel to start using it.
                  </p>
                </div>
              )}

              {actionStep.kind === "replace_done" && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                  <p className="text-sm font-semibold text-green-600">
                    Replaced active base with "{actionStep.display_name}"
                  </p>
                  <p className="text-text-secondary text-xs mt-0.5">
                    Notes and graph now follow this base as the single local authority.
                  </p>
                </div>
              )}

              {actionError && (
                <p className="text-destructive rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-sm">
                  {actionError}
                </p>
              )}
            </div>
          )}
        </ModalBody>

        {result && !isLoading && (
          <ModalFooter>
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                {canReplaceFree && actionStep.kind !== "replace_done" && (
                  <button
                    type="button"
                    onClick={() => void handleReplaceActiveBase()}
                    disabled={actionStep.kind === "replace_pending"}
                    className="bg-menu-active-bg text-menu-active-fg rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {actionStep.kind === "replace_pending"
                      ? "Replacing…"
                      : "Replace Current Base"}
                  </button>
                )}
                {canRegister && actionStep.kind !== "register_done" && (
                  <button
                    type="button"
                    onClick={() => void handleRegister()}
                    disabled={actionStep.kind === "register_pending"}
                    className="border-border hover:bg-menu-hover-bg rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
                  >
                    {actionStep.kind === "register_pending" ? "Registering…" : "Register as Base"}
                  </button>
                )}
                {canMerge && !["merge_done", "merge_executing", "merge_plan_ready", "merge_planning"].includes(actionStep.kind) && (
                  <button
                    type="button"
                    onClick={() => void handleMergePlan()}
                    disabled={!isCompatible}
                    title={!isCompatible ? "Artifact is not compatible for merge" : undefined}
                    className="border-border hover:bg-menu-hover-bg rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
                  >
                    {actionStep.kind === "merge_planning" ? "Loading plan…" : "Merge into Active"}
                  </button>
                )}
                {actionStep.kind === "merge_plan_ready" && (
                  <button
                    type="button"
                    onClick={() => void handleMergeExecute()}
                    className="bg-menu-active-bg text-menu-active-fg rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  >
                    Confirm Merge
                  </button>
                )}
                {actionStep.kind === "merge_plan_ready" && (
                  <button
                    type="button"
                    onClick={() => setActionStep({ kind: "idle" })}
                    className="border-border hover:bg-menu-hover-bg rounded-md border px-3 py-1.5 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                )}
                {actionStep.kind === "merge_executing" && (
                  <button
                    type="button"
                    disabled
                    className="border-border rounded-md border px-3 py-1.5 text-sm opacity-50"
                  >
                    Merging…
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="border-border hover:bg-menu-hover-bg rounded-md border px-3 py-1.5 text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}

interface MergePlanCardProps {
  plan: MergePlanSummary;
}

function MergePlanCard({ plan }: MergePlanCardProps) {
  const hasConflicts = plan.blocked_conflict_count > 0;
  const hasDuplicateCandidates = plan.duplicate_candidate_count > 0;
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Merge Plan</p>
      <p className="text-sm">
        Merging into <span className="font-medium">{plan.target_display_name}</span>
      </p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <StatCell label="New pages" value={plan.new_page_count} />
        <StatCell label="New links" value={plan.new_link_count} />
        <StatCell label="Already present" value={plan.already_present_count} />
        <StatCell label="Incoming" value={plan.incoming_page_count} />
        <StatCell label="Duplicate candidates" value={plan.duplicate_candidate_count} warn={plan.duplicate_candidate_count > 0} />
        <StatCell label="Conflicts" value={plan.blocked_conflict_count} warn={hasConflicts} />
      </div>
      {plan.provenance_coverage_summary && (
        <p className="text-text-secondary text-xs">{plan.provenance_coverage_summary}</p>
      )}
      {hasDuplicateCandidates && (
        <div className="space-y-1">
          <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
            Duplicate Candidates
          </p>
          <div className="space-y-1">
            {plan.duplicate_candidates.map((candidate) => (
              <div key={`${candidate.source_page_id}:${candidate.target_page_id}`} className="bg-panel-background rounded-md border p-2">
                <p className="text-sm font-medium">{candidate.source_title}</p>
                <p className="text-text-secondary text-xs">
                  Similar to existing page <span className="font-medium">{candidate.target_title}</span>
                </p>
                <p className="text-text-secondary text-xs">{candidate.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {hasConflicts && (
        <div className="space-y-1">
          <p className="text-warning text-xs font-semibold uppercase tracking-wider">
            Blocked Conflicts
          </p>
          <div className="space-y-1">
            {plan.blocked_conflicts.map((conflict) => (
              <div key={conflict.page_id} className="rounded-md border border-warning/30 bg-warning/10 p-2">
                <p className="text-sm font-medium">{conflict.title}</p>
                <p className="text-warning text-xs">{conflict.reason}</p>
              </div>
            ))}
          </div>
          <p className="text-warning text-xs">
            {plan.blocked_conflict_count} conflict(s) will be skipped during merge.
          </p>
        </div>
      )}
    </div>
  );
}

interface StatCellProps {
  label: string;
  value: number;
  warn?: boolean;
}

function StatCell({ label, value, warn = false }: StatCellProps) {
  return (
    <div className="bg-panel-background rounded-md border p-2">
      <p className="text-text-secondary text-xs">{label}</p>
      <p className={`font-semibold text-sm ${warn && value > 0 ? "text-warning" : ""}`}>{value}</p>
    </div>
  );
}

interface InspectFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

function InspectField({ label, value, mono = false }: InspectFieldProps) {
  return (
    <div className="bg-panel-background rounded-lg border p-2.5">
      <p className="text-text-secondary mb-0.5 text-xs font-medium">{label}</p>
      <p className={mono ? "truncate font-mono text-xs" : "text-sm"}>{value}</p>
    </div>
  );
}
