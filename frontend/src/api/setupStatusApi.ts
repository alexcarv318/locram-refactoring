import { bridgeClient } from "@/lib/bridgeClient";

export type DesktopSetupStatus = {
  first_run_complete: boolean;
  bootstrap_complete: boolean;
  embedding_runtime_phase: string;
  embedding_runtime_last_error: string | null;
  embedding_runtime_detail: string | null;
  embedding_runtime_attempt_count: number;
  background_service_health?: "ready" | "pending_repair" | "degraded";
  background_operation?: {
    phase: "idle" | "scheduled" | "running";
    operation_id: string | null;
    operation_kind: string | null;
    component: string | null;
    started_at: string | null;
    updated_at: string | null;
  };
  background_services?: Record<
    string,
    {
      registration_state: string;
      readiness_state: string;
      attempt_count: number;
      last_error_code: string | null;
      last_error_detail: string | null;
      evidence_summary?: string | null;
    }
  >;
  embeddings_usable: boolean;
  embed_provider: string;
  embed_model: string;
  ollama_available: boolean;
  embed_model_ready: boolean;
  http_mcp_background_service: boolean;
  embed_runner_background_service: boolean;
  desktop_mcp_launcher: boolean;
  desktop_mcp_launcher_path: string;
  locram_home: string;
};

export async function fetchDesktopSetupStatus(
  baseUrl: string,
): Promise<DesktopSetupStatus> {
  return bridgeClient.get<DesktopSetupStatus>(baseUrl, "/api/setup-status");
}
