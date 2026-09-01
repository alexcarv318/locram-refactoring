import { bridgeClient } from "@/lib/bridgeClient";
import type { DesktopUserSettings } from "@/types";

export function fetchDesktopUserSettings(baseUrl: string): Promise<DesktopUserSettings> {
  return bridgeClient.get<DesktopUserSettings>(baseUrl, "/api/desktop/user-settings");
}

export function updateDesktopUserSettings(
  baseUrl: string,
  patch: {
    noteLanguageName?: string;
  },
): Promise<DesktopUserSettings> {
  return bridgeClient.patch<DesktopUserSettings>(baseUrl, "/api/desktop/user-settings", patch);
}
