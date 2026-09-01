import CodeBlock from "@tiptap/extension-code-block";
import { mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";

import { SimpleMermaidViewer } from "@/components/graph/SimpleMermaidViewer";
import { buildSimpleMermaidGraphFromSource } from "@/lib/graph/simpleMermaidFromSource";

function MermaidCodeBlockView({ node }: NodeViewProps) {
  const [showSource, setShowSource] = useState(false);
  const isMermaid = node.attrs.language === "mermaid";
  const mermaidResult = useMemo(() => {
    if (!isMermaid) {
      return { supported: false as const, reason: "not-mermaid" };
    }
    return buildSimpleMermaidGraphFromSource(node.textContent);
  }, [isMermaid, node.textContent]);

  useEffect(() => {
    if (!mermaidResult.supported) {
      setShowSource(true);
    }
  }, [mermaidResult.supported]);

  if (!isMermaid || !mermaidResult.supported || showSource) {
    return (
      <NodeViewWrapper as="div" className="my-4">
        {isMermaid && mermaidResult.supported ? (
          <div className="mb-2 flex items-center justify-between gap-3" contentEditable={false}>
            <span className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
              Mermaid Source
            </span>
            <button
              className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline underline-offset-4"
              contentEditable={false}
              onClick={() => setShowSource(false)}
              type="button"
            >
              Show diagram
            </button>
          </div>
        ) : null}
        <pre
          className="bg-muted/35 overflow-x-auto rounded-lg border border-border px-4 py-3 text-sm"
          data-testid={isMermaid ? "mermaid-code-block-fallback" : undefined}
        >
          <code className={node.attrs.language ? `language-${node.attrs.language}` : undefined}>
            <NodeViewContent className="block whitespace-pre-wrap font-mono" />
          </code>
        </pre>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="div" className="not-prose my-4" contentEditable={false}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
          Mermaid
        </span>
        <button
          className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline underline-offset-4"
          onClick={() => setShowSource(true)}
          type="button"
        >
          Edit source
        </button>
      </div>
      <div
        className="bg-muted/20 min-h-[360px] w-full overflow-hidden rounded-lg border border-border"
        data-testid="note-mermaid-diagram-frame"
      >
        <SimpleMermaidViewer
          className="h-full w-full"
          dataTestId="note-mermaid-diagram"
          graph={mermaidResult.graph}
        />
      </div>
    </NodeViewWrapper>
  );
}

export const LocramCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MermaidCodeBlockView);
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "pre",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      [
        "code",
        {
          class: node.attrs.language
            ? `${this.options.languageClassPrefix}${node.attrs.language}`
            : null,
        },
        0,
      ],
    ];
  },
});
