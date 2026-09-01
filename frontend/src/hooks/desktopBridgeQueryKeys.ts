export const DESKTOP_BRIDGE_QUERY_KEYS = {
  bridgeBaseUrl: ["bridge-base-url"] as const,
  sessionBootstrap: (baseUrl: string) => ["session-bootstrap", baseUrl] as const,
  notesTree: (baseUrl: string, sourceKey: string) => ["notes-tree", baseUrl, sourceKey] as const,
};
