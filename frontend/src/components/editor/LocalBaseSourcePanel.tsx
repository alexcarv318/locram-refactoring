import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { searchPages } from "@/api/sessionApi";
import { GlobalSearchIcon, XIcon } from "@/components/icons/Icons";
import ActionButton from "@/components/ui/ActionButton";
import { cn } from "@/lib/utils/cn";
import type { PageSummary } from "@/types";
import type { LocalBaseSource } from "@/types/source";

type LocalBaseSourcePanelProps = {
  bridgeBaseUrl: string;
  notes: PageSummary[];
  onClose: () => void;
  onSelectPage: (pageId: string) => void;
  source: LocalBaseSource;
};

export default function LocalBaseSourcePanel({
  bridgeBaseUrl,
  notes,
  onClose,
  onSelectPage,
  source,
}: LocalBaseSourcePanelProps) {
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const searchMutation = useMutation({
    mutationFn: (query: string) => searchPages(bridgeBaseUrl, query),
  });

  const quickStartItems = useMemo(() => notes.slice(0, 12), [notes]);

  return (
    <section className="bg-background flex h-full min-h-0 flex-col overflow-hidden" aria-label={source.label}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-foreground text-base font-semibold">{source.label}</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Search the source, then switch to Notes to browse and manage the full structure.
          </p>
        </div>
        <ActionButton
          ariaLabel={`Close ${source.label}`}
          icon={<XIcon className="h-4 w-4" />}
          onClick={onClose}
          title={`Close ${source.label}`}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <GlobalSearchIcon className="text-muted-foreground h-4 w-4" />
                <h3 className="text-foreground text-sm font-semibold">Search this source</h3>
              </div>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const nextQuery = searchInput.trim();
                  setSubmittedQuery(nextQuery);
                  if (!nextQuery) {
                    return;
                  }
                  searchMutation.mutate(nextQuery);
                }}
              >
                <input
                  aria-label="Search local source"
                  className="border-input bg-muted/20 text-foreground w-full rounded-md border px-3 py-2 text-sm outline-none"
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search notes in this source"
                  value={searchInput}
                />
                <button
                  className="bg-foreground text-background hover:opacity-90 cursor-pointer rounded-md px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={searchMutation.isPending || searchInput.trim().length === 0}
                  type="submit"
                >
                  {searchMutation.isPending ? "Searching…" : "Search"}
                </button>
              </form>
            </div>

            <div className="min-h-0 rounded-xl border border-border bg-background p-4">
              <div className="mb-3">
                <h3 className="text-foreground text-sm font-semibold">
                  {submittedQuery ? "Search results" : "Quick start"}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  {submittedQuery
                    ? `Results for “${submittedQuery}”.`
                    : "Open a recent top-level note or search for a specific page."}
                </p>
              </div>

              <div className="space-y-2">
                {(submittedQuery ? searchMutation.data ?? [] : quickStartItems).map((item) => (
                  <button
                    key={item.id}
                    className={cn(
                      "w-full rounded-lg border border-border bg-background px-3 py-2 text-left transition hover:bg-muted/30",
                    )}
                    onClick={() => onSelectPage(item.id)}
                    type="button"
                  >
                    <div className="text-sm font-medium">{item.title}</div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {"snippet" in item && item.snippet ? item.snippet : `${item.type} • ${item.status}`}
                    </p>
                  </button>
                ))}
                {submittedQuery && !searchMutation.isPending && (searchMutation.data?.length ?? 0) === 0 ? (
                  <div className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-6 text-sm">
                    No matching notes in this source.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
