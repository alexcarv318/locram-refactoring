import { trackRendererEvent } from "@/api/telemetryApi";
import type {
  TelemetryBaseKind,
  TelemetryModalName,
  TelemetrySettingsTab,
} from "@/api/telemetryApi";

let telemetryConsentGranted = true;

export function setTelemetryConsentGranted(granted: boolean): void {
  telemetryConsentGranted = granted;
}

function shouldTrack(): boolean {
  return telemetryConsentGranted;
}

async function trackEvent(
  baseUrl: string,
  event: string,
  properties?: Record<string, string | number | boolean>,
  identifiers?: Record<string, string>,
): Promise<void> {
  if (!shouldTrack() || baseUrl.length === 0) {
    return;
  }
  try {
    await trackRendererEvent(baseUrl, {
      event,
      properties,
      identifiers,
    });
  } catch {
    return;
  }
}

export function trackSettingsTabOpened(baseUrl: string, tab: TelemetrySettingsTab): void {
  void trackEvent(baseUrl, "settings.tab_opened", { tab });
}

export function trackModalOpened(baseUrl: string, modal: TelemetryModalName): void {
  void trackEvent(baseUrl, "modal.opened", { modal });
}

export function trackModalClosed(
  baseUrl: string,
  modal: TelemetryModalName,
  outcome: "confirmed" | "cancelled",
): void {
  void trackEvent(baseUrl, "modal.closed", { modal, outcome });
}

export function trackBaseSwitched(
  baseUrl: string,
  payload: {
    fromBaseKind: TelemetryBaseKind;
    toBaseKind: TelemetryBaseKind;
    toBaseId: string;
  },
): void {
  void trackEvent(
    baseUrl,
    "base.switched",
    {
      from_base_kind: payload.fromBaseKind,
      to_base_kind: payload.toBaseKind,
      switch_source: "ui_switch",
    },
    {
      to_base_id: payload.toBaseId,
    },
  );
}
