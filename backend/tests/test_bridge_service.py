from pathlib import Path

import database
from repositories.mcp_tools import McpToolVisibilityRepository
from schemas.changes import DataVersion
from services.access import AccessService
from services.bases import BaseRegistryService
from services.bridge import BridgeService
from services.mcp_tools import McpToolService


def make_bridge(
    base_registry_service: BaseRegistryService,
    access_service: AccessService,
) -> BridgeService:
    return BridgeService(
        base_registry_service,
        access_service,
        McpToolService(
            McpToolVisibilityRepository(database.mcp_tool_visibility_path),
            access_service,
        ),
    )


def test_health_is_ok(
    base_registry_service: BaseRegistryService,
    access_service: AccessService,
) -> None:
    bridge_service = make_bridge(base_registry_service, access_service)

    assert bridge_service.health().status == "ok"


def test_runtime_uses_default_active_base(
    base_registry_service: BaseRegistryService,
    access_service: AccessService,
) -> None:
    runtime = make_bridge(base_registry_service, access_service).runtime()
    active = base_registry_service.get_active()

    assert runtime.locram_home == str(database.locram_home)
    assert active is not None
    assert runtime.active_base is not None
    assert runtime.active_base.entry_id == active.entry_id
    assert runtime.db_path == active.path


def test_runtime_follows_active_base_switch(
    base_registry_service: BaseRegistryService,
    access_service: AccessService,
    tmp_path: Path,
) -> None:
    created = base_registry_service.create(str(tmp_path / "other.db"), "Other", activate=True)
    runtime = make_bridge(base_registry_service, access_service).runtime()

    assert runtime.active_base is not None
    assert runtime.active_base.entry_id == created.entry_id
    assert runtime.db_path == created.path


def test_session_bootstrap_uses_runtime_and_data_version(
    base_registry_service: BaseRegistryService,
    access_service: AccessService,
) -> None:
    runtime = make_bridge(base_registry_service, access_service).runtime()
    bootstrap = make_bridge(base_registry_service, access_service).session_bootstrap(
        DataVersion(version=3, updated_at="2026-09-01T00:00:00Z")
    )

    assert bootstrap.active_base == runtime.active_base
    assert bootstrap.db_path == runtime.db_path
    assert bootstrap.data_version.version == 3


def test_desktop_activation_is_unsigned_when_empty(
    base_registry_service: BaseRegistryService,
    access_service: AccessService,
) -> None:
    activation = make_bridge(base_registry_service, access_service).desktop_activation()

    assert activation.state == "free"
    assert activation.edition == "free"
    assert activation.usable_capabilities.multi_base is False
    assert activation.activation_required is True
    assert activation.last_attempt is None


def test_desktop_edition_is_free_when_unsigned(
    base_registry_service: BaseRegistryService,
    access_service: AccessService,
) -> None:
    edition = make_bridge(base_registry_service, access_service).desktop_edition()

    assert edition.edition == "free"
    assert edition.product_name == "Locram"
    assert edition.capabilities.multi_base is False
    assert edition.capabilities.share_base is False
