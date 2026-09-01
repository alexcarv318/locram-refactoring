import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchPage,
  fetchPagesByParent,
  resolveBaseShareSession,
  searchPages,
  updatePage,
} from "@/api";
import { getAttachmentUrl } from "@/api/assetsApi";
import { LinkIcon, XIcon } from "@/components/icons/Icons";
import ActionButton from "@/components/ui/ActionButton";
import { BridgeClientError } from "@/lib/bridgeClient";
import { cn } from "@/lib/utils/cn";
import { useSharingStore } from "@/stores/sharingStore";
import type {
  BaseShareGrantPermission,
  BaseShareSessionState,
  PageSummary,
  PageSearchHit,
  ResolvedBaseShareSession,
} from "@/types";

import { markdownToEditorHtml } from "./markdownInterop";

interface SharedBaseSessionPanelProps {
  bridgeBaseUrl: string;
  initialContext?: {
    input?: string;
  };
  onClose: () => void;
}

function formatSessionError(error: unknown): string {
  if (error instanceof BridgeClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Could not open the shared base session.";
}

function sessionStateFromError(error: unknown): BaseShareSessionState | null {
  if (!(error instanceof BridgeClientError)) {
    return null;
  }
  const payload = error.payload as { session_state?: unknown } | null;
  const rawState = payload?.session_state;
  if (typeof rawState !== "string") {
    return null;
  }
  if (
    rawState === "ready" ||
    rawState === "expired" ||
    rawState === "revoked" ||
    rawState === "unavailable"
  ) {
    return rawState;
  }
  return null;
}

function permissionLabel(permission: BaseShareGrantPermission): string {
  switch (permission) {
    case "write":
      return "Edit access";
    case "admin":
      return "Admin access";
    case "read":
    default:
      return "Read access";
  }
}

function stateLabel(state: BaseShareSessionState): string {
  switch (state) {
    case "expired":
      return "Expired";
    case "revoked":
      return "Revoked";
    case "unavailable":
      return "Unavailable";
    case "ready":
    default:
      return "Ready";
  }
}

function stateBadgeClassName(state: BaseShareSessionState): string {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
    state === "ready" &&
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    state === "expired" &&
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    state === "revoked" &&
      "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    state === "unavailable" &&
      "border-border bg-muted/40 text-muted-foreground",
  );
}

function detailRows(session: ResolvedBaseShareSession) {
  const activePageCount = session.base_stats?.active_page_count ?? session.base_stats?.page_count;
  return [
    {
      label: "owner",
      value: session.owner_display_name?.trim() || "Unavailable",
    },
    {
      label: "access",
      value: permissionLabel(session.permission),
    },
    {
      label: "created",
      value: session.grant_created_at ?? "Unavailable",
    },
    {
      label: "activated",
      value: session.activated_at ?? "Unavailable",
    },
    {
      label: "recipient",
      value: session.recipient_account_id || session.recipient_actor_ref,
    },
    {
      label: "entry_id",
      value: session.share_entry_id ?? "Unavailable",
    },
    {
      label: "base_id",
      value: session.share_base_id,
    },
    {
      label: "grant_id",
      value: session.transport_envelope.base_share_grant_id,
    },
    {
      label: "broker",
      value: session.broker_base_url,
    },
    {
      label: "device_id",
      value: session.device_id,
    },
    {
      label: "nodes",
      value: activePageCount !== null && activePageCount !== undefined ? String(activePageCount) : "Unavailable",
    },
    {
      label: "links",
      value:
        session.base_stats?.link_count !== null && session.base_stats?.link_count !== undefined
          ? String(session.base_stats.link_count)
          : "Unavailable",
    },
    {
      label: "size",
      value:
        session.base_stats?.size_bytes !== null && session.base_stats?.size_bytes !== undefined
          ? `${Math.round(session.base_stats.size_bytes / 1024)} KB`
          : "Unavailable",
    },
  ];
}

function sharedBaseReadOptions(session: ResolvedBaseShareSession | null) {
  if (!session) {
    return undefined;
  }
  return {
    baseRef: `shared:${session.transport_envelope.base_share_grant_id}`,
    recipientActorRef: session.recipient_actor_ref,
    recipientAccountId: session.recipient_account_id ?? undefined,
  };
}

function SharedBasePageButton({
  page,
  isActive,
  onSelect,
}: {
  page: PageSummary;
  isActive: boolean;
  onSelect: (pageId: string) => void;
}) {
  return (
    <button
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-left transition",
        isActive
          ? "border-foreground/30 bg-muted/40 text-foreground"
          : "border-border bg-background text-foreground hover:bg-muted/30",
      )}
      onClick={() => onSelect(page.id)}
      type="button"
    >
      <div className="text-sm font-medium">{page.title}</div>
      <p className="text-muted-foreground mt-1 text-xs uppercase tracking-wide">
        {page.type} • {page.status}
      </p>
    </button>
  );
}

