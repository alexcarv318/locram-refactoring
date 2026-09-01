export type PageChangeKind = "metadata" | "content" | "topology";

export type DesktopPageDataChange = {
  version: number;
  entity_kind: "page";
  operation: "insert" | "update" | "delete";
  occurred_at: string;
  page_id: string;
  change_kind?: PageChangeKind;
  base_ref?: string;
  entry_id?: string;
};

export type DesktopLinkDataChange = {
  version: number;
  entity_kind: "link";
  operation: "insert" | "delete" | "update";
  occurred_at: string;
  source_id?: string;
  target_id?: string;
  link_type?: string;
  entity_id?: string;
  base_ref?: string;
  entry_id?: string;
};

export type DesktopDataChange = DesktopPageDataChange | DesktopLinkDataChange;

export type DataVersion = {
  version: number;
  updated_at: string;
  changes?: DesktopDataChange[];
};

export type PageSummary = {
  id: string;
  title: string;
  type: string;
  status: string;
  subject?: string[];
  tags?: string[];
  parent_id: string | null;
  created_at?: string;
  reviewed_at?: string | null;
  review_interval_days?: number | null;
  updated_at: string;
  child_count?: number;
  active_descendant_count?: number;
};

export type PageDetail = {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  subject: string[];
  tags: string[];
  parent_id: string | null;
  review_interval_days: number;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  next_review_at?: string | null;
  parent: { id: string; title: string } | null;
  sub_items: Array<{ id: string; title: string }>;
  connected_to: Array<{ id: string; title: string; link_type: string; direction: string }>;
  inline_mentions: Array<{ id: string; title: string }>;
};

export type PageAncestorItem = {
  id: string;
  title: string;
  parent_id: string | null;
};

export type GraphScopeKind = "neighborhood" | "structure_anchor" | "hub_anchor";

export type PageGraphNode = {
  id: string;
  title: string;
  type: string;
  status: string;
  scope_origin?: "seed" | "context";
  subject: string[];
  tags: string[];
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  review_interval_days?: number | null;
  snippet: string;
};

export type PageGraphLink = {
  source: string;
  target: string;
  type: string;
};

export type PageGraph = {
  selected_page_id: string;
  scope_kind: GraphScopeKind;
  nodes: PageGraphNode[];
  links: PageGraphLink[];
};

export type ScopeGraph = {
  scope_id: string;
  scope_kind?: "base" | "smart_folder";
  preset_id?: string | null;
  nodes: PageGraphNode[];
  links: PageGraphLink[];
};

export type AttachmentSummary = {
  filename: string;
  content_type: string;
  size_bytes: number;
  embed: string;
  url: string;
};

export type BaseStats = {
  page_count: number | null;
  active_page_count: number | null;
  embedded_count?: number | null;
  link_count: number | null;
  size_bytes: number | null;
  orphan_count?: number | null;
  unembedded_count?: number | null;
  due_for_review_count?: number | null;
};

export type AgentAccessMode = "write" | "read" | "hidden";

export type BaseRegistryEntry = {
  entry_id: string;
  path: string;
  base_id: string;
  display_name: string;
  base_kind: string | null;
  artifact_kind?: string | null;
  file_role?: string | null;
  open_result?: string | null;
  open_detail?: string | null;
  is_active: boolean;
  agent_access_mode: AgentAccessMode;
  visible_in_mcp: boolean;
  last_opened_at: string | null;
  last_open_succeeded_at?: string | null;
  last_open_error?: string | null;
  registered_at: string;
  stats?: BaseStats | null;
  duplicate_warning?: string | null;
  duplicate_base_count?: number;
  duplicate_entry_ids?: string[] | null;
  duplicate_paths?: string[] | null;
};

export type ManagedBaseSummary = {
  kind: "ggl" | "documentation";
  label: string;
  base_key: string;
  base_ref: string;
  content_kind: string;
  read_only: boolean;
  visibility: string;
  mounted_version: string | null;
  updated_at: string;
  path: string;
  base_id: string | null;
  source_url: string | null;
  integrity_ref: string | null;
  bootstrap_source: string | null;
  locale: string | null;
  available_locales: string[];
  documentation_assets: ManagedBaseDocumentationAssetsReference | null;
  remote_manifest_url: string | null;
  remote_artifact_url: string | null;
  refresh_configured: boolean;
  stats: BaseStats | null;
  semantic_status?: "ready" | "pending" | "unknown";
  semantic_ready?: boolean | null;
  semantic_pending_count?: number | null;
  semantic_status_label?: string | null;
  semantic_status_detail?: string | null;
};

