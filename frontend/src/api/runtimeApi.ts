import type {
  DataVersion,
  DesktopActivationStatus,
  DesktopEditionMetadata,
  RuntimeSummary,
} from "@/types";
import { bridgeClient } from "@/lib/bridgeClient";

export async function fetchDataVersion(baseUrl: string): Promise<DataVersion> {
  const response = await bridgeClient.get<{ item: DataVersion }>(baseUrl, "/api/data-version");
  return response.item;
}

export async function fetchRuntime(baseUrl: string): Promise<RuntimeSummary> {
  return bridgeClient.get<RuntimeSummary>(baseUrl, "/api/runtime");
}

export async function fetchDesktopEdition(baseUrl: string): Promise<DesktopEditionMetadata> {
  return bridgeClient.get<DesktopEditionMetadata>(baseUrl, "/api/desktop/edition");
}

export async function fetchDesktopActivation(baseUrl: string): Promise<DesktopActivationStatus> {
  return bridgeClient.get<DesktopActivationStatus>(baseUrl, "/api/desktop/activation");
}

export async function activateDesktop(
  baseUrl: string,
  payload: {
    machine_label?: string;
  },
): Promise<DesktopActivationStatus> {
  return bridgeClient.post<DesktopActivationStatus>(
    baseUrl,
    "/api/desktop/activation",
    payload,
  );
}

export async function logoutDesktopActivation(baseUrl: string): Promise<DesktopActivationStatus> {
  return bridgeClient.post<DesktopActivationStatus>(
    baseUrl,
    "/api/desktop/activation/logout",
  );
}

export async function forgetDesktopActivation(baseUrl: string): Promise<DesktopActivationStatus> {
  return bridgeClient.post<DesktopActivationStatus>(
    baseUrl,
    "/api/desktop/activation/forget",
  );
}
