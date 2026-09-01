import type { ReleaseChannelHistory } from "@/types";

function buildDesktopChannelHistoryUrl(
  latestManifestEndpoint: string,
  channel: string,
  options?: {
    target?: string | null;
    runtime_family?: string | null;
    edition?: string | null;
    platform?: string | null;
    architecture?: string | null;
  },
): string {
  const manifestUrl = new URL(latestManifestEndpoint.trim());
  const pathParts = manifestUrl.pathname.split("/").filter(Boolean);
  const runtimeFamily = options?.runtime_family?.trim() || pathParts[1] || "";
  const explicitPlatform = options?.platform?.trim() || "";
  const explicitArchitecture = options?.architecture?.trim() || "";
  let platformArchitecture = "";
  if (explicitPlatform && explicitArchitecture) {
    platformArchitecture = `${explicitPlatform}-${explicitArchitecture}`;
  } else {
    const targetParts = (options?.target ?? "")
      .trim()
      .split("-")
      .filter((part) => part.length > 0);
    if (targetParts.length >= 2) {
      platformArchitecture = `${targetParts[targetParts.length - 2]}-${targetParts[targetParts.length - 1]}`;
    }
  }
  if (!runtimeFamily || !platformArchitecture) {
    throw new Error("Desktop channel history requires runtime_family and platform-architecture target.");
  }
  manifestUrl.pathname = `/locram/${runtimeFamily}/${channel}/${platformArchitecture}/channel-history.json`;
  manifestUrl.search = "";
  manifestUrl.hash = "";
  return manifestUrl.toString();
}

export async function fetchDesktopChannelReleaseHistory(
  latestManifestEndpoint: string,
  channel: string,
  options?: {
    target?: string | null;
    runtime_family?: string | null;
    edition?: string | null;
    platform?: string | null;
    architecture?: string | null;
  },
): Promise<ReleaseChannelHistory> {
  const historyUrl = buildDesktopChannelHistoryUrl(
    latestManifestEndpoint,
    channel,
    options,
  );
  const response = await fetch(historyUrl, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Could not load desktop channel history (${response.status}).`);
  }
  const payload: unknown = await response.json();
  const item =
    typeof payload === "object" && payload !== null && "item" in payload
      ? (payload as { item?: unknown }).item
      : payload;
  if (!item) {
    throw new Error("Desktop channel history payload is invalid.");
  }
  if (
    typeof item !== "object" ||
    !Array.isArray((item as { release_manifests?: unknown }).release_manifests) ||
    !Array.isArray((item as { publication_records?: unknown }).publication_records)
  ) {
    throw new Error("Desktop channel history payload is invalid.");
  }
  return item as ReleaseChannelHistory;
}