export type ManagedBaseDocumentationAssetReference = {
  asset_url: string;
  integrity_ref: string | null;
};

export type ManagedBaseDocumentationAssetsReference = {
  asset_base_url: string | null;
  asset_manifest_url: string | null;
  asset_manifest_integrity_ref: string | null;
  assets_by_locale: Record<string, Record<string, ManagedBaseDocumentationAssetReference>> | null;
};

export type MigrationResult = {
  pre_migration_backup: string | null;
  applied_migrations: string[];
};

export type RestoreResult = {
  restored_from: string;
  restored_from_path?: string | null;
  pre_restore_backup: string | null;
};

export type RuntimeSummary = {
  locram_home?: string;
  db_path: string;
  active_base: BaseRegistryEntry | null;
};

export type DesktopEditionCapabilities = {
  brokerEnrollment: boolean;
  managedPublicMcp: boolean;
  localMcpToolVisibility: boolean;
  managedUpdates: boolean;
  docsGglUpdates: boolean;
  multiBase: boolean;
  shareBase: boolean;
  agentBaseAdministration: boolean;
};

export type DesktopEditionMetadata = {
  edition: "free" | "pro";
  productName: string;
  capabilities: DesktopEditionCapabilities;
};

export type DesktopActivationState =
  | "free"
  | "not_activated"
  | "reauth_required"
  | "signed_out"
  | "failed_retryable"
  | "failed_terminal"
  | "active";

export type DesktopActivationAttempt = {
  state: "pending" | "succeeded" | "failed_retryable" | "failed_terminal";
  observedAt: string;
  message: string | null;
  errorCode: string | null;
  retryable: boolean;
  activationSessionId?: string | null;
  approvalUrl?: string | null;
  expiresAt?: string | null;
  transferSessionId?: string | null;
};

export type DesktopEntitlementLeaseStatus = {
  state: "missing" | "invalid" | "active" | "grace" | "expired" | "revoked";
  verified: boolean;
  reason: string;
  issuedAt?: string | null;
  subscriptionStatus?: string | null;
  planCode?: string | null;
  licenseRootId: string | null;
  licenseSeatId: string | null;
  expiresAt: string | null;
  graceUntil: string | null;
  revokedAt: string | null;
  source?: "canonical" | "bootstrap" | "refresh" | null;
  lastRefreshOutcome?:
    | "refreshed"
    | "unchanged"
    | "unavailable"
    | "invalid_candidate"
    | "stale_candidate"
    | null;
  lastRefreshAt?: string | null;
};

export type DesktopUsableCapabilities = {
  managedPublicMcp: boolean;
  localMcpToolVisibility: boolean;
  browserAccountSetup: boolean;
  shareBase: boolean;
  multiBase: boolean;
  managedUpdates: boolean;
  docsGglUpdates: boolean;
  agentBaseAdministration: boolean;
};

export type DesktopActivationStatus = {
  edition: "free" | "pro";
  productName: string;
  state: DesktopActivationState;
  activationRequired: boolean;
  brokerEnrollmentAvailable: boolean;
  networkFeaturesUsable: boolean;
  usableCapabilities: DesktopUsableCapabilities;
  lastAttempt: DesktopActivationAttempt | null;
  entitlementLease: DesktopEntitlementLeaseStatus | null;
};

export type McpToolVisibilityGroup = {
  family: string;
  label: string;
  description: string;
  required: boolean;
  default_enabled_free: boolean;
  default_enabled_pro: boolean;
  destructive: boolean;
  enabled: boolean;
  default_enabled: boolean;
  tools: string[];
};

export type McpToolVisibilitySettings = {
  edition: DesktopEditionMetadata;
  activation: DesktopActivationStatus;
  canManage: boolean;
  groups: McpToolVisibilityGroup[];
  enabledGroups: Record<string, boolean>;
  visibleTools: string[];
  effective_now: boolean;
  pending: boolean;
  requires_restart: boolean;
};

export type DesktopUserSettings = {
  noteLanguageName: string;
  noteLanguageOptions: string[];
  effectiveNow: boolean;
};

