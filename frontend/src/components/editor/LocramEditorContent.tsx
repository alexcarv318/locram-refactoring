import { lazy, Suspense, useMemo } from "react";

import BaseShareGrantsPanel from "@/components/editor/BaseShareGrantsPanel";
import PageHeaderSummary from "@/components/editor/PageHeaderSummary";
import SettingsPanel from "@/components/editor/SettingsPanel";
import SharedBaseSessionPanel from "@/components/editor/SharedBaseSessionPanel";
import SourceLandingPanel from "@/components/editor/SourceLandingPanel";
import { FontDecreaseIcon, FontIncreaseIcon } from "@/components/icons/Icons";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import ActionButton from "@/components/ui/ActionButton";
import CopyableId from "@/components/ui/CopyableId";
import { PanelLoader } from "@/components/ui/PanelLoader";
import { useEditorFontSizeStore } from "@/stores/editorFontSizeStore";
import { useT } from "@/i18n/useT";
import {
  BASE_SHARING_TAB_ID,
  SETTINGS_TAB_ID,
  SHARED_BASE_SESSION_TAB_ID,
  useEditorStore,
} from "@/stores/editorStore";
import { normalizeMarkdownForEditor } from "@/components/editor/markdownInterop";

const LocramRichEditor = lazy(() => import("./LocramRichEditor"));

function splitLeadingTitleHeading(markdown: string) {
  const normalized = normalizeMarkdownForEditor(markdown);
  if (!normalized.startsWith("# ")) {
    return {
      body: normalized,
      hasLeadingTitleHeading: false,
    };
  }

  const firstNewlineIndex = normalized.indexOf("\n");
  if (firstNewlineIndex === -1) {
    return {
      body: "",
      hasLeadingTitleHeading: true,
    };
  }

  const rest = normalized.slice(firstNewlineIndex + 1).replace(/^\n/, "");
  return {
    body: rest,
    hasLeadingTitleHeading: true,
  };
}

function buildPersistedEditorContent(
  bodyMarkdown: string,
  pageTitle: string,
  hasLeadingTitleHeading: boolean,
) {
  const normalizedBody = normalizeMarkdownForEditor(bodyMarkdown);
  if (!hasLeadingTitleHeading) {
    return normalizedBody;
  }
  return normalizedBody ? `# ${pageTitle}\n\n${normalizedBody}` : `# ${pageTitle}`;
}

