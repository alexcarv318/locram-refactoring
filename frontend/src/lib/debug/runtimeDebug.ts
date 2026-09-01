type RuntimeDebugPayload = Record<string, unknown>;

const DEFAULT_DEV_BRIDGE_BASE_URL = "http://127.0.0.1:8756";

declare global {
  interface Window {
    __LOCRAM_RUNTIME_DEBUG__?: Array<{
      channel: string;
      payload: RuntimeDebugPayload;
      timestamp: string;
    }>;
  }
}

export function logRuntimeDebug(channel: string, payload: RuntimeDebugPayload): void {
  if (!import.meta.env.DEV) {
    return;
  }

  const entry = {
    channel,
    payload,
    timestamp: new Date().toISOString(),
  };
  window.__LOCRAM_RUNTIME_DEBUG__ = [...(window.__LOCRAM_RUNTIME_DEBUG__ ?? []), entry].slice(-100);
  console.info(`[locram-debug:${channel}]`, entry);
  void fetch(`${resolveRuntimeDebugBaseUrl()}/api/debug/runtime-log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entry),
  }).catch(() => undefined);
}

function resolveRuntimeDebugBaseUrl(): string {
  return (
    import.meta.env.VITE_LOCRAM_BRIDGE_URL_BROWSER ||
    import.meta.env.VITE_LOCRAM_BRIDGE_URL ||
    DEFAULT_DEV_BRIDGE_BASE_URL
  );
}
