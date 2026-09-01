import type { DesktopActivationStatus } from "@/types";

export type RuntimeManagedConfidence =
  | "confirmed-managed"
  | "probably-managed"
  | "unverified"
  | "stale-managed"
  | "foreign-conflict"
  | "unknown";

export type RuntimeDiagnosticDetail = {
  kind: "pid" | "port" | "managed_service";
  value: string;
};

export type RuntimeObservedProcess = {
  pid: number;
  command: string;
  relation: "listener" | "parent" | string;
  runtime_home: string | null;
};

export type RuntimeDiagnosticItem = {
  category: "service" | "dependency";
  kind: string;
  label: string;
  state: string;
  managed_confidence: RuntimeManagedConfidence;
  show_managed_confidence: boolean;
  summary_identity: string;
  details: RuntimeDiagnosticDetail[];
  observed_processes: RuntimeObservedProcess[];
  pid: number | null;
  port: number | null;
  identity: string;
  managed_service_identity: string | null;
  managed_service_active: boolean | null;
  last_error: string | null;
};

export type DesktopRuntimeDiagnostics = {
  overall_state: string;
  operable: boolean;
  conflict_exists: boolean;
  embedding_dependencies_ready: boolean;
  embed_provider: string;
  embed_model: string;
  items: RuntimeDiagnosticItem[];
};

export type DesktopBuildProvenance = {
  source_git_sha: string;
  runtime_build_id: string | null;
  runtime_home: string;
};

export type DesktopRuntimeActionResult = {
  action: string;
  message: string;
  diagnostics: DesktopRuntimeDiagnostics;
};

function isTauriWebview(): boolean {
  return typeof globalThis !== "undefined" && "__TAURI_INTERNALS__" in globalThis;
}

export function runtimeDiagnosticsAvailable(): boolean {
  return isTauriWebview();
}

export function activationGainedManagedPublicMcpCapability(
  previous: DesktopActivationStatus | undefined,
  next: DesktopActivationStatus,
): boolean {
  return (
    next.usableCapabilities.managedPublicMcp === true &&
    previous?.usableCapabilities.managedPublicMcp !== true
  );
}

export function logActivationAutoRepairFailure(
  source: "account_gate" | "settings_panel",
  error: unknown,
): void {
  console.warn(
    "[desktop activation] automatic runtime repair failed after managedPublicMcp capability gain",
    { source, error },
  );
}

export async function fetchDesktopRuntimeDiagnostics(
  forceRefresh = false,
): Promise<DesktopRuntimeDiagnostics | null> {
  if (!isTauriWebview()) {
    return null;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DesktopRuntimeDiagnostics>("desktop_get_runtime_diagnostics", {
    forceRefresh,
  });
}

export async function fetchDesktopBuildProvenance(): Promise<DesktopBuildProvenance | null> {
  if (!isTauriWebview()) {
    return null;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DesktopBuildProvenance>("desktop_get_build_provenance");
}

export async function stopDesktopRuntimeServices(): Promise<DesktopRuntimeActionResult> {
  if (!isTauriWebview()) {
    throw new Error("Runtime diagnostics are only available in the packaged desktop app.");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DesktopRuntimeActionResult>("desktop_stop_runtime_services");
}

export async function restartDesktopRuntimeServices(): Promise<DesktopRuntimeActionResult> {
  if (!isTauriWebview()) {
    throw new Error("Runtime diagnostics are only available in the packaged desktop app.");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DesktopRuntimeActionResult>("desktop_restart_runtime_services");
}

export async function repairDesktopRuntimeServices(): Promise<DesktopRuntimeActionResult> {
  if (!isTauriWebview()) {
    throw new Error("Runtime diagnostics are only available in the packaged desktop app.");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DesktopRuntimeActionResult>("desktop_repair_runtime_services");
}