export default function LocramEditorContent() {
  const t = useT();
  const {
    activeEditorDraft,
    activeSource,
    bridgeBaseUrl,
    externalUpdatePendingPageIds,
    isLoading,
    notes,
    onChangeEditorDraft,
    onSelectPage,
    onSelectSourceNode,
    onSavePageContent,
    selectedPage,
  } = useDesktopShellContext();

  const { fontSize, increase, decrease } = useEditorFontSizeStore();
  const {
    closeSettings,
    closeSharedBaseSession,
    closeSource,
    activeTabId,
    setSettingsTab,
    tabs,
  } = useEditorStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;

  const searchItems = useMemo(
    () =>
      notes.map((note) => ({
        id: note.id,
        type: "note" as const,
        title: note.title,
        path: `Notes • ${note.type}`,
        updated_at: note.updated_at,
      })),
    [notes],
  );

  const editorContent = useMemo(
    () => splitLeadingTitleHeading(activeEditorDraft),
    [activeEditorDraft],
  );

  const externalUpdatePendingForSelectedPage =
    selectedPage !== null && externalUpdatePendingPageIds.includes(selectedPage.id);

  if (activeTab?.id === SETTINGS_TAB_ID || activeTab?.tabType === "settings") {
    return (
      <SettingsPanel
        bridgeBaseUrl={bridgeBaseUrl}
        onClose={closeSettings}
        selectedTab={activeTab?.settingsTab ?? "general"}
        onSelectTab={setSettingsTab}
      />
    );
  }

  if (activeTab?.id === BASE_SHARING_TAB_ID || activeTab?.sharingTab === "base-grants") {
    return (
      <BaseShareGrantsPanel
        bridgeBaseUrl={bridgeBaseUrl}
      />
    );
  }

  if (
    activeTab?.id === SHARED_BASE_SESSION_TAB_ID ||
    activeTab?.tabType === "shared-base-session"
  ) {
    return (
      <SharedBaseSessionPanel
        bridgeBaseUrl={bridgeBaseUrl}
        initialContext={activeTab?.sharedBaseSessionContext}
        onClose={closeSharedBaseSession}
      />
    );
  }

  if (activeTab?.tabType === "source" && activeTab.sourceContext) {
    return (
      <SourceLandingPanel
        bridgeBaseUrl={bridgeBaseUrl}
        inspectContext={activeTab.sourceContext.inspectContext}
        mode={activeTab.sourceContext.mode ?? "active"}
        notes={notes}
        onClose={() => closeSource(activeTab.id)}
        onSelectPage={(pageId) => {
          void onSelectPage(pageId);
        }}
        onSelectSourceNode={(nodeId) => {
          void onSelectSourceNode(nodeId);
        }}
        selectedNodeId={activeTab.sourceContext.selectedNodeId ?? null}
        source={activeTab.sourceContext.source}
      />
    );
  }

  if (!selectedPage) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {isLoading ? (
          <PanelLoader
            description={t("editor.loadingNote.description")}
            message={t("editor.loadingNote.message")}
            size="md"
          />
        ) : (
          <p className="text-muted-foreground">{t("editor.noFileSelected")}</p>
        )}
      </div>
    );
  }

  return (
    <div
      aria-label={t("editor.region.label")}
      className="flex h-full min-h-0 flex-col overflow-hidden"
      role="region"
    >
      <div className="grid min-h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <CopyableId
            kind="note"
            value={selectedPage.id}
            className="min-w-0"
            textClassName="block min-w-0 truncate text-start"
          />
        </div>
        <div className="flex shrink-0 items-center justify-self-end gap-0">
            <ActionButton
              className="h-6 w-6"
              icon={<FontDecreaseIcon className="h-4 w-4" />}
              onClick={decrease}
              title={t("editor.fontSize.decrease")}
            />
            <ActionButton
              className="h-6 w-6"
              icon={<FontIncreaseIcon className="h-4 w-4" />}
              onClick={increase}
              title={t("editor.fontSize.increase")}
            />
        </div>
        <div className="min-w-0">
          <PageHeaderSummary
            baseUrl={bridgeBaseUrl}
            page={selectedPage}
            activeSource={activeSource}
          />
        </div>
        <div className="flex shrink-0 items-center justify-self-end">
            <CopyableId
              value={activeEditorDraft}
              iconOnly
              className="h-6 w-6"
              title={t("editor.copyContent")}
              copiedTitle={t("editor.copyContent.copied")}
              ariaLabel={t("editor.copyContent")}
              copiedAriaLabel={t("editor.copyContent.copiedAria")}
            />
        </div>
      </div>

      {externalUpdatePendingForSelectedPage ? (
        <div
          className="border-amber-500/40 bg-amber-500/10 text-foreground shrink-0 border-b px-3 py-2 text-sm"
          role="status"
        >
          {t("editor.externalUpdate.banner")}
        </div>
      ) : null}

      <article className="note-detail relative flex min-h-0 flex-1 flex-col overflow-auto">
        {isLoading ? (
          <div className="bg-background/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]">
            <PanelLoader
              description={t("editor.loadingNote.description")}
              message={t("editor.loadingNote.message")}
              size="md"
            />
          </div>
        ) : null}
        <Suspense
          fallback={
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              {t("editor.loadingEditor")}
            </div>
          }
        >
          <LocramRichEditor
            baseUrl={bridgeBaseUrl}
            fontSize={fontSize}
            key={selectedPage.id}
            onChange={(value) => {
              onChangeEditorDraft(
                buildPersistedEditorContent(
                  value,
                  selectedPage.title,
                  editorContent.hasLeadingTitleHeading,
                ),
              );
            }}
            onOpenNote={(pageId) => {
              void onSelectPage(pageId);
            }}
            onSave={(value) =>
              onSavePageContent(
                undefined,
                buildPersistedEditorContent(
                  value ?? editorContent.body,
                  selectedPage.title,
                  editorContent.hasLeadingTitleHeading,
                ),
              )
            }
            searchItems={searchItems}
            value={editorContent.body}
          />
        </Suspense>
      </article>
    </div>
  );
}
