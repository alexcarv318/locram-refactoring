const FTS_HIGHLIGHT_OPEN = "\u0000B\u0000";
const FTS_HIGHLIGHT_CLOSE = "\u0000/B\u0000";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeFtsSnippetHtml(snippet: string): string {
  const withPlaceholders = snippet
    .replace(/<\s*b\s*>/gi, FTS_HIGHLIGHT_OPEN)
    .replace(/<\s*\/\s*b\s*>/gi, FTS_HIGHLIGHT_CLOSE);
  const escaped = escapeHtml(withPlaceholders);
  return escaped
    .split(FTS_HIGHLIGHT_OPEN)
    .join("<b>")
    .split(FTS_HIGHLIGHT_CLOSE)
    .join("</b>");
}
