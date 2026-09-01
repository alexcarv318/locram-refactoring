import { bridgeClient } from "@/lib/bridgeClient";
import type {
  AccessRecoverResult,
  AccessIdentitySummary,
  AccessRuntimeResult,
  AccessSummary,
  ConnectedOAuthSession,
  PendingAuthorizationRequest,
  ResolvedBaseShareSession,
} from "@/types";

export async function fetchAccessSummary(baseUrl: string): Promise<AccessSummary> {
  const json = await bridgeClient.get<{ item: AccessSummary }>(baseUrl, "/api/access");
  return json.item;
}

export async function fetchAccessIdentity(baseUrl: string): Promise<AccessIdentitySummary> {
  const json = await bridgeClient.get<{ item: AccessIdentitySummary }>(
    baseUrl,
    "/api/access/identity",
  );
  return json.item;
}

export async function enrollAccess(
  baseUrl: string,
  payload: {
    redemption_code: string;
    broker_base_url?: string;
    machine_label?: string;
  },
): Promise<AccessSummary> {
  const json = await bridgeClient.post<{ item: AccessSummary }>(baseUrl, "/api/access/enroll", payload);
  return json.item;
}

export async function connectAccess(
  baseUrl: string,
): Promise<{ status: AccessSummary["status"]; runtime_result: AccessRuntimeResult }> {
  const json = await bridgeClient.post<{
    item: { status: AccessSummary["status"]; runtime_result: AccessRuntimeResult };
  }>(baseUrl, "/api/access/connect");
  return json.item;
}

export async function reconnectAccess(
  baseUrl: string,
): Promise<{ status: AccessSummary["status"]; runtime_result: AccessRuntimeResult }> {
  const json = await bridgeClient.post<{
    item: { status: AccessSummary["status"]; runtime_result: AccessRuntimeResult };
  }>(baseUrl, "/api/access/reconnect");
  return json.item;
}

export async function disconnectAccess(
  baseUrl: string,
): Promise<{ status: AccessSummary["status"]; runtime_result: { action: string; pid: number | null } }> {
  const json = await bridgeClient.post<{
    item: { status: AccessSummary["status"]; runtime_result: { action: string; pid: number | null } };
  }>(baseUrl, "/api/access/disconnect");
  return json.item;
}

export async function recoverAccess(baseUrl: string): Promise<AccessRecoverResult> {
  const json = await bridgeClient.post<{ item: AccessRecoverResult }>(baseUrl, "/api/access/recover");
  return json.item;
}

export async function fetchPendingAuthorizations(
  baseUrl: string,
): Promise<PendingAuthorizationRequest[]> {
  const json = await bridgeClient.get<{ items: PendingAuthorizationRequest[] }>(
    baseUrl,
    "/api/access/pending-authorizations",
  );
  return json.items;
}

export async function approvePendingAuthorization(
  baseUrl: string,
  requestId: string,
): Promise<Record<string, unknown>> {
  const json = await bridgeClient.post<{ item: Record<string, unknown> }>(
    baseUrl,
    `/api/access/pending-authorizations/${encodeURIComponent(requestId)}/approve`,
    {},
  );
  return json.item;
}

export async function fetchConnectedOAuthSessions(
  baseUrl: string,
): Promise<ConnectedOAuthSession[]> {
  const json = await bridgeClient.get<{ items: ConnectedOAuthSession[] }>(
    baseUrl,
    "/api/access/connected-sessions",
  );
  return json.items;
}

export async function revokeConnectedOAuthSession(
  baseUrl: string,
  clientId: string,
): Promise<Record<string, unknown>> {
  const json = await bridgeClient.post<{ item: Record<string, unknown> }>(
    baseUrl,
    `/api/access/connected-sessions/${encodeURIComponent(clientId)}/revoke`,
    {},
  );
  return json.item;
}

export async function revokeAllConnectedOAuthSessions(
  baseUrl: string,
): Promise<Record<string, unknown>> {
  const json = await bridgeClient.post<{ item: Record<string, unknown> }>(
    baseUrl,
    "/api/access/connected-sessions/revoke-all",
    {},
  );
  return json.item;
}

export async function resolveBaseShareSession(
  baseUrl: string,
  payload: {
    input: string;
    expectedBrokerBaseUrl?: string;
  },
): Promise<ResolvedBaseShareSession> {
  const json = await bridgeClient.post<{ item: ResolvedBaseShareSession }>(
    baseUrl,
    "/api/access/base-share-sessions/resolve",
    {
      input: payload.input,
      expected_broker_base_url: payload.expectedBrokerBaseUrl,
    },
  );
  return json.item;
}
