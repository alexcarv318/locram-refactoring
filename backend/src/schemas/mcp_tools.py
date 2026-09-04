from pydantic import BaseModel, ConfigDict, Field

from schemas.bridge import DesktopActivationStatus, DesktopEditionStatus

MCP_TOOL_FAMILY_ORDER: tuple[str, ...] = (
    "basic_notes_graph",
    "multi_base_working_set",
    "local_base_administration",
    "artifacts_export",
    "merge_transfer",
    "backups_restore",
    "smart_folders",
    "diagnostics",
    "destructive_tools",
    "indexing_maintenance",
)


class McpToolFamilyPolicy(BaseModel):
    family: str
    label: str
    description: str
    required: bool
    default_enabled_free: bool
    default_enabled_pro: bool
    destructive: bool = False
    capability: str | None = None


class McpToolPolicy(BaseModel):
    tool_name: str
    family: str
    default_visible_free: bool
    default_visible_pro: bool
    capability: str | None = None
    destructive_group_required: bool = False


MCP_TOOL_FAMILY_POLICIES: dict[str, McpToolFamilyPolicy] = {
    "basic_notes_graph": McpToolFamilyPolicy(
        family="basic_notes_graph",
        label="Basic notes and graph",
        description="Required local note, graph, retrieval, and asset tools.",
        required=True,
        default_enabled_free=True,
        default_enabled_pro=True,
    ),
    "multi_base_working_set": McpToolFamilyPolicy(
        family="multi_base_working_set",
        label="Accessible bases",
        description="Accessible base tools for local, managed, and shared working sets.",
        required=False,
        default_enabled_free=True,
        default_enabled_pro=True,
    ),
    "local_base_administration": McpToolFamilyPolicy(
        family="local_base_administration",
        label="Local base administration",
        description="Create, register, switch, rename, unregister and delete local bases.",
        required=False,
        default_enabled_free=False,
        default_enabled_pro=False,
        capability="agent_base_administration",
    ),
    "artifacts_export": McpToolFamilyPolicy(
        family="artifacts_export",
        label="Artifacts and export",
        description="Artifact inspection, export listing and subgraph export tools.",
        required=False,
        default_enabled_free=False,
        default_enabled_pro=True,
        capability="multi_base",
    ),
    "merge_transfer": McpToolFamilyPolicy(
        family="merge_transfer",
        label="Merge and transfer",
        description="Merge planning and execution tools.",
        required=False,
        default_enabled_free=False,
        default_enabled_pro=True,
        capability="multi_base",
    ),
    "backups_restore": McpToolFamilyPolicy(
        family="backups_restore",
        label="Backups and restore",
        description="Backup listing, creation, rename, deletion and restore tools.",
        required=False,
        default_enabled_free=False,
        default_enabled_pro=True,
        capability="multi_base",
    ),
    "smart_folders": McpToolFamilyPolicy(
        family="smart_folders",
        label="Smart folders",
        description="Smart-folder preset and graph preview tools.",
        required=False,
        default_enabled_free=False,
        default_enabled_pro=True,
        capability="multi_base",
    ),
    "diagnostics": McpToolFamilyPolicy(
        family="diagnostics",
        label="Diagnostics",
        description="Access status and embedding capability diagnostics.",
        required=False,
        default_enabled_free=False,
        default_enabled_pro=False,
    ),
    "destructive_tools": McpToolFamilyPolicy(
        family="destructive_tools",
        label="Destructive tools",
        description="High-impact delete, purge, restore and execution paths.",
        required=False,
        default_enabled_free=False,
        default_enabled_pro=False,
        destructive=True,
    ),
    "indexing_maintenance": McpToolFamilyPolicy(
        family="indexing_maintenance",
        label="Indexing maintenance",
        description="Embedding storage and indexing maintenance tools.",
        required=False,
        default_enabled_free=False,
        default_enabled_pro=False,
    ),
}


def mcp_tool(
    tool_name: str,
    family: str,
    *,
    free: bool = False,
    pro: bool = False,
    capability: str | None = None,
    destructive_group_required: bool = False,
) -> McpToolPolicy:
    return McpToolPolicy(
        tool_name=tool_name,
        family=family,
        default_visible_free=free,
        default_visible_pro=pro,
        capability=capability,
        destructive_group_required=destructive_group_required,
    )


