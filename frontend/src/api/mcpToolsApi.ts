import { bridgeClient } from "@/lib/bridgeClient";
import type { McpToolVisibilitySettings } from "@/types";

export function fetchMcpToolVisibility(baseUrl: string): Promise<McpToolVisibilitySettings> {
  return bridgeClient.get<McpToolVisibilitySettings>(baseUrl, "/api/desktop/mcp-tools");
}

export function updateMcpToolVisibility(
  baseUrl: string,
  enabledGroups: Record<string, boolean>,
): Promise<McpToolVisibilitySettings> {
  return bridgeClient.patch<McpToolVisibilitySettings>(baseUrl, "/api/desktop/mcp-tools", {
    enabledGroups,
  });
}