export type ManualEmbedOutcome = {
  embedded: number;
  skipped: number;
  failed: number;
  model: string | null;
  warning?: string | null;
  requested_base_id?: string | null;
  requested_base_ref?: string | null;
};

export type BackupSummary = {
  filename: string;
  path?: string | null;
  size_bytes: number;
  created_at: string;
  trigger: string;
  artifact_id?: string;
  base_id?: string | null;
  source_base_id?: string | null;
  display_name?: string | null;
  page_count?: number | null;
  active_page_count?: number | null;
  link_count?: number | null;
  artifact_class?: string | null;
};

export type ArtifactInspection = {
  path: string;
  artifact_class: string;
  compatibility: string;
  base_id: string | null;
  artifact_id: string | null;
  display_name: string | null;
  schema_version: number | null;
  artifact_schema_family?: string | null;
  artifact_schema_version?: number | null;
  created_at: string | null;
  package_label?: string | null;
  page_count: number;
  active_page_count?: number | null;
  link_count: number;
  orphan_count?: number | null;
  unembedded_count?: number | null;
  due_for_review_count?: number | null;
  source_base_id: string | null;
  provenance_summary?: string | null;
  attachment_coverage_label?: string | null;
  valid_actions: string[];
  errors: string[];
  summary: string;
};

export type MergePlanSummary = {
  source_path: string;
  source_artifact_id: string | null;
  source_base_id: string | null;
  target_base_id: string;
  target_display_name: string;
  incoming_page_count: number;
  incoming_link_count: number;
  new_page_count: number;
  new_link_count: number;
  already_present_count: number;
  duplicate_candidate_count: number;
  blocked_conflict_count: number;
  provenance_coverage_summary: string;
  duplicate_candidates: Array<{
    source_page_id: string;
    source_title: string;
    target_page_id: string;
    target_title: string;
    reason: string;
  }>;
  blocked_conflicts: Array<{
    page_id: string;
    title: string;
    reason: string;
  }>;
};

export type ExportRequest = {
  page_ids?: string[];
  preset_id?: string;
  filter?: {
    selectionEncoding?: "explicit" | "legacy-unrestricted-empty";
    searchQuery: string;
    types: string[];
    statuses: string[];
    subjects: string[];
    tags: string[];
    metadataRuleGroups: Array<{
      id: string;
      joiner: "and" | "or";
      negated?: boolean;
      rules: Array<{
        field: "title" | "subject" | "tag";
        id: string;
        operator: "contains" | "does_not_contain" | "has_any_of" | "has_all_of" | "has_none_of";
        values: string[];
      }>;
    }>;
    linkTypes: string[];
    createdAt: { from: string; to: string };
    updatedAt: { from: string; to: string };
    reviewedAt: { from: string; to: string };
  };
  page_type?: string;
  status?: string;
  subject?: string;
  tag?: string;
  include_all?: boolean;
  package_label?: string;
  output_path?: string;
};

export type ExportResult = {
  artifact_id: string;
  output_path: string;
  page_count: number;
  link_count: number;
  attachment_coverage_label: string;
};

export type MergeOutcomeSummary = {
  merge_operation_id: string;
  backup_filename: string;
  inserted_page_count: number;
  inserted_link_count: number;
  already_present_count: number;
  duplicate_candidate_warning_count: number;
  blocked_conflict_count: number;
};

export type SessionBootstrap = {
  active_base: BaseRegistryEntry | null;
  desktop_operating_mode?: string;
  data_version: DataVersion;
  db_path: string;
  thin_client_recovery?: ThinClientRecoveryGuidance;
  thin_client_session_authority?: string;
  thin_client_session_state?: string;
  thin_client_startup_state?: string;
};

export type ThinClientRecoveryAction =
  | "none"
  | "wait"
  | "reconnect"
  | "reauthenticate"
  | "re_enroll";

export type ThinClientRecoveryGuidance = {
  recommended_action: ThinClientRecoveryAction;
  available_actions: ThinClientRecoveryAction[];
  reconnect_route?: string | null;
  enroll_route?: string | null;
  browser_reauth_available: boolean;
  requires_redemption_code: boolean;
};

