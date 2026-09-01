import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, type Editor as TiptapEditor, useEditor } from "@tiptap/react";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SearchResultItem } from "@/components/popover/PopoverSearchResults";
import { getAttachmentUrl, saveAttachment } from "@/api";
import { openExternalUrl } from "@/lib/externalLinks";

import WikilinkAutocomplete from "./WikilinkAutocomplete";
import { LocramAttachmentImage } from "./LocramAttachmentImage";
import { LocramCodeBlock } from "./LocramCodeBlock";
import {
  isEditorMarkdownEquivalent,
  editorHtmlToMarkdown,
  markdownToEditorHtml,
  normalizeMarkdownForEditor,
} from "./markdownInterop";

type InlineAutocompleteState = {
  from: number;
  left: number;
  open: boolean;
  query: string;
  top: number;
};

const CLOSED_AUTOCOMPLETE: InlineAutocompleteState = {
  from: -1,
  left: 0,
  open: false,
  query: "",
  top: 0,
};

function readEditorMarkdown(activeEditor: TiptapEditor | null | undefined): string | null {
  if (!activeEditor || activeEditor.isDestroyed) {
    return null;
  }

  return normalizeMarkdownForEditor(editorHtmlToMarkdown(activeEditor.getHTML()));
}

type LocramRichEditorProps = {
  baseUrl: string;
  disabled?: boolean;
  fontSize?: number;
  onChange: (value: string) => void;
  onOpenNote: (pageId: string) => void;
  onSave: (value?: string) => Promise<unknown> | unknown;
  placeholder?: string;
  searchItems: SearchResultItem[];
  value: string;
};

