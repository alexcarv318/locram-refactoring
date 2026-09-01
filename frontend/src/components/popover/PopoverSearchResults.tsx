import { forwardRef, useImperativeHandle, useState } from "react";
import type { KeyboardEvent } from "react";

import LtrIsolate from "@/components/i18n/LtrIsolate";
import { useT } from "@/i18n/useT";
import { searchMatchKindI18nKey } from "@/lib/searchMatchKind";
import { sanitizeFtsSnippetHtml } from "@/lib/sanitizeFtsSnippetHtml";

export type SearchResultItem = {
  id: string;
  type: "note" | "document";
  title: string;
  path: string;
  updated_at: string;
  snippet?: string;
  match_kind?: string;
};

export interface PopoverSearchResultsHandle {
  handleKeyDown: (event: KeyboardEvent) => void;
}

interface PopoverSearchResultsProps {
  items: SearchResultItem[];
  onItemSelect: (item: SearchResultItem) => void;
}

const PopoverSearchResults = forwardRef<PopoverSearchResultsHandle, PopoverSearchResultsProps>(
  function PopoverSearchResults({ items, onItemSelect }, ref) {
    const t = useT();
    const [activeIndex, setActiveIndex] = useState(0);

    useImperativeHandle(ref, () => ({
      handleKeyDown(event) {
        if (items.length === 0) {
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveIndex((current) => (current + 1) % items.length);
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveIndex((current) => (current - 1 + items.length) % items.length);
        }

        if (event.key === "Enter") {
          event.preventDefault();
          onItemSelect(items[activeIndex]);
        }
      }
    }), [activeIndex, items, onItemSelect]);

    return (
      <div className="max-h-96 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="text-text-secondary px-2 py-4 text-sm">
            {t("workspace.search.noResults")}
          </p>
        ) : (
          items.map((item, index) => {
            const matchKindKey = searchMatchKindI18nKey(item.match_kind);
            return (
            <button
              aria-label={`Open search result: ${item.title}`}
              className={`flex w-full cursor-pointer flex-col items-start gap-1 rounded-md px-2 py-2 text-left transition-colors ${
                index === activeIndex ? "bg-menu-hover-bg text-foreground" : "text-foreground hover:bg-menu-hover-bg"
              }`}
              key={item.id}
              onClick={() => onItemSelect(item)}
              type="button"
            >
              <LtrIsolate className="text-text-secondary font-mono text-[11px] leading-4">
                {item.id}
              </LtrIsolate>
              <span className="text-sm font-medium">{item.title}</span>
              {matchKindKey ? (
                <span className="text-text-secondary text-[11px] uppercase tracking-wide">
                  {t(matchKindKey)}
                </span>
              ) : null}
              {item.snippet ? (
                <span
                  className="text-text-secondary line-clamp-2 text-xs"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeFtsSnippetHtml(item.snippet),
                  }}
                />
              ) : null}
              <span className="text-text-secondary text-xs">{item.path}</span>
            </button>
          );
          })
        )}
      </div>
    );
  }
);

export default PopoverSearchResults;
