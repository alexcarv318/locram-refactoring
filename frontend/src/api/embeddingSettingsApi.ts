import { bridgeClient } from "@/lib/bridgeClient";

export type EmbeddingProvider = "locram_hosted" | "huggingface" | "ollama";

export type EmbeddingRuntimePreferences = {
  provider: EmbeddingProvider;
  model: string;
  ollama_url: string;
  ollama_bin: string | null;
  ollama_models_path: string | null;
  auto_embed: boolean;
  hosted_url: string;
  huggingface_api_key_configured: boolean;
};

export type EmbeddingSettingsPatch = {
  provider?: EmbeddingProvider;
  model?: string;
  ollamaUrl?: string;
  ollamaBin?: string | null;
  ollamaModelsPath?: string | null;
  autoEmbed?: boolean;
  huggingfaceApiKey?: string;
  clearHuggingfaceApiKey?: boolean;
};

export type HuggingFaceValidationResult = {
  provider: string;
  model: string;
  dimension: number;
};

export type EmbeddingBootstrapResult = {
  status_lines: string[];
};

type ItemEnvelope<T> = {
  item: T;
};

export function embeddingSettingsQueryKey(baseUrl: string) {
  return ["embedding-settings", baseUrl] as const;
}

export async function fetchEmbeddingSettings(
  baseUrl: string,
): Promise<EmbeddingRuntimePreferences> {
  const response = await bridgeClient.get<ItemEnvelope<EmbeddingRuntimePreferences>>(
    baseUrl,
    "/api/desktop/embedding-settings",
  );
  return response.item;
}

export async function updateEmbeddingSettings(
  baseUrl: string,
  patch: EmbeddingSettingsPatch,
): Promise<EmbeddingRuntimePreferences> {
  const response = await bridgeClient.patch<ItemEnvelope<EmbeddingRuntimePreferences>>(
    baseUrl,
    "/api/desktop/embedding-settings",
    patch,
  );
  return response.item;
}

export async function validateHuggingFaceEmbeddingSettings(
  baseUrl: string,
  options?: { huggingfaceApiKey?: string },
): Promise<HuggingFaceValidationResult> {
  const body =
    options?.huggingfaceApiKey !== undefined
      ? { huggingfaceApiKey: options.huggingfaceApiKey }
      : undefined;
  const response = await bridgeClient.post<ItemEnvelope<HuggingFaceValidationResult>>(
    baseUrl,
    "/api/desktop/embedding-settings/validate",
    body,
  );
  return response.item;
}

export async function bootstrapEmbeddingSettings(
  baseUrl: string,
): Promise<EmbeddingBootstrapResult> {
  const response = await bridgeClient.post<ItemEnvelope<EmbeddingBootstrapResult>>(
    baseUrl,
    "/api/desktop/embedding-settings/bootstrap",
  );
  return response.item;
}
