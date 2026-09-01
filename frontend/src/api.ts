export { resolveBridgeBaseUrl } from "@/lib/bridgeClient";
export {
  activateDesktop,
  fetchDataVersion,
  fetchDesktopActivation,
  fetchDesktopEdition,
  forgetDesktopActivation,
  logoutDesktopActivation,
} from "@/api/runtimeApi";
export { fetchDesktopSetupStatus } from "@/api/setupStatusApi";
export type { DesktopSetupStatus } from "@/api/setupStatusApi";
export {
  bootstrapEmbeddingSettings,
  embeddingSettingsQueryKey,
  fetchEmbeddingSettings,
  updateEmbeddingSettings,
  validateHuggingFaceEmbeddingSettings,
} from "@/api/embeddingSettingsApi";
export type {
  EmbeddingBootstrapResult,
  EmbeddingProvider,
  EmbeddingRuntimePreferences,
  EmbeddingSettingsPatch,
  HuggingFaceValidationResult,
} from "@/api/embeddingSettingsApi";
export { runManualEmbed } from "@/api/manualEmbeddingApi";
export {
  fetchDesktopUserSettings,
  updateDesktopUserSettings,
} from "@/api/desktopUserSettingsApi";
export { fetchSessionBootstrap, searchPages } from "@/api/sessionApi";
export { fetchMcpToolVisibility, updateMcpToolVisibility } from "@/api/mcpToolsApi";
export {
  approvePendingAuthorization,
  connectAccess,
  disconnectAccess,
  enrollAccess,
  fetchAccessIdentity,
  fetchAccessSummary,
  fetchConnectedOAuthSessions,
  fetchPendingAuthorizations,
  recoverAccess,
  reconnectAccess,
  revokeAllConnectedOAuthSessions,
  revokeConnectedOAuthSession,
  resolveBaseShareSession,
} from "@/api/accessApi";
export {
  fetchDesktopChannelReleaseHistory,
} from "@/api/desktopReleaseHistoryApi";
export {
  backupRecipientBaseShare,
  createBaseShareGrant,
  deleteBaseShareGrant,
  fetchBaseShareInvite,
  fetchOwnerBaseShareManagement,
  fetchRecipientBaseShareView,
  removeRecipientBaseShare,
  renameRecipientBaseShare,
  revokeBaseShareGrant,
  setRecipientBaseShareMcpVisibility,
} from "@/api/sharingApi";
export {
  createBackup,
  createBase,
  deleteBase,
  executeMerge,
  fetchBackups,
  fetchBases,
  fetchMergePlan,
  inspectArtifact,
  refreshManagedBase,
  registerBase,
  renameBase,
  restoreBackup,
  setBaseAgentAccessMode,
  setBaseMcpVisibility,
  switchBase,
  unregisterBase,
} from "@/api/baseManagementApi";
export {
  fetchAttachment,
  getAttachmentUrl,
  renderMermaidAttachment,
  saveAttachment,
} from "@/api/assetsApi";
export {
  createPage,
  deletePage,
  fetchPage,
  fetchPageAncestry,
  fetchPageGraph,
  fetchPages,
  fetchPagesByParent,
  updatePage,
} from "@/api/pagesApi";
export {
  fetchNotesGraph,
  fetchNotesSummaries,
  fetchSmartFolderGraph,
  notesSummariesQueryKey,
} from "@/api/notesApi";
