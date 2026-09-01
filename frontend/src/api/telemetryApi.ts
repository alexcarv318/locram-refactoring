import { bridgeClient } from "@/lib/bridgeClient";

export type TelemetrySettingsTab = "general" | "account" | "mcp" | "privacy" | "bases" | "appearance";

export type TelemetryModalName =
  | "register_existing_base"
  | "mcp_install"
  | "share_invite"
  | "confirm_delete_base"
  | "activation_transfer";

export type TelemetryBaseKind = "local" | "managed" | "shared";

export type TrackRendererEventPayload = {
  event: string;
  properties?: Record<string, string | number | boolean>;
  identifiers?: Record<string, string>;
};

export async function trackRendererEvent(
  baseUrl: string,
  payload: TrackRendererEventPayload,
): Promise<{ status: string }> {
  return bridgeClient.post<{ status: string }>(
    baseUrl,
    "/api/desktop/analytics/track",
    payload,
  );
}
