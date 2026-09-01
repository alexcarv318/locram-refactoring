import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const CANONICAL_LINK_RE = /\[\[([A-Z0-9]{26})\|([^\[\]]+?)\]\]/g;
const CANONICAL_MARKDOWN_LINK_RE = /\[([^\]]+?)\]\(locram:([A-Z0-9]{26})\)/g;
const ATTACHMENT_EMBED_RE = /!\[\[([^\[\]|]+?)(?:\|(\d+))?\]\]/g;

const turndown = new TurndownService({
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  headingStyle: "atx",
});

turndown.use(gfm);
turndown.addRule("locramAttachmentEmbed", {
  filter(node: unknown) {
    return node instanceof HTMLElement && node.nodeName === "IMG" && Boolean(extractAttachment(node));
  },
  replacement(_content: string, node: unknown) {
    if (!(node instanceof HTMLElement)) {
      return "";
    }
    const attachment = extractAttachment(node);
    if (!attachment) {
      return "";
    }
    return attachment.width
      ? `![[${attachment.filename}|${attachment.width}]]`
      : `![[${attachment.filename}]]`;
  },
});

marked.setOptions({
  breaks: false,
  gfm: true,
});

export function canonicalLinksToMarkdownLinks(markdown: string): string {
  return markdown.replace(CANONICAL_LINK_RE, (_full, pageId: string, displayTitle: string) => {
    return `[${displayTitle}](locram:${pageId})`;
  });
}

export function markdownLinksToCanonical(markdown: string): string {
  return markdown.replace(
    CANONICAL_MARKDOWN_LINK_RE,
    (_full, displayTitle: string, pageId: string) => `[[${pageId}|${displayTitle}]]`,
  );
}

export function normalizeMarkdownForEditor(markdown: string): string {
  return markdown.trimEnd().replace(/\r\n/g, "\n");
}

export function canonicalizeEditorMarkdown(markdown: string): string {
  const normalizedMarkdown = normalizeMarkdownForEditor(markdown);
  return normalizeMarkdownForEditor(editorHtmlToMarkdown(markdownToEditorHtml(normalizedMarkdown)));
}

export function isEditorMarkdownEquivalent(left: string, right: string): boolean {
  return canonicalizeEditorMarkdown(left) === canonicalizeEditorMarkdown(right);
}

export function markdownToEditorHtml(
  markdown: string,
  options?: { attachmentUrl?: (filename: string) => string },
): string {
  const bridgedMarkdown = attachmentEmbedsToHtml(
    canonicalLinksToMarkdownLinks(markdown),
    options?.attachmentUrl,
  );
  return marked.parse(bridgedMarkdown) as string;
}

export function editorHtmlToMarkdown(html: string): string {
  const markdown = turndown.turndown(prepareEditorHtmlForTurndown(html));
  return markdownLinksToCanonical(markdown)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

function prepareEditorHtmlForTurndown(html: string): string {
  if (!html.includes("<table")) {
    return html;
  }

  const container = document.createElement("div");
  container.innerHTML = html;

  container.querySelectorAll("colgroup").forEach((element) => element.remove());
  container.querySelectorAll("table").forEach((table) => {
    table.removeAttribute("style");
  });
  container.querySelectorAll("th, td").forEach((cell) => {
    if (cell.getAttribute("colspan") === "1") {
      cell.removeAttribute("colspan");
    }
    if (cell.getAttribute("rowspan") === "1") {
      cell.removeAttribute("rowspan");
    }

    const paragraph = cell.querySelector(":scope > p:only-child");
    if (paragraph instanceof HTMLParagraphElement) {
      cell.innerHTML = paragraph.innerHTML;
    }
  });

  return container.innerHTML;
}

function attachmentEmbedsToHtml(
  markdown: string,
  attachmentUrl?: (filename: string) => string,
): string {
  return markdown.replace(ATTACHMENT_EMBED_RE, (_full, filename: string, width: string | undefined) => {
    const safeFilename = filename.trim();
    if (!safeFilename) {
      return "";
    }
    const resolvedUrl = attachmentUrl ? attachmentUrl(safeFilename) : safeFilename;
    const escapedFilename = escapeHtmlAttribute(safeFilename);
    const escapedUrl = escapeHtmlAttribute(resolvedUrl);
    const widthAttribute = width ? ` width="${escapeHtmlAttribute(width)}"` : "";
    return `<img src="${escapedUrl}" alt="${escapedFilename}" data-locram-attachment="${escapedFilename}"${widthAttribute} />`;
  });
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractAttachment(node: HTMLElement): { filename: string; width: number | null } | null {
  const explicit = node.getAttribute("data-locram-attachment");
  const width = extractAttachmentWidth(node);
  if (explicit) {
    return { filename: explicit, width };
  }

  const src = node.getAttribute("src");
  if (!src) {
    return null;
  }

  try {
    const parsed = new URL(src, "http://locram.local");
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (
      segments.length >= 4 &&
      segments[0] === "api" &&
      segments[1] === "attachments" &&
      segments[3] === "raw"
    ) {
      return { filename: decodeURIComponent(segments[2]), width };
    }
  } catch {
    return null;
  }

  return null;
}

function extractAttachmentWidth(node: HTMLElement): number | null {
  const rawWidth = node.getAttribute("width");
  if (!rawWidth) {
    return null;
  }
  const numericWidth = Number(rawWidth);
  return Number.isFinite(numericWidth) && numericWidth > 0 ? Math.round(numericWidth) : null;
}
