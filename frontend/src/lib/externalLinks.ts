function isTauriWebview(): boolean {
  return typeof globalThis !== "undefined" && "__TAURI_INTERNALS__" in globalThis;
}

function openWithWindow(url: string): boolean {
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export async function openExternalUrl(url: string): Promise<boolean> {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return false;
  }
  if (isTauriWebview()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("desktop_open_external_url", { url: normalizedUrl });
      return true;
    } catch {
      return openWithWindow(normalizedUrl);
    }
  }
  return openWithWindow(normalizedUrl);
}
