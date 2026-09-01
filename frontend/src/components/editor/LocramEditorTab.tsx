import EditorTabsContainer from "@/components/editor/EditorTabsContainer";
import LocramEditorContent from "@/components/editor/LocramEditorContent";
import { useDesktopShellContext } from "@/components/shell/desktopShellContext";
import { useEditorStore } from "@/stores/editorStore";

export default function LocramEditorTab() {
  const { onCloseAllTabs, onCloseOtherFileTabs, onCloseTab, onSelectPage } = useDesktopShellContext();
  const { removeTab, setActiveTab, tabs } = useEditorStore();

  return (
    <div className="bg-background flex h-full w-full flex-col">
      <EditorTabsContainer
        onCloseAllTabs={() => void onCloseAllTabs()}
        onCloseOtherFileTabs={(...keepPageIds) => void onCloseOtherFileTabs(...keepPageIds)}
        onCloseTab={(id) => {
          const selectedTab = tabs.find((tab) => tab.id === id);
          if (selectedTab?.tabType !== "file") {
            removeTab(id);
            return;
          }
          void onCloseTab(id);
        }}
        onSelectTab={(id) => {
          setActiveTab(id);
          if (tabs.find((tab) => tab.id === id)?.tabType !== "file") {
            return;
          }
          void onSelectPage(id);
        }}
      />
      <div className="flex-1 overflow-hidden">
        <LocramEditorContent />
      </div>
    </div>
  );
}
