import type { ReactNode } from "react";
import type { ActiveSource } from "@/types/source";

export type EditorFileType = "pdf" | "txt" | "md" | "doc" | "docx" | "csv" | "xlsx" | "xls" | "json" | "xml";

export type EditorTabType =
  | "file"
  | "settings"
  | "network"
  | "sharing"
  | "shared-base-session"
  | "source";

export type SourceTabMode = "active" | "inspect";

export type SourceInspectContext = {
  entryId: string;
  isActive: boolean;
  openedFrom: "base-tree-inspect";
  path: string;
};

export interface EditorTabItem {
  id: string;
  title: string;
  tabType: EditorTabType;
  path?: string;
  content?: string;
  fileType?: EditorFileType;
  icon?: ReactNode;
  modified?: boolean;
  externalUpdatePending?: boolean;
  url?: string;
  mimeType?: string;
  isLoading?: boolean;
  error?: string;
  sharingTab?: "base-grants";
  sharedBaseSessionContext?: {
    input?: string;
  };
  sourceContext?: {
    inspectContext?: SourceInspectContext;
    mode?: SourceTabMode;
    source: ActiveSource;
    selectedNodeId?: string | null;
  };
  settingsTab?: "general" | "account" | "maintenance" | "mcp";
}