export type AccessStatusSummary = {
  enabled: boolean;
  mode: string;
  state: string;
  enrollment_material_present: boolean;
  credential_material_present: boolean;
  runtime_running: boolean;
  access_url: string | null;
  observed_at: string;
  identity: string | null;
  last_error: string | null;
  details: {
    account_actor_ref?: string;
    recipient_actor_ref?: string;
    actor_ref?: string;
    [key: string]: string | undefined;
  };
};

export type AccessCredentialRecordSummary = {
  mode: string;
  identity: string | null;
  access_url: string | null;
  enrollment_data: Record<string, string>;
  credential_data: Record<string, string>;
  updated_at: string | null;
};

export type AccessRuntimeStateSummary = {
  mode: string;
  state: string;
  observed_at: string;
  details: Record<string, string>;
  last_error: string | null;
};

export type AnalyticsConsentSummary = {
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
};

export type AccountIdentitySummary = {
  email: string | null;
  display_name: string | null;
  account_id: string | null;
  analyticsConsent?: AnalyticsConsentSummary;
};

export type AccessSummary = {
  status: AccessStatusSummary;
  record: AccessCredentialRecordSummary | null;
  runtime_state: AccessRuntimeStateSummary | null;
  onboarding: Record<string, string>;
  accountIdentity?: AccountIdentitySummary;
};

export type PendingAuthorizationRequest = {
  request_id: string;
  device_id: string;
  client_id: string;
  redirect_uri: string;
  resource: string;
  code_challenge: string;
  code_challenge_method: string;
  status: string;
  created_at: string;
  expires_at: string;
  state: string | null;
};

export type ConnectedOAuthSession = {
  token_id: string;
  client_id: string;
  device_id: string;
  connector_label: string;
  redirect_uri: string;
  client_source: string;
  client_profile: string;
  scope: string;
  issued_at: string;
  auth_time: string | null;
  access_expires_at: string;
  refresh_expires_at: string | null;
  amr: string | null;
  audience: string | null;
  access_active: boolean;
  refresh_active: boolean;
  session_state: "active" | "refreshable" | "expired" | string;
};

export type AccessRecoverResult = {
  status: AccessSummary["status"];
  recovery: ThinClientRecoveryGuidance;
  reaction: {
    kind:
      | "none"
      | "wait"
      | "reconnect_started"
      | "reauthenticate_required"
      | "re_enroll_required";
  };
  runtime_result?: AccessRuntimeResult;
};

export type AccessIdentitySummary = {
  owner_actor_ref: string | null;
  recipient_actor_ref: string | null;
  analyticsConsent?: AnalyticsConsentSummary;
};

export type BaseShareGrantPermission = "read" | "write" | "admin";
export type BaseShareGrantState = "active" | "expired" | "revoked";

export type BaseShareGrantRecord = {
  grant_id: string;
  owner_actor_ref: string;
  recipient_actor_ref: string;
  base_id: string;
  entry_id: string | null;
  permission: BaseShareGrantPermission;
  created_at: string;
  last_invited_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
};

export type BaseShareInvite = {
  grant_id: string;
  recipient_actor_ref: string;
  recipient_account_id: string | null;
  share_base_id: string;
  share_entry_id?: string | null;
  share_base_title: string;
  permission: BaseShareGrantPermission;
  transport_envelope: BaseShareTransportEnvelope;
  owner_display_name: string;
  grant_created_at?: string | null;
  expires_at: string | null;
  broker_base_url: string;
  device_id: string;
  base_stats?: BaseStats | null;
  share_invite_url: string;
};

export type BaseShareTransportEnvelope = {
  broker_base_url: string;
  device_id: string;
  owner_access_url: string;
  owner_proof_key_id: string;
  owner_proof_issued_at: string;
  owner_proof: string;
  base_share_grant_id: string;
  recipient_actor_ref: string;
  recipient_account_id?: string;
  share_base_id: string;
  share_entry_id?: string;
  share_base_title: string;
  permission: BaseShareGrantPermission;
  grant_created_at?: string;
  owner_display_name?: string;
  expires_at?: string;
  message?: string;
};

export type BaseShareSessionState = "ready" | "unavailable" | "revoked" | "expired";

