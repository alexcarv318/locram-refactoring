import { useLayoutEffect, useRef } from "react";

import LtrIsolate from "@/components/i18n/LtrIsolate";
import type { SearchResultItem } from "@/components/popover/PopoverSearchResults";

interface WikilinkAutocompleteProps {
  items: SearchResultItem[];
  activeIndex: number;
  onSelect: (item: SearchResultItem) => void;
  onHoverIndex: (index: number) => void;
  position: {
    left: number;
    top: number;
  };
}

export default function WikilinkAutocomplete({
  items,
  activeIndex,
  onSelect,
  onHoverIndex,
  position,
}: WikilinkAutocompleteProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = dropdownRef.current;
    if (!el) return;
    const parent = el.offsetParent as HTMLElement | null;
    if (!parent) return;

    const parentWidth = parent.getBoundingClientRect().width;
    const sideGap = Math.round(parentWidth * 0.075);
    const dropdownWidth = parentWidth - sideGap * 2;
    el.style.width = `${dropdownWidth}px`;
    el.style.insetInlineStart = `${sideGap}px`;
  }, []);

  return (
    <div
      className="border-border bg-panel-background absolute z-50 max-h-64 overflow-y-auto rounded-md border shadow-lg"
      ref={dropdownRef}
      style={{ top: position.top }}
    >
      {items.length === 0 ? (
        <div className="text-text-secondary px-3 py-2 text-sm">No matching notes</div>
      ) : (
        items.map((item, index) => (
          <button
            className={`flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-start transition-colors ${
              index === activeIndex
                ? "bg-menu-hover-bg text-foreground"
                : "text-foreground hover:bg-menu-hover-bg"
            }`}
            key={item.id}
            onClick={() => onSelect(item)}
            onMouseEnter={() => onHoverIndex(index)}
            type="button"
          >
            <span className="text-sm font-medium leading-tight">{item.title}</span>
            <LtrIsolate className="text-text-secondary font-mono text-[10px]">{item.id}</LtrIsolate>
          </button>
        ))
      )}
    </div>
  );
}
