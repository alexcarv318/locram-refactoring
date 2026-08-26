from pathlib import Path

import database
from services.bases import BaseRegistryService
from services.bridge import BridgeService


def test_health_is_ok(base_registry_service: BaseRegistryService) -> None:
    bridge_service = BridgeService(base_registry_service)

    assert bridge_service.health().status == "ok"


def test_runtime_uses_default_active_base(
    base_registry_service: BaseRegistryService,
) -> None:
    runtime = BridgeService(base_registry_service).runtime()
    active = base_registry_service.get_active()

    assert runtime.locram_home == str(database.host_state_path.parent)
    assert active is not None
    assert runtime.active_base is not None
    assert runtime.active_base.entry_id == active.entry_id
    assert runtime.db_path == active.path


def test_runtime_follows_active_base_switch(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    created = base_registry_service.create(str(tmp_path / "other.db"), "Other", activate=True)
    runtime = BridgeService(base_registry_service).runtime()

    assert runtime.active_base is not None
    assert runtime.active_base.entry_id == created.entry_id
    assert runtime.db_path == created.path
