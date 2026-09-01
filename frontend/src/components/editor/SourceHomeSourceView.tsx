import type { ReactNode } from "react";

import { GlobalSearchIcon } from "@/components/icons/Icons";
import { getSourceSearchPlaceholder, type SourceResult } from "@/lib/sources/sourceRegistry";
import { cn } from "@/lib/utils/cn";
import type { ActiveSource } from "@/types/source";

export type SourceMetric = {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
};

function MetricCard({ metric }: { metric: SourceMetric }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-[11px] uppercase tracking-wide">
        <span className="h-4 w-4">{metric.icon}</span>
        <span>{metric.label}</span>
      </div>
      <div className="text-foreground mt-3 text-sm font-semibold">{metric.value}</div>
      <p className="text-muted-foreground mt-1 text-xs leading-5">{metric.detail}</p>
    </div>
  );
}

function ResultButton({
  result,
  isActive,
  onClick,
}: {
  result: SourceResult;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-left transition",
        isActive
          ? "border-foreground/30 bg-muted/40 text-foreground"
          : "border-border bg-background text-foreground hover:bg-muted/30",
      )}
      onClick={onClick}
      type="button"
    >
      <div className="text-sm font-medium">{result.title}</div>
      <p className="text-muted-foreground mt-1 text-xs leading-5">{result.snippet || result.meta}</p>
    </button>
  );
}

type SourceHomeSourceViewProps = {
  isSearchLocked: boolean;
  localSearchPending: boolean;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSelectPage: (pageId: string) => void;
  onSelectSourceNode: (nodeId: string) => void;
  previewBody: string;
  previewTitle: string;
  quickAccess: SourceResult[];
  searchBoxLabel: string;
  searchInput: string;
  searchResults: SourceResult[];
  selectedNodeId: string | null;
  source: ActiveSource;
  sourceMetrics: SourceMetric[];
  submittedQuery: string;
};

export function SourceHomeSourceView({
  isSearchLocked,
  localSearchPending,
  onSearchInputChange,
  onSearchSubmit,
  onSelectPage,
  onSelectSourceNode,
  previewBody,
  previewTitle,
  quickAccess,
  searchBoxLabel,
  searchInput,
  searchResults,
  selectedNodeId,
  source,
  sourceMetrics,
  submittedQuery,
}: SourceHomeSourceViewProps) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {sourceMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {quickAccess.map((item) => (
          <button
            key={item.id}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-medium transition",
              selectedNodeId === item.id
                ? "border-foreground/30 bg-muted/40 text-foreground"
                : "border-border bg-background text-foreground hover:bg-muted/30",
            )}
            onClick={() => {
              if (source.kind === "shared-base") {
                onSelectPage(item.id);
                return;
              }
              onSelectSourceNode(item.id);
            }}
            type="button"
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center gap-2">
            <GlobalSearchIcon className="text-muted-foreground h-4 w-4" />
            <h3 className="text-foreground text-sm font-semibold">Search this source</h3>
          </div>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
          >
            <input
              aria-label={searchBoxLabel}
              className="border-input bg-muted/20 text-foreground w-full rounded-md border px-3 py-2 text-sm outline-none"
              disabled={isSearchLocked}
              onChange={(event) => onSearchInputChange(event.target.value)}
              placeholder={getSourceSearchPlaceholder(source)}
              value={searchInput}
            />
            <button
              className="bg-foreground text-background hover:opacity-90 cursor-pointer rounded-md px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                isSearchLocked ||
                localSearchPending ||
                searchInput.trim().length === 0
              }
              type="submit"
            >
              {localSearchPending ? "Searching…" : "Search"}
            </button>
          </form>

          {(source.kind === "local-base" || source.kind === "shared-base") && selectedNodeId ? (
            <button
              className="mt-4 w-full rounded-md border border-border px-3 py-2 text-left text-xs font-medium text-foreground transition hover:bg-muted/30"
              onClick={() => onSelectPage(selectedNodeId)}
              type="button"
            >
              Open selected note
            </button>
          ) : null}
        </div>

        <div className="min-h-0 rounded-xl border border-border bg-background p-4">
          <div className="mb-3">
            <h3 className="text-foreground text-sm font-semibold">
              {submittedQuery ? "Search results" : "Source overview"}
            </h3>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              {submittedQuery
                ? `Results for "${submittedQuery}".`
                : "Choose an entry to focus Notes and Graph on a specific node inside the active source."}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-2">
              {searchResults.map((result) => (
                <ResultButton
                  key={result.id}
                  isActive={selectedNodeId === result.id}
                  onClick={() => {
                    if (source.kind === "shared-base") {
                      onSelectPage(result.id);
                      return;
                    }
                    onSelectSourceNode(result.id);
                  }}
                  result={result}
                />
              ))}
              {submittedQuery &&
              !localSearchPending &&
              searchResults.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-6 text-sm">
                  No matching items in this source.
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
                Selected node
              </div>
              <div className="text-foreground mt-3 text-sm font-semibold">{previewTitle}</div>
              <p className="text-muted-foreground mt-2 whitespace-pre-wrap text-xs leading-5">
                {previewBody}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
