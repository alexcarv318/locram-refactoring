import { useQuery } from "@tanstack/react-query";

import { fetchPageAncestry } from "@/api";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import { workingBaseReadOptions } from "@/stores/notesTreeStore";
import type { PageAncestorItem, PageDetail } from "@/types";
import type { ActiveSource } from "@/types/source";

type PageHeaderSummaryProps = {
  baseUrl: string;
  page: PageDetail;
  activeSource: ActiveSource | null;
};

export default function PageHeaderSummary({ baseUrl, page, activeSource }: PageHeaderSummaryProps) {
  const { onSelectPage } = useDesktopShellContext();
  const readOptions = workingBaseReadOptions(activeSource);
  const workingBaseScopeKey = readOptions?.baseRef ?? "local-runtime";
  const ancestryQuery = useQuery<PageAncestorItem[]>({
    enabled: baseUrl.length > 0,
    queryKey: ["page-ancestry", baseUrl, workingBaseScopeKey, page.id],
    queryFn: () => fetchPageAncestry(baseUrl, page.id, readOptions),
    retry: 2,
  });

  const breadcrumbItems = ancestryQuery.data ?? [];
  const fullPathLabel = breadcrumbItems.map((item) => item.title).join(" > ");

  return (
    <div className="min-w-0">
      <h1 className="text-foreground truncate text-lg font-semibold leading-6" title={page.title}>
        {page.title}
      </h1>
      <div className="text-muted-foreground flex min-w-0 items-center text-[11px] leading-4">
        {breadcrumbItems.length > 0 ? (
          <nav
            aria-label="Note breadcrumbs"
            className="scrollbar-hide flex min-w-0 max-w-[33vw] items-center overflow-x-auto whitespace-nowrap"
            title={fullPathLabel}
          >
            {breadcrumbItems.map((item, index) => (
              <div className="flex min-w-0 items-center" key={item.id}>
                <button
                  className="hover:text-foreground hover:underline cursor-pointer truncate transition-colors"
                  onClick={() => {
                    void onSelectPage(item.id);
                  }}
                  type="button"
                >
                  {item.title}
                </button>
                {index < breadcrumbItems.length - 1 ? (
                  <span aria-hidden="true" className="mx-1 shrink-0 text-muted-foreground/70">
                    {">"}
                  </span>
                ) : null}
              </div>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