function SharedBaseSearchResultButton({
  hit,
  isActive,
  onSelect,
}: {
  hit: PageSearchHit;
  isActive: boolean;
  onSelect: (pageId: string) => void;
}) {
  return (
    <button
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-left transition",
        isActive
          ? "border-foreground/30 bg-muted/40 text-foreground"
          : "border-border bg-background text-foreground hover:bg-muted/30",
      )}
      onClick={() => onSelect(hit.id)}
      type="button"
    >
      <div className="text-sm font-medium">{hit.title}</div>
      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{hit.snippet || "No snippet."}</p>
    </button>
  );
}

export default function SharedBaseSessionPanel({
  bridgeBaseUrl,
  initialContext,
  onClose,
}: SharedBaseSessionPanelProps) {
  const queryClient = useQueryClient();
  const lastBaseShareInviteUrl = useSharingStore((state) => state.lastBaseShareInviteUrl);
  const [inviteInput, setInviteInput] = useState("");
  const [panelMessage, setPanelMessage] = useState("");
  const [session, setSession] = useState<ResolvedBaseShareSession | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

  useEffect(() => {
    if (initialContext?.input) {
      setInviteInput(initialContext.input);
      return;
    }
    if (!inviteInput && lastBaseShareInviteUrl) {
      setInviteInput(lastBaseShareInviteUrl);
    }
  }, [initialContext?.input, inviteInput, lastBaseShareInviteUrl]);

  const resolveSessionMutation = useMutation({
    mutationFn: async (input: string) =>
      resolveBaseShareSession(bridgeBaseUrl, {
        input,
      }),
    onSuccess: async (resolvedSession) => {
      setSession(resolvedSession);
      setSelectedPageId(null);
      setSearchInput("");
      setSubmittedSearchQuery("");
      setPanelMessage("Shared base accepted and ready.");
      await queryClient.invalidateQueries({
        queryKey: ["recipient-base-share-view", bridgeBaseUrl],
      });
    },
    onError: (error) => {
      setSession(null);
      setSelectedPageId(null);
      setPanelMessage(formatSessionError(error));
    },
  });

  const detailItems = useMemo(() => (session ? detailRows(session) : []), [session]);
  const readOptions = useMemo(() => sharedBaseReadOptions(session), [session]);
  const pageListQuery = useQuery({
    enabled: bridgeBaseUrl.length > 0 && session !== null && session.state === "ready",
    queryKey: [
      "shared-base-panel-pages",
      bridgeBaseUrl,
      readOptions,
    ],
    queryFn: () =>
      fetchPagesByParent(bridgeBaseUrl, "root", readOptions),
  });
  const pageQuery = useQuery({
    enabled:
      bridgeBaseUrl.length > 0 &&
      session !== null &&
      session.state === "ready" &&
      selectedPageId !== null,
    queryKey: [
      "shared-base-panel-page",
      bridgeBaseUrl,
      readOptions,
      selectedPageId,
    ],
    queryFn: () =>
      fetchPage(bridgeBaseUrl, selectedPageId ?? "", readOptions),
  });
  const searchQuery = useQuery({
    enabled:
      bridgeBaseUrl.length > 0 &&
      session !== null &&
      session.state === "ready" &&
      submittedSearchQuery.length > 0,
    queryKey: [
      "shared-base-panel-search",
      bridgeBaseUrl,
      readOptions,
      submittedSearchQuery,
    ],
    queryFn: () =>
      searchPages(bridgeBaseUrl, submittedSearchQuery, readOptions),
  });
  const renderedPageContent = useMemo(() => {
    if (!draftContent) {
      return "";
    }
    return markdownToEditorHtml(draftContent, {
      attachmentUrl: (filename) =>
        bridgeBaseUrl ? getAttachmentUrl(bridgeBaseUrl, filename) : filename,
    });
  }, [bridgeBaseUrl, draftContent]);

  useEffect(() => {
    if (selectedPageId !== null) {
      return;
    }
    const firstPageId =
      submittedSearchQuery.length > 0
        ? searchQuery.data?.[0]?.id
        : pageListQuery.data?.[0]?.id;
    if (firstPageId) {
      setSelectedPageId(firstPageId);
    }
  }, [pageListQuery.data, searchQuery.data, selectedPageId, submittedSearchQuery.length]);

  useEffect(() => {
    if (!pageQuery.data) {
      return;
    }
    setDraftTitle(pageQuery.data.title);
    setDraftContent(pageQuery.data.content);
  }, [pageQuery.data?.content, pageQuery.data?.title, pageQuery.data?.id]);

  useEffect(() => {
    const error = pageListQuery.error ?? searchQuery.error ?? pageQuery.error;
    if (!error) {
      return;
    }
    const nextState = sessionStateFromError(error);
    if (nextState !== null && session !== null && session.state !== nextState) {
      setSession({
        ...session,
        state: nextState,
      });
    }
    if (nextState === "expired" || nextState === "revoked" || nextState === "unavailable") {
      setSelectedPageId(null);
    }
    setPanelMessage(formatSessionError(error));
  }, [pageListQuery.error, searchQuery.error, pageQuery.error, session]);

  const isSearchMode = submittedSearchQuery.length > 0;
  const visibleSearchHits: PageSearchHit[] = searchQuery.data ?? [];
  const visibleRootPages: PageSummary[] = pageListQuery.data ?? [];
  const visiblePageCount = isSearchMode ? visibleSearchHits.length : visibleRootPages.length;
  const canEditSession = session?.permission === "write" || session?.permission === "admin";
  const hasPageDraftChanges =
    pageQuery.data !== undefined &&
    (draftTitle !== pageQuery.data.title || draftContent !== pageQuery.data.content);
  const savePageMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedPageId) {
        throw new Error("No shared-base page selected.");
      }
      return updatePage(
        bridgeBaseUrl,
        selectedPageId,
        {
          title: draftTitle,
          content: draftContent,
        },
        readOptions,
      );
    },
    onSuccess: async (updatedPage) => {
      setPanelMessage("Remote shared-base page saved.");
      setDraftTitle(updatedPage.title);
      setDraftContent(updatedPage.content);
      queryClient.setQueryData(
        [
          "shared-base-panel-page",
          bridgeBaseUrl,
          readOptions,
          selectedPageId,
        ],
        updatedPage,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "shared-base-panel-pages",
            bridgeBaseUrl,
            readOptions,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "shared-base-panel-search",
            bridgeBaseUrl,
            readOptions,
          ],
        }),
      ]);
    },
    onError: (error) => {
      setPanelMessage(formatSessionError(error));
    },
  });

  return (
    <section
      className="bg-background flex h-full min-h-0 flex-col overflow-hidden"
      aria-label="Shared base session"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-foreground text-base font-semibold">Shared Base Session</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Accept and open a remote shared base from an invite without switching the local active base or creating a local registry entry.
          </p>
        </div>
        <ActionButton
          ariaLabel="Close shared base session"
          icon={<XIcon className="h-4 w-4" />}
          onClick={onClose}
          title="Close shared base session"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4">
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3">
              <h3 className="text-foreground text-sm font-semibold">Open shared base</h3>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                Paste a base-share invite URL or JSON payload. The bridge validates the transport envelope, saves the accepted share for Shared With Me, and opens the remote working session.
              </p>
            </div>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setPanelMessage("");
                void resolveSessionMutation.mutateAsync(inviteInput).catch(() => undefined);
              }}
            >
              <textarea
                aria-label="Shared base invite input"
                className="border-input bg-muted/20 text-foreground min-h-28 w-full rounded-lg border px-3 py-3 text-sm outline-none"
                onChange={(event) => setInviteInput(event.target.value)}
                placeholder="Paste base-share invite URL or JSON payload"
                value={inviteInput}
              />
              <div className="flex items-center justify-between gap-3">
                <div className="text-muted-foreground text-xs">{panelMessage}</div>
                <button
                  className="bg-foreground text-background hover:opacity-90 cursor-pointer rounded-md px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={resolveSessionMutation.isPending || inviteInput.trim().length === 0}
                  type="submit"
                >
                  {resolveSessionMutation.isPending ? "Opening…" : "Accept and open shared base"}
                </button>
              </div>
            </form>
          </div>

          {session ? (
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
                  Remote shared base
                </div>
                <div className="text-foreground mt-2 text-sm font-semibold">
                  {session.share_base_title}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-sky-700 dark:text-sky-300">
                    Remote
                  </span>
                  <span className={stateBadgeClassName(session.state)}>
                    {stateLabel(session.state)}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-foreground">
                    {permissionLabel(session.permission)}
                  </span>
                </div>
                <p className="text-muted-foreground mt-3 text-xs leading-5">
                  This session is capability-bounded and owner-controlled. It does not appear in the local base registry and does not replace the current active base.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="mb-3 flex items-center gap-2">
                  <LinkIcon className="text-muted-foreground h-4 w-4" />
                  <h3 className="text-foreground text-sm font-semibold">Session details</h3>
                </div>
                <div className="space-y-2">
                  {detailItems.map((item) => (
                    <div
                      key={item.label}
                      className="grid gap-1 rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs lg:grid-cols-[120px_minmax(0,1fr)]"
                    >
                      <div className="text-muted-foreground font-mono uppercase tracking-wide">
                        {item.label}
                      </div>
                      <div className="text-foreground min-w-0 break-all font-mono">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                {session.state === "ready" ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <div className="space-y-2">
                      <form
                        className="space-y-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const nextQuery = searchInput.trim();
                          setSelectedPageId(null);
                          setSubmittedSearchQuery(nextQuery);
                        }}
                      >
                        <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
                          Search remote base
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            aria-label="Search remote shared base"
                            className="border-input bg-background text-foreground min-w-0 flex-1 rounded-md border px-2.5 py-2 text-xs outline-none"
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search title or content"
                            value={searchInput}
                          />
                          <button
                            className="cursor-pointer rounded-md border border-border bg-background px-2.5 py-2 text-[11px] font-medium text-foreground transition hover:bg-muted/30"
                            type="submit"
                          >
                            Search
                          </button>
                        </div>
                        {isSearchMode ? (
                          <button
                            className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] transition"
                            onClick={() => {
                              setSearchInput("");
                              setSubmittedSearchQuery("");
                              setSelectedPageId(null);
                            }}
                            type="button"
                          >
                            Clear search
                          </button>
                        ) : null}
                      </form>
                      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
                        {isSearchMode ? "Remote search results" : "Remote root pages"}
                      </div>
                      {isSearchMode
                        ? visibleSearchHits.map((page) => (
                            <SharedBaseSearchResultButton
                              hit={page}
                              isActive={page.id === selectedPageId}
                              key={page.id}
                              onSelect={setSelectedPageId}
                            />
                          ))
                        : visibleRootPages.map((page) => (
                            <SharedBasePageButton
                              isActive={page.id === selectedPageId}
                              key={page.id}
                              onSelect={setSelectedPageId}
                              page={page}
                            />
                          ))}
                      {isSearchMode &&
                      !searchQuery.isLoading &&
                      submittedSearchQuery.length > 0 &&
                      visiblePageCount === 0 ? (
                        <div className="text-muted-foreground rounded-lg border border-border/60 bg-muted/10 px-3 py-3 text-xs leading-5">
                          No remote matches for “{submittedSearchQuery}”.
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3">
                      {pageQuery.data ? (
                        <div className="space-y-3">
                          <div>
                            <div className="text-foreground text-sm font-semibold">
                              {pageQuery.data.title}
                            </div>
                            <div className="text-muted-foreground mt-1 text-xs uppercase tracking-wide">
                              Remote shared-base page
                            </div>
                          </div>
                          {pageQuery.data.sub_items.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {pageQuery.data.sub_items.map((item) => (
                                <button
                                  className="cursor-pointer rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted/30"
                                  key={item.id}
                                  onClick={() => setSelectedPageId(item.id)}
                                  type="button"
                                >
                                  {item.title}
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {canEditSession ? (
                            <div className="space-y-3 rounded-lg border border-border/60 bg-background px-3 py-3">
                              <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
                                Remote live edit
                              </div>
                              <div className="space-y-2">
                                <label className="text-muted-foreground block text-[11px] uppercase tracking-wide">
                                  Title
                                </label>
                                <input
                                  aria-label="Remote shared-base page title"
                                  className="border-input bg-background text-foreground w-full rounded-md border px-2.5 py-2 text-sm outline-none"
                                  onChange={(event) => setDraftTitle(event.target.value)}
                                  value={draftTitle}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-muted-foreground block text-[11px] uppercase tracking-wide">
                                  Content
                                </label>
                                <textarea
                                  aria-label="Remote shared-base page content"
                                  className="border-input bg-background text-foreground min-h-40 w-full rounded-md border px-3 py-2 text-sm outline-none"
                                  onChange={(event) => setDraftContent(event.target.value)}
                                  value={draftContent}
                                />
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  className="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
                                  disabled={!hasPageDraftChanges || savePageMutation.isPending}
                                  onClick={() => {
                                    setDraftTitle(pageQuery.data.title);
                                    setDraftContent(pageQuery.data.content);
                                  }}
                                  type="button"
                                >
                                  Reset
                                </button>
                                <button
                                  className="bg-foreground text-background hover:opacity-90 cursor-pointer rounded-md px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                                  disabled={!hasPageDraftChanges || savePageMutation.isPending}
                                  onClick={() => {
                                    void savePageMutation.mutateAsync().catch(() => undefined);
                                  }}
                                  type="button"
                                >
                                  {savePageMutation.isPending ? "Saving…" : "Save remote page"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                            dangerouslySetInnerHTML={{ __html: renderedPageContent }}
                          />
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-xs leading-5">
                          {pageListQuery.isLoading || pageQuery.isLoading
                            ? "Loading remote shared-base content…"
                            : "Select a remote page to inspect the shared-base content."}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-border/60 bg-muted/10 px-3 py-3 text-xs leading-5 text-muted-foreground">
                    Remote shared-base content is unavailable until the session returns to a ready state.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
