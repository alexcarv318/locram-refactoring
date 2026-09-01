import packageJson from "../../package.json";

type DesktopUpdateMetadata = {
  version: string;
  current_version: string;
  notes?: string | null;
  pub_date?: string | null;
  target?: string | null;
};

export type DesktopUpdateInfo = DesktopUpdateMetadata;

export type DesktopReleaseManifest = DesktopUpdateMetadata;

export const BROWSER_FALLBACK_DESKTOP_VERSION = packageJson.version;

function isTauriWebview(): boolean {
  return typeof globalThis !== "undefined" && "__TAURI_INTERNALS__" in globalThis;
}

export function updaterAvailable(): boolean {
  return isTauriWebview();
}

export async function getInstalledDesktopVersion(): Promise<string | null> {
  if (!isTauriWebview()) {
    return null;
  }
  const { getVersion } = await import("@tauri-apps/api/app");
  return getVersion();
}

export async function getPendingDesktopUpdate(): Promise<DesktopUpdateMetadata | null> {
  if (!isTauriWebview()) {
    return null;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DesktopUpdateMetadata | null>("desktop_get_pending_update");
}

export async function getDesktopReleaseChannel(): Promise<string | null> {
  if (!isTauriWebview()) {
    return null;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("desktop_get_release_channel");
}

export async function getDesktopReleaseTarget(): Promise<string | null> {
  if (!isTauriWebview()) {
    return null;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("desktop_get_release_target");
}

export async function getDesktopUpdateEndpoint(): Promise<string | null> {
  if (!isTauriWebview()) {
    return null;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("desktop_get_update_endpoint");
}

export async function checkForDesktopUpdate(): Promise<DesktopUpdateMetadata | null> {
  if (!isTauriWebview()) {
    return null;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DesktopUpdateMetadata | null>("desktop_check_for_updates");
}

export async function fetchLatestDesktopReleaseManifest(
  endpoint: string,
  target: string | null,
): Promise<DesktopReleaseManifest | null> {
  const normalizedEndpoint = endpoint.trim();
  if (!normalizedEndpoint || !isTauriWebview()) {
    return null;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DesktopReleaseManifest | null>("desktop_get_latest_release_manifest", {
    endpoint: normalizedEndpoint,
    target,
  });
}

export async function installPendingDesktopUpdate(): Promise<void> {
  if (!isTauriWebview()) {
    throw new Error("Desktop updater is only available in the packaged desktop app.");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("desktop_install_pending_update");
}