MCP_TOOL_POLICIES: dict[str, McpToolPolicy] = {
    policy.tool_name: policy
    for policy in (
        mcp_tool("create_page", "basic_notes_graph", free=True, pro=True),
        mcp_tool("get_page", "basic_notes_graph", free=True, pro=True),
        mcp_tool("update_page", "basic_notes_graph", free=True, pro=True),
        mcp_tool("delete_page", "basic_notes_graph", free=True, pro=True),
        mcp_tool("restore_page", "basic_notes_graph", free=True, pro=True),
        mcp_tool("purge_page", "basic_notes_graph", pro=True, destructive_group_required=True),
        mcp_tool("mark_reviewed", "basic_notes_graph", free=True, pro=True),
        mcp_tool("promote_page", "basic_notes_graph", free=True, pro=True),
        mcp_tool("list_pages", "basic_notes_graph", free=True, pro=True),
        mcp_tool("search", "basic_notes_graph", free=True, pro=True),
        mcp_tool("get_page_ancestry", "basic_notes_graph", free=True, pro=True),
        mcp_tool("get_inline_link", "basic_notes_graph", free=True, pro=True),
        mcp_tool("replace_in_page", "basic_notes_graph", free=True, pro=True),
        mcp_tool("link_pages", "basic_notes_graph", free=True, pro=True),
        mcp_tool("unlink_pages", "basic_notes_graph", free=True, pro=True),
        mcp_tool("batch_link", "basic_notes_graph", free=True, pro=True),
        mcp_tool("set_parent", "basic_notes_graph", free=True, pro=True),
        mcp_tool("get_attachment", "basic_notes_graph", free=True, pro=True),
        mcp_tool("save_attachment", "basic_notes_graph", free=True, pro=True),
        mcp_tool("render_mermaid", "basic_notes_graph", free=True, pro=True),
        mcp_tool("hybrid_search", "basic_notes_graph", free=True, pro=True),
        mcp_tool("working_base_list_bases", "multi_base_working_set", free=True, pro=True),
        mcp_tool("working_base_get_current_base", "multi_base_working_set", free=True, pro=True),
        mcp_tool("working_base_select_base", "multi_base_working_set", free=True, pro=True),
        mcp_tool("sharing_list_owner_grants", "multi_base_working_set", pro=True, capability="share_base"),
        mcp_tool("sharing_create_grant", "multi_base_working_set", pro=True, capability="share_base"),
        mcp_tool("sharing_revoke_grant", "multi_base_working_set", pro=True, capability="share_base"),
        mcp_tool(
            "sharing_delete_grant",
            "multi_base_working_set",
            pro=True,
            capability="share_base",
            destructive_group_required=True,
        ),
        mcp_tool("base_register_base", "local_base_administration", capability="agent_base_administration"),
        mcp_tool("base_create_base", "local_base_administration", capability="agent_base_administration"),
        mcp_tool("base_switch_base", "local_base_administration", capability="agent_base_administration"),
        mcp_tool("base_rename_base", "local_base_administration", capability="agent_base_administration"),
        mcp_tool("base_unregister_base", "local_base_administration", capability="agent_base_administration"),
        mcp_tool(
            "base_delete_base",
            "local_base_administration",
            capability="agent_base_administration",
            destructive_group_required=True,
        ),
        mcp_tool("base_set_agent_access_mode", "local_base_administration", capability="agent_base_administration"),
        mcp_tool("artifact_list_exports", "artifacts_export", pro=True, capability="multi_base"),
        mcp_tool("artifact_inspect_artifact", "artifacts_export", pro=True, capability="multi_base"),
        mcp_tool(
            "artifact_delete_export",
            "artifacts_export",
            pro=True,
            capability="multi_base",
            destructive_group_required=True,
        ),
        mcp_tool("export_subgraph", "artifacts_export", pro=True, capability="multi_base"),
        mcp_tool("merge_plan", "merge_transfer", pro=True, capability="multi_base"),
        mcp_tool("merge_execute", "merge_transfer", pro=True, capability="multi_base", destructive_group_required=True),
        mcp_tool("backup_list_backups", "backups_restore", pro=True, capability="multi_base"),
        mcp_tool("backup_create_backup", "backups_restore", pro=True, capability="multi_base"),
        mcp_tool("backup_rename_backup", "backups_restore", pro=True, capability="multi_base"),
        mcp_tool(
            "backup_delete_backup",
            "backups_restore",
            pro=True,
            capability="multi_base",
            destructive_group_required=True,
        ),
        mcp_tool(
            "backup_restore_backup",
            "backups_restore",
            pro=True,
            capability="multi_base",
            destructive_group_required=True,
        ),
        mcp_tool("list_smart_folder_presets", "smart_folders", pro=True, capability="multi_base"),
        mcp_tool("get_smart_folder_preset", "smart_folders", pro=True, capability="multi_base"),
        mcp_tool("create_smart_folder_preset", "smart_folders", pro=True, capability="multi_base"),
        mcp_tool("update_smart_folder_preset", "smart_folders", pro=True, capability="multi_base"),
        mcp_tool("delete_smart_folder_preset", "smart_folders", pro=True, capability="multi_base"),
        mcp_tool("get_smart_folder_graph", "smart_folders", pro=True, capability="multi_base"),
        mcp_tool("search_capability_status", "diagnostics"),
        mcp_tool("access_summary", "diagnostics"),
        mcp_tool("access_identity", "diagnostics"),
        mcp_tool("store_embedding", "indexing_maintenance"),
        mcp_tool("find_unembedded", "indexing_maintenance"),
        mcp_tool("find_stale_embeddings", "indexing_maintenance"),
    )
}


class McpToolVisibilityRecord(BaseModel):
    enabled_groups: dict[str, bool] = Field(default_factory=dict)


class McpToolVisibilityPatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    enabled_groups: dict[str, bool] = Field(alias="enabledGroups")


class McpToolVisibilityGroup(BaseModel):
    family: str
    label: str
    description: str
    required: bool
    default_enabled_free: bool
    default_enabled_pro: bool
    destructive: bool
    enabled: bool
    default_enabled: bool
    tools: list[str]


class McpToolVisibilitySettings(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    edition: DesktopEditionStatus
    activation: DesktopActivationStatus
    can_manage: bool = Field(serialization_alias="canManage")
    groups: list[McpToolVisibilityGroup]
    enabled_groups: dict[str, bool] = Field(serialization_alias="enabledGroups")
    visible_tools: list[str] = Field(serialization_alias="visibleTools")
    effective_now: bool
    pending: bool
    requires_restart: bool
