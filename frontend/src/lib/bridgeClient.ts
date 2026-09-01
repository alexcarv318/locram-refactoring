const DEFAULT_BROWSER_DEV_BRIDGE_CANDIDATES = [
  "http://127.0.0.1:8757",
  "http://127.0.0.1:8756",
];

export class BridgeClientError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "BridgeClientError";
    this.status = status;
    this.payload = payload;
  }
}

function isTauriWebview(): boolean {
  return typeof globalThis !== "undefined" && "__TAURI_INTERNALS__" in globalThis;
}

async function probeBridgeBaseUrl(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 300);
  try {
    const response = await fetch(`${baseUrl}/api/runtime`, {
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function resolveBridgeBaseUrl(): Promise<string> {
  const configuredBaseUrl = import.meta.env.VITE_LOCRAM_BRIDGE_URL;
  const browserOnly = import.meta.env.VITE_LOCRAM_BRIDGE_URL_BROWSER;

  if (isTauriWebview()) {
    if (configuredBaseUrl && import.meta.env.DEV) {
      return configuredBaseUrl;
    }

    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("bridge_base_url");
  }

  if (browserOnly) {
    return browserOnly;
  }

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  for (const candidate of DEFAULT_BROWSER_DEV_BRIDGE_CANDIDATES) {
    if (await probeBridgeBaseUrl(candidate)) {
      return candidate;
    }
  }

  return DEFAULT_BROWSER_DEV_BRIDGE_CANDIDATES[0];
}

type JsonInit = {
  body?: unknown;
  headers?: HeadersInit;
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
};

function readErrorMessage(payload: unknown, status: number): string {
  if (payload !== null && typeof payload === "object") {
    const record = payload as { error?: unknown; detail?: unknown };
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail;
    }
  }
  return `Request failed with ${status}`;
}

async function parseResponseJson<T>(response: Response): Promise<T> {
  let payload: (T & { error?: string }) | null = null;

  try {
    payload = (await response.json()) as T & { error?: string };
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new BridgeClientError(
      readErrorMessage(payload, response.status),
      response.status,
      payload,
    );
  }

  return (payload ?? {}) as T;
}

async function requestJson<T>(baseUrl: string, path: string, init?: JsonInit): Promise<T> {
  const url = `${baseUrl}${path}`;

  if (!init) {
    const response = await fetch(url);
    return parseResponseJson<T>(response);
  }

  const { body, headers, method } = init;
  const requestInit: RequestInit = {};

  if (method && method !== "GET") {
    requestInit.method = method;
  }

  if (headers) {
    requestInit.headers = headers;
  }

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
    requestInit.headers = {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    };
  }

  const response =
    Object.keys(requestInit).length === 0 ? await fetch(url) : await fetch(url, requestInit);

  return parseResponseJson<T>(response);
}

export const bridgeClient = {
  delete<T>(baseUrl: string, path: string, headers?: HeadersInit) {
    return requestJson<T>(baseUrl, path, { headers, method: "DELETE" });
  },
  get<T>(baseUrl: string, path: string, headers?: HeadersInit) {
    return requestJson<T>(baseUrl, path, headers ? { headers } : undefined);
  },
  post<T>(baseUrl: string, path: string, body?: unknown, headers?: HeadersInit) {
    return requestJson<T>(
      baseUrl,
      path,
      body === undefined ? { headers, method: "POST" } : { body, headers, method: "POST" },
    );
  },
  patch<T>(baseUrl: string, path: string, body?: unknown, headers?: HeadersInit) {
    return requestJson<T>(
      baseUrl,
      path,
      body === undefined ? { headers, method: "PATCH" } : { body, headers, method: "PATCH" },
    );
  },
  put<T>(baseUrl: string, path: string, body?: unknown, headers?: HeadersInit) {
    return requestJson<T>(
      baseUrl,
      path,
      body === undefined ? { headers, method: "PUT" } : { body, headers, method: "PUT" },
    );
  },
};
