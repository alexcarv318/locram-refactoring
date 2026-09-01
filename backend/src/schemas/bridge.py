from pydantic import BaseModel, ConfigDict, Field

from schemas.bases import RegistryEntryRecord
from schemas.changes import DataVersion


class HealthResponse(BaseModel):
    status: str


class RuntimeSummary(BaseModel):
    locram_home: str
    db_path: str
    active_base: RegistryEntryRecord | None


class SessionBootstrap(BaseModel):
    active_base: RegistryEntryRecord | None
    data_version: DataVersion
    db_path: str
    desktop_operating_mode: str = "local"


class DesktopUsableCapabilities(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    managed_public_mcp: bool = Field(serialization_alias="managedPublicMcp")
    local_mcp_tool_visibility: bool = Field(serialization_alias="localMcpToolVisibility")
    browser_account_setup: bool = Field(serialization_alias="browserAccountSetup")
    share_base: bool = Field(serialization_alias="shareBase")
    multi_base: bool = Field(serialization_alias="multiBase")
    managed_updates: bool = Field(serialization_alias="managedUpdates")
    docs_ggl_updates: bool = Field(serialization_alias="docsGglUpdates")
    agent_base_administration: bool = Field(serialization_alias="agentBaseAdministration")


class DesktopActivationAttempt(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    state: str
    observed_at: str = Field(serialization_alias="observedAt")
    message: str | None = None
    error_code: str | None = Field(default=None, serialization_alias="errorCode")
    retryable: bool
    activation_session_id: str | None = Field(
        default=None,
        serialization_alias="activationSessionId",
    )
    approval_url: str | None = Field(default=None, serialization_alias="approvalUrl")
    expires_at: str | None = Field(default=None, serialization_alias="expiresAt")
    transfer_session_id: str | None = Field(
        default=None,
        serialization_alias="transferSessionId",
    )


class DesktopActivationRequest(BaseModel):
    machine_label: str | None = None


class DesktopActivationStatus(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    edition: str
    product_name: str = Field(serialization_alias="productName")
    state: str
    activation_required: bool = Field(serialization_alias="activationRequired")
    broker_enrollment_available: bool = Field(serialization_alias="brokerEnrollmentAvailable")
    network_features_usable: bool = Field(serialization_alias="networkFeaturesUsable")
    usable_capabilities: DesktopUsableCapabilities = Field(serialization_alias="usableCapabilities")
    last_attempt: DesktopActivationAttempt | None = Field(
        default=None,
        serialization_alias="lastAttempt",
    )
    entitlement_lease: None = Field(default=None, serialization_alias="entitlementLease")