export type ResolvedBaseShareSession = {
  session_id: string;
  label: string;
  state: BaseShareSessionState;
  share_base_id: string;
  share_base_title: string;
  permission: BaseShareGrantPermission;
  recipient_actor_ref: string;
  recipient_account_id: string | null;
  broker_base_url: string;
  device_id: string;
  owner_access_url?: string | null;
  owner_display_name?: string | null;
  share_entry_id?: string | null;
  grant_created_at?: string | null;
  activated_at?: string | null;
  base_stats?: BaseStats | null;
  transport_envelope: BaseShareTransportEnvelope;
};

export type OwnerBaseShareManagementItem = BaseShareGrantRecord & {
  recipient_account_id: string | null;
  share_base_title: string | null;
  grant_state: BaseShareGrantState;
  activation_state?: "created" | "pending" | "active";
  invite: BaseShareInvite | null;
  invite_error?: string;
  base_stats?: BaseStats | null;
  registered_at?: string | null;
  base_path?: string | null;
};

export type RecipientBaseShareViewItem = BaseShareGrantRecord & {
  recipient_account_id: string | null;
  share_base_title: string;
  owner_display_name?: string | null;
  grant_state: BaseShareGrantState;
  session_state?: BaseShareSessionState | null;
  activation_state?: "active";
  visible_in_mcp: boolean;
  base_stats?: BaseStats | null;
  authority_db_path?: string | null;
  authority_available?: boolean;
  authority_home_path?: string | null;
};

export type AccessRuntimeResult = {
  action: string;
  pid: number | null;
  details: string | null;
};

export type PageSearchHit = {
  id: string;
  title: string;
  type: string;
  status: string;
  snippet: string;
  rank: number | null;
  sources: string[];
  distance: number | null;
  match_kind: string;
};

export type NetworkItemGroup = "Built-in" | "Visible" | "Mounted";

export type ProjectionState =
  | "public_only"
  | "connected_available"
  | "connected_active"
  | "degraded"
  | "unavailable";

export type CapabilityAuthorizationState =
  | "implicit"
  | "granted"
  | "missing"
  | "invalid";

export type CapabilityVisibility =
  | "public"
  | "connected"
  | "restricted";

export type CapabilityFlags = {
  has_public_mcp_projection: boolean;
  has_connected_projection: boolean;
  has_update_authority: boolean;
  has_governance_authority: boolean;
  has_registry_authority: boolean;
};

export type NetworkItem = {
  id: string;
  kind: "network_control_plane";
  group: NetworkItemGroup;
  label: string;
  hostname: string;
  summary: string;
  status: string;
  status_summary: string;
  projection_state: ProjectionState;
  is_builtin: boolean;
  icon_hint: string;
  capability_flags: CapabilityFlags;
  updated_at: string;
};

export type ReleaseInfo = {
  product: string;
  channel: string;
  current_version: string;
  recommended_version: string;
  minimum_supported_version: string;
  update_policy: string;
  artifact_url: string;
  artifact_kind: string;
  release_notes_summary: string;
  install_guidance: string;
  published_at: string;
  runtime_family?: string;
  edition?: string;
  platform?: string;
  architecture?: string;
  publication_id?: string | null;
  manual_artifact?: {
    url: string;
    kind: string;
    signature?: string | null;
    integrity_ref?: string | null;
    target?: string | null;
  } | null;
  updater_artifact?: {
    url: string;
    kind: string;
    signature?: string | null;
    integrity_ref?: string | null;
    target?: string | null;
  } | null;
  updater_target?: string | null;
  update_feed_url?: string | null;
};

export type ReleaseArtifactRecord = {
  url: string;
  kind: string;
  signature?: string | null;
  integrity_ref?: string | null;
  target?: string | null;
};

export type ReleasePublicationRecord = {
  publication_id: string;
  publication_family: string;
  bundle_kind: string;
  bundle_version: string;
  artifact_url: string;
  artifact_kind: string;
  integrity_ref: string;
  compatibility_ref: string | null;
  publication_state: string;
  visibility_tier: string;
  summary_text: string;
  created_at: string;
  published_at: string;
  published_by_ref: string;
  runtime_family: string;
  edition: string;
  platform: string;
  architecture: string;
  manual_artifact?: ReleaseArtifactRecord | null;
  updater_artifact?: ReleaseArtifactRecord | null;
};

export type ReleaseManifestRecord = {
  manifest_id: string;
  publication_family: string;
  version: string;
  channel_scope: string[];
  publication_ids: string[];
  published_at: string;
  publication_state: string;
  visibility_tier: string;
  compatibility_ref: string | null;
  summary_text: string;
  install_guidance: string;
  minimum_supported_version: string;
  recommended_version: string;
  update_policy: string;
};

