import { bridgeClient } from "@/lib/bridgeClient";
import type { AttachmentSummary } from "@/types";

export async function fetchAttachment(baseUrl: string, filename: string): Promise<AttachmentSummary> {
  const payload = await bridgeClient.get<{ item: AttachmentSummary }>(
    baseUrl,
    `/api/attachments/${encodeURIComponent(filename)}`,
  );
  return payload.item;
}

export async function saveAttachment(
  baseUrl: string,
  payload: { data_b64: string; filename: string },
): Promise<AttachmentSummary> {
  const json = await bridgeClient.post<{ item: AttachmentSummary }>(
    baseUrl,
    "/api/attachments",
    payload,
  );
  return json.item;
}

export async function renderMermaidAttachment(
  baseUrl: string,
  payload: { diagram: string; name: string; output_format?: "png" | "svg" },
): Promise<AttachmentSummary> {
  const json = await bridgeClient.post<{ item: AttachmentSummary }>(
    baseUrl,
    "/api/attachments/render-mermaid",
    payload,
  );
  return json.item;
}

export function getAttachmentUrl(baseUrl: string, filename: string): string {
  return `${baseUrl}/api/attachments/${encodeURIComponent(filename)}/raw`;
}
