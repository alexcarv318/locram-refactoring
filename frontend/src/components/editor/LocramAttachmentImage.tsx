import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useEffect, useRef } from "react";

const MIN_WIDTH = 120;

function LocramAttachmentImageView({
  editor,
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    if (node.attrs.width) {
      image.style.width = `${node.attrs.width}px`;
    } else {
      image.style.removeProperty("width");
    }
  }, [node.attrs.width]);

  return (
    <NodeViewWrapper
      as="span"
      className={`relative my-3 inline-block ${selected ? "ring-primary/30 rounded-md ring-2" : ""}`}
      data-drag-handle={false}
    >
      <img
        alt={node.attrs.alt ?? ""}
        className="block max-w-full rounded-md border border-border"
        ref={imageRef}
        src={node.attrs.src}
        title={node.attrs.title ?? ""}
      />
      {!editor.isEditable ? null : (
        <button
          aria-label="Resize image"
          className="border-secondary hover:border-primary absolute right-1 bottom-1 h-3 w-3 cursor-se-resize rounded-sm border bg-transparent transition-colors"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();

            const image = imageRef.current;
            if (!image) {
              return;
            }

            const startingWidth = node.attrs.width
              ? Number(node.attrs.width)
              : Math.round(image.getBoundingClientRect().width);
            const startX = event.clientX;

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const delta = moveEvent.clientX - startX;
              const nextWidth = Math.max(MIN_WIDTH, Math.round(startingWidth + delta));
              updateAttributes({ width: nextWidth });
            };

            const handleMouseUp = () => {
              window.removeEventListener("mousemove", handleMouseMove);
              window.removeEventListener("mouseup", handleMouseUp);
            };

            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
          }}
          type="button"
        />
      )}
    </NodeViewWrapper>
  );
}

export const LocramAttachmentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      filename: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-locram-attachment"),
        renderHTML: (attributes) =>
          attributes.filename ? { "data-locram-attachment": attributes.filename } : {},
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const rawWidth = element.getAttribute("width");
          if (!rawWidth) {
            return null;
          }
          const numericWidth = Number(rawWidth);
          return Number.isFinite(numericWidth) ? numericWidth : null;
        },
        renderHTML: (attributes) =>
          attributes.width ? { width: String(attributes.width) } : {},
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(LocramAttachmentImageView);
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
});