export type ReleaseLineageRecord = {
  lineage_id: string;
  source_authority_id: string;
  publication_id: string;
  approved_by_ref: string;
  published_by_ref: string;
  published_at: string;
};

export type ReleaseFamilyCatalog = {
  publication_family: string;
  publication_records: ReleasePublicationRecord[];
  release_manifests: ReleaseManifestRecord[];
  lineage_records: ReleaseLineageRecord[];
};

export type ReleaseChannelPointerRecord = {
  channel_name: string;
  active_manifest_id: string;
  previous_manifest_id: string | null;
  updated_at: string;
  updated_by_ref: string;
  pointer_reason: string;
  state: string;
};

export type ReleaseChannelTransitionRecord = {
  transition_id: string;
  transition_kind: string;
  channel_name: string;
  from_manifest_id: string | null;
  to_manifest_id: string;
  occurred_at: string;
  actor_ref: string;
  reason: string;
  rollback_id: string | null;
};

export type ReleaseRollbackRecord = {
  rollback_id: string;
  channel_name: string;
  from_manifest_id: string;
  to_manifest_id: string;
  initiated_at: string;
  initiated_by_ref: string;
  rollback_reason: string;
  incident_ref: string | null;
};

export type ReleaseChannelHistory = {
  channel_pointer: ReleaseChannelPointerRecord;
  movement_history: ReleaseChannelTransitionRecord[];
  rollback_records: ReleaseRollbackRecord[];
  release_manifests: ReleaseManifestRecord[];
  publication_records: ReleasePublicationRecord[];
};

export type GovernanceInfo = {
  governance_version: string;
  minimum_client_version: string;
  summary: string;
  status: string;
};

export type ConnectedStatus = {
  id: string;
  kind: "network_control_plane";
  label: string;
  hostname: string;
  status: string;
  status_summary: string;
  projection_state: ProjectionState;
  capability_flags: CapabilityFlags;
  read_surface: string[];
  default_page_id: string | null;
  update_state: ReleaseInfo | null;
  governance_state: GovernanceInfo | null;
  updated_at: string;
};

export type SourceCapabilityKey =
  | "surface"
  | "software"
  | "governance"
  | "registry"
  | "updates"
  | "releases"
  | "operator";

export type SourceCapability = {
  source_key: SourceCapabilityKey;
  label: string;
  readable: boolean;
  visibility: CapabilityVisibility;
  authorization_state: CapabilityAuthorizationState;
  granted_actions: string[];
  actor_ref: string | null;
  actor_role: string | null;
  item_count: number | null;
  detail: string | null;
};

export type CapabilitySummary = {
  projection_state: ProjectionState;
  connected_actor_ref: string | null;
  sources: SourceCapability[];
};

export type MountedGovernanceBundleView = {
  bundle_id: string;
  bundle_version: string;
  built_at: string;
  change_note: string;
  is_current_selection: boolean;
  is_historical_bundle: boolean;
  mounted_page_count: number;
};

export type MountedGovernanceState = {
  selection_key: string;
  bundle_kind: string;
  bundle_scope: string;
  active_bundle_id: string;
  previous_bundle_id: string | null;
  active_bundle_version: string;
  selected_at: string;
  selected_by_ref: string;
  selection_reason: string;
  available_bundles: MountedGovernanceBundleView[];
};

export type MountedGovernancePage = {
  mounted_page_id: string;
  source_document_id: string;
  title: string;
  canonical_namespace: string;
  summary: string;
  content: string;
  selection_key: string;
  mounted_bundle_id: string;
  mounted_bundle_version: string;
  mounted_bundle_kind: string;
  mounted_bundle_scope: string;
  mounted_at: string;
  selected_at: string;
  selected_by_ref: string;
  selection_reason: string;
  source_version_marker: string;
  source_updated_at: string;
  source_publication_state: string;
  mutation_state: string;
  provenance_plane: string;
  overlay_plane: string;
  is_overlay: boolean;
};

export type JsonPrimitive = boolean | number | string | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue;
};

export type RuntimePage = {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  updated_at: string;
};

export type SearchHit = {
  id: string;
  title: string;
  summary: string;
  snippet: string;
  updated_at: string;
};
