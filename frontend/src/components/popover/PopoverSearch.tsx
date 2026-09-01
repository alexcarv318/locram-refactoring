import { useCallback, useEffect, useRef, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { SearchMutedIcon } from "@/components/icons/Icons";
import { useT } from "@/i18n/useT";

import PopoverSearchResults, { type PopoverSearchResultsHandle, type SearchResultItem } from "./PopoverSearchResults";

interface PopoverSearchProps {
  onSearch: (query: string) => Promise<SearchResultItem[]>;
  onSelect: (item: SearchResultItem) => void;
  label?: string;
}

const DEBOUNCE_MS = 200;

export default function PopoverSearch({ onSearch, onSelect, label = "locram" }: PopoverSearchProps) {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<PopoverSearchResultsHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchLabel = t("workspace.search.label");
  const searchPlaceholder = t("workspace.search.placeholder");

  const runSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        return;
      }
      const items = await onSearch(trimmed);
      setResults(items);
    },
    [onSearch],
  );

  useEffect(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(searchQuery);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, runSearch]);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      setSearchQuery("");
      setResults([]);
    }
  }

  function handleSelect(item: SearchResultItem) {
    onSelect(item);
    setIsOpen(false);
    setSearchQuery("");
    setResults([]);
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange} align="center" side="bottom">
      <PopoverTrigger asChild>
        <button
          aria-label={searchLabel}
          className="border-border text-foreground hover:bg-menu-hover-bg bg-panel-background flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-1.5 transition-all duration-150"
          title={searchLabel}
        >
          <SearchMutedIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground text-2sm leading-0 font-normal">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-1/3 min-w-[320px] p-0">
        <div className="flex flex-col">
          <div className="border-border flex items-center gap-2 border-b px-3 py-2">
            <input
              autoFocus
              aria-label={searchLabel}
              className="text-foreground placeholder:text-text-secondary w-full border-none bg-transparent text-sm outline-none"
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
                  listRef.current?.handleKeyDown(event);
                }
              }}
              placeholder={searchPlaceholder}
              type="text"
              value={searchQuery}
            />
          </div>
          <PopoverSearchResults items={results} onItemSelect={handleSelect} ref={listRef} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