export default function LocramRichEditor({
  baseUrl,
  disabled = false,
  fontSize,
  onChange,
  onOpenNote,
  onSave,
  placeholder = "Write a note…",
  searchItems,
  value,
}: LocramRichEditorProps) {
  const [autocomplete, setAutocomplete] = useState<InlineAutocompleteState>(CLOSED_AUTOCOMPLETE);
  const [activeAutocompleteIndex, setActiveAutocompleteIndex] = useState(0);
  const [attachmentError, setAttachmentError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const applyingExternalValueRef = useRef(false);
  const destroyedRef = useRef(false);
  const editorRef = useRef<TiptapEditor | null>(null);
  const latestValueRef = useRef(value);
  const pendingLocalEchoesRef = useRef<string[]>([]);
  const onChangeRef = useRef(onChange);
  const onOpenNoteRef = useRef(onOpenNote);
  const onSaveRef = useRef(onSave);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onOpenNoteRef.current = onOpenNote;
  }, [onOpenNote]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const normalizedValue = useMemo(() => normalizeMarkdownForEditor(value), [value]);
  const attachmentUrl = useCallback(
    (filename: string) => (baseUrl ? getAttachmentUrl(baseUrl, filename) : filename),
    [baseUrl],
  );
  const autocompleteItems = useMemo(() => {
    const query = autocomplete.query.toLowerCase().trim();
    if (query) {
      return searchItems.filter((item) => item.title.toLowerCase().includes(query));
    }
    return searchItems;
  }, [autocomplete.query, searchItems]);

  useEffect(() => {
    setActiveAutocompleteIndex(0);
  }, [autocomplete.query]);

  const insertAttachmentImage = useCallback(
    (activeEditor: TiptapEditor, filename: string, insertAt?: number) => {
      const imageNode = {
        attrs: {
          alt: filename,
          filename,
          src: attachmentUrl(filename),
          title: filename,
        },
        type: "image",
      };

      const chain = activeEditor.chain().focus();
      if (typeof insertAt === "number") {
        chain.insertContentAt(insertAt, imageNode);
      } else {
        chain.insertContent(imageNode);
      }
      chain.run();
    },
    [attachmentUrl],
  );

  const uploadImage = useCallback(
    async (file: File, insertAt?: number) => {
      if (!baseUrl) {
        setAttachmentError("Bridge is not ready yet.");
        return;
      }

      const activeEditor = editorRef.current;
      if (!activeEditor) {
        return;
      }

      setAttachmentError("");
      setIsUploadingImage(true);
      try {
        const filename = buildAttachmentFilename(file);
        const data_b64 = await readFileAsBase64(file);
        const saved = await saveAttachment(baseUrl, { data_b64, filename });
        const targetEditor = editorRef.current;
        if (!targetEditor || targetEditor.isDestroyed) {
          return;
        }
        insertAttachmentImage(
          targetEditor,
          saved.filename,
          targetEditor === activeEditor ? insertAt : undefined,
        );
      } catch (error) {
        setAttachmentError(
          error instanceof Error ? error.message : "Could not save image attachment.",
        );
      } finally {
        setIsUploadingImage(false);
      }
    },
    [baseUrl, insertAttachmentImage],
  );

  const getAutocompleteStateFromEditor = useCallback(
    (activeEditor: NonNullable<ReturnType<typeof useEditor>>): InlineAutocompleteState => {
      const selection = activeEditor.state.selection;
      if (!selection.empty || !wrapperRef.current) {
        return CLOSED_AUTOCOMPLETE;
      }

      const blockStart = selection.$from.start();
      const textBeforeCaret = activeEditor.state.doc.textBetween(
        blockStart,
        selection.from,
        "\n",
        "\0",
      );
      const match = textBeforeCaret.match(/\[\[([^\[\]\n]*)$/);

      if (!match) {
        return CLOSED_AUTOCOMPLETE;
      }

      const coords = activeEditor.view.coordsAtPos(selection.from);
      const bounds = wrapperRef.current.getBoundingClientRect();
      return {
        from: selection.from - match[0].length,
        left: Math.max(8, coords.left - bounds.left),
        open: true,
        query: match[1],
        top: Math.max(8, coords.bottom - bounds.top + 6),
      };
    },
    [],
  );

  const scheduleReactUpdate = useCallback((fn: () => void) => {
    queueMicrotask(() => {
      if (destroyedRef.current) {
        return;
      }
      fn();
    });
  }, []);

  const syncAutocompleteFromEditor = useCallback(
    (activeEditor: NonNullable<ReturnType<typeof useEditor>>) => {
      const nextState = getAutocompleteStateFromEditor(activeEditor);
      scheduleReactUpdate(() => {
        setAutocomplete(nextState);
      });
    },
    [getAutocompleteStateFromEditor, scheduleReactUpdate],
  );

  const rememberLocalEcho = useCallback((markdown: string) => {
    const normalizedMarkdown = normalizeMarkdownForEditor(markdown);
    pendingLocalEchoesRef.current = [
      ...pendingLocalEchoesRef.current.filter((value) => value !== normalizedMarkdown),
      normalizedMarkdown,
    ].slice(-50);
  }, []);

  const consumeLocalEcho = useCallback((markdown: string) => {
    const normalizedMarkdown = normalizeMarkdownForEditor(markdown);
    const index = pendingLocalEchoesRef.current.indexOf(normalizedMarkdown);
    if (index === -1) {
      return false;
    }

    pendingLocalEchoesRef.current.splice(index, 1);
    return true;
  }, []);

  const insertLocramLink = useCallback(
    (
      activeEditor: NonNullable<ReturnType<typeof useEditor>>,
      item: SearchResultItem,
      range?: { from: number; to: number },
    ) => {
      const selection = activeEditor.state.selection;
      const targetRange = range ?? { from: selection.from, to: selection.to };
      activeEditor
        .chain()
        .focus()
        .insertContentAt(targetRange, {
          marks: [
            {
              attrs: {
                href: `locram:${item.id}`,
              },
              type: "link",
            },
          ],
          text: item.title,
          type: "text",
        })
        .run();
      setAutocomplete(CLOSED_AUTOCOMPLETE);
    },
    [],
  );

  const applySpaceShortcut = useCallback(
    (activeEditor: NonNullable<ReturnType<typeof useEditor>>) => {
      const selection = activeEditor.state.selection;
      if (!selection.empty) {
        return false;
      }

      const from = selection.$from.start();
      const to = selection.from;
      const textBeforeCaret = activeEditor.state.doc.textBetween(from, to, "\n", "\0");

      const headingMatch = textBeforeCaret.match(/^(#{1,6})$/);
      if (headingMatch) {
        return activeEditor
          .chain()
          .deleteRange({ from, to })
          .setNode("heading", { level: headingMatch[1].length })
          .run();
      }

      if (/^[-*+]$/.test(textBeforeCaret)) {
        return activeEditor.chain().deleteRange({ from, to }).toggleBulletList().run();
      }

      if (textBeforeCaret === ">") {
        return activeEditor.chain().deleteRange({ from, to }).toggleBlockquote().run();
      }

      if (/^\d+\.$/.test(textBeforeCaret)) {
        return activeEditor.chain().deleteRange({ from, to }).toggleOrderedList().run();
      }

      return false;
    },
    [],
  );

  const applyEnterShortcut = useCallback(
    (activeEditor: NonNullable<ReturnType<typeof useEditor>>) => {
      const selection = activeEditor.state.selection;
      if (!selection.empty) {
        return false;
      }

      const from = selection.$from.start();
      const to = selection.from;
      const textBeforeCaret = activeEditor.state.doc.textBetween(from, to, "\n", "\0");

      if (textBeforeCaret !== "~~~" && textBeforeCaret !== "```") {
        return false;
      }

      return activeEditor.chain().deleteRange({ from, to }).toggleCodeBlock().run();
    },
    [],
  );

  const editor = useEditor({
    content: markdownToEditorHtml(normalizedValue, { attachmentUrl }),
    editable: !disabled,
    onCreate: ({ editor: activeEditor }) => {
      editorRef.current = activeEditor;
    },
    editorProps: {
      attributes: {
        "aria-label": "Edit note content",
        "aria-multiline": "true",
        class:
          "prose max-w-none min-h-full overflow-x-auto px-10 py-3 leading-relaxed focus:outline-none [&_*]:text-foreground/85 [&_strong]:text-foreground [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2",
        dir: "auto",
        role: "textbox",
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return false;
        }

        const locramAnchor = target.closest("a[href^='locram:']");
        if (locramAnchor instanceof HTMLAnchorElement) {
          event.preventDefault();
          const pageId = locramAnchor.href.replace("locram:", "");
          onOpenNoteRef.current(pageId);
          return true;
        }

        const externalAnchor = target.closest("a[href]");
        if (externalAnchor instanceof HTMLAnchorElement) {
          const href = externalAnchor.getAttribute("href")?.trim() ?? "";
          if (/^https?:\/\//i.test(href) || href.startsWith("mailto:")) {
            event.preventDefault();
            void openExternalUrl(href);
            return true;
          }
        }

        return false;
      },
      handleDrop(view, event) {
        const imageFile = extractFirstImageFile(event.dataTransfer?.files);
        if (!imageFile) {
          return false;
        }

        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        void uploadImage(imageFile, coords?.pos);
        return true;
      },
      handleKeyDown: (_view, event) => {
        if (autocomplete.open) {
          if (event.key === "Escape") {
            event.preventDefault();
            setAutocomplete(CLOSED_AUTOCOMPLETE);
            return true;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveAutocompleteIndex((current) =>
              autocompleteItems.length === 0 ? 0 : (current + 1) % autocompleteItems.length,
            );
            return true;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveAutocompleteIndex((current) =>
              autocompleteItems.length === 0
                ? 0
                : (current - 1 + autocompleteItems.length) % autocompleteItems.length,
            );
            return true;
          }

          if ((event.key === "Enter" || event.key === "Tab") && autocompleteItems.length > 0) {
            event.preventDefault();
            const selectedItem = autocompleteItems[activeAutocompleteIndex] ?? autocompleteItems[0];
            if (selectedItem && editor) {
              insertLocramLink(editor, selectedItem, {
                from: autocomplete.from,
                to: editor.state.selection.from,
              });
            }
            return true;
          }
        }

        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          const nextMarkdown = readEditorMarkdown(editor) ?? undefined;
          void onSaveRef.current(nextMarkdown);
          return true;
        }

        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          if (editor) {
            editor.chain().focus().insertContent("[[").run();
          }
          return true;
        }

        if (event.key === " " && editor) {
          const handled = applySpaceShortcut(editor);
          if (handled) {
            event.preventDefault();
            return true;
          }
        }

        if (event.key === "Enter" && editor) {
          const handled = applyEnterShortcut(editor);
          if (handled) {
            event.preventDefault();
            return true;
          }
        }

        return false;
      },
      handlePaste(_view, event) {
        const imageFile = extractClipboardImageFile(event.clipboardData);
        if (!imageFile) {
          return false;
        }

        event.preventDefault();
        void uploadImage(imageFile);
        return true;
      },
    },
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        autolink: false,
        defaultProtocol: "https",
        openOnClick: false,
        protocols: ["locram", "http", "https", "mailto"],
        HTMLAttributes: {
          class:
            "text-foreground/85 transition-colors hover:text-primary cursor-pointer underline decoration-dotted underline-offset-2",
        },
      }),
      LocramAttachmentImage.configure({
        allowBase64: true,
        inline: false,
        HTMLAttributes: {
          class: "my-3 max-w-full rounded-md border border-border",
        },
      }),
      LocramCodeBlock.configure({
        HTMLAttributes: {
          class: "my-4",
        },
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    onUpdate: ({ editor: activeEditor }) => {
      if (applyingExternalValueRef.current) {
        return;
      }

      const nextAutocomplete = getAutocompleteStateFromEditor(activeEditor);
      const nextMarkdown = readEditorMarkdown(activeEditor);
      if (nextMarkdown === null) {
        return;
      }
      rememberLocalEcho(nextMarkdown);
      scheduleReactUpdate(() => {
        setAutocomplete(nextAutocomplete);
      });
      if (!isEditorMarkdownEquivalent(nextMarkdown, latestValueRef.current)) {
        onChangeRef.current(nextMarkdown);
      }
    },
    onSelectionUpdate: ({ editor: activeEditor }) => {
      syncAutocompleteFromEditor(activeEditor);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentMarkdown = readEditorMarkdown(editor);
    if (currentMarkdown === null) {
      return;
    }
    if (consumeLocalEcho(normalizedValue)) {
      return;
    }

    if (currentMarkdown === normalizedValue) {
      return;
    }

    setAutocomplete(CLOSED_AUTOCOMPLETE);
    applyingExternalValueRef.current = true;
    editor.commands.setContent(markdownToEditorHtml(normalizedValue, { attachmentUrl }), { emitUpdate: false });
    void Promise.resolve().then(() => {
      applyingExternalValueRef.current = false;
    });
  }, [attachmentUrl, consumeLocalEcho, editor, normalizedValue]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    destroyedRef.current = false;
    return () => {
      destroyedRef.current = true;
      editorRef.current = null;
    };
  }, [editor]);

  return (
    <>
      <div
        className="locram-editor-wrap bg-background border-input relative flex min-h-0 flex-1 overflow-auto border-t border-border"
        ref={wrapperRef}
        style={fontSize !== undefined ? { "--editor-font-size": `${fontSize}px` } as CSSProperties : undefined}
      >
        <div className="pointer-events-none absolute top-3 end-3 z-10 flex items-center gap-2">
          {attachmentError ? (
            <div className="pointer-events-auto rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-[11px] text-danger">
              {attachmentError}
            </div>
          ) : null}
          {isUploadingImage ? (
            <div className="rounded-md border border-border bg-background/90 px-2 py-1 text-[11px] text-muted-foreground shadow-sm">
              Uploading image…
            </div>
          ) : null}
        </div>
        <EditorContent className="min-h-full w-full" editor={editor} />
        {autocomplete.open ? (
          <WikilinkAutocomplete
            activeIndex={activeAutocompleteIndex}
            items={autocompleteItems}
            onHoverIndex={setActiveAutocompleteIndex}
            onSelect={(item) => {
              if (!editor) {
                return;
              }
              insertLocramLink(editor, item, {
                from: autocomplete.from,
                to: editor.state.selection.from,
              });
            }}
            position={{ left: autocomplete.left, top: autocomplete.top }}
          />
        ) : null}
      </div>

    </>
  );
}

function extractClipboardImageFile(data: DataTransfer | null): File | null {
  if (!data) {
    return null;
  }

  for (const item of Array.from(data.items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }

  return extractFirstImageFile(data.files);
}

function extractFirstImageFile(files: FileList | null | undefined): File | null {
  if (!files) {
    return null;
  }

  for (const file of Array.from(files)) {
    if (file.type.startsWith("image/")) {
      return file;
    }
  }

  return null;
}

async function readFileAsBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function buildAttachmentFilename(file: File): string {
  const originalName = file.name || `image.${extensionForMimeType(file.type)}`;
  const parts = splitFilename(originalName);
  const safeStem = sanitizeFilenamePart(parts.stem) || "image";
  const safeExtension = sanitizeFilenamePart(parts.extension || extensionForMimeType(file.type));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return safeExtension
    ? `${safeStem}-${timestamp}.${safeExtension}`
    : `${safeStem}-${timestamp}`;
}

function splitFilename(filename: string): { extension: string; stem: string } {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return { extension: "", stem: trimmed };
  }
  return {
    extension: trimmed.slice(lastDot + 1),
    stem: trimmed.slice(0, lastDot),
  };
}

function sanitizeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}
