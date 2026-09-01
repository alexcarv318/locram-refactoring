function buildJsonSnippet(command: string, args: string[]): string {
  return JSON.stringify(
    {
      mcpServers: {
        locram: {
          command,
          args,
        },
      },
    },
    null,
    2,
  );
}

function buildCodexTomlSnippet(command: string): string {
  return [
    "[mcp_servers.locram]",
    'args = ["serve"]',
    `command = "${command}"`,
    "enabled = true",
  ].join("\n");
}

export function buildDesktopMcpJsonSnippet(launcherPath: string): string {
  return buildJsonSnippet(launcherPath, ["serve"]);
}

export function buildCodexMcpTomlSnippet(launcherPath: string): string {
  return buildCodexTomlSnippet(launcherPath);
}
