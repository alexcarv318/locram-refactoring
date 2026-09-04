from pathlib import Path

import pytest

import mcp_server.bases as mcp_bases
from exceptions.bases import ActiveBaseError, BaseNotFoundError, WorkingBaseNotFoundError
from schemas.bases import AgentAccessMode
from services.bases import BaseRegistryService


def test_mcp_base_and_working_base_tools(
    mcp_base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    created = mcp_bases.base_create_base("Vault", str(tmp_path / "vault.db"), activate=True)
    listed = mcp_bases.working_base_list_bases()
    current = mcp_bases.working_base_get_current_base()
    selected = mcp_bases.working_base_select_base(f"local:{created.entry_id}")
    renamed = mcp_bases.base_rename_base(created.entry_id, "Vault Two")

    assert created.display_name == "Vault"
    assert [item.entry_id for item in listed.items if item.kind == "local"] == [created.entry_id]
    assert current is not None
    assert current.base_ref == f"local:{created.entry_id}"
    assert selected.is_current_working_base is True
    assert renamed.display_name == "Vault Two"

    spare = mcp_bases.base_create_base("Spare", str(tmp_path / "spare.db"), activate=False)
    unregistered = mcp_bases.base_unregister_base(spare.entry_id)
    again = mcp_bases.base_register_base(spare.path, activate=False)
    deleted = mcp_bases.base_delete_base(again.entry_id, force=False)

    assert unregistered.removed is True
    assert unregistered.entry_id == spare.entry_id
    assert deleted.deleted is True
    assert deleted.path == again.path


def test_mcp_base_errors_and_hidden(
    mcp_base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    active = mcp_bases.base_create_base("Active", str(tmp_path / "active.db"), activate=True)
    hidden = mcp_bases.base_create_base("Hidden", str(tmp_path / "hidden.db"), activate=False)
    mcp_bases.base_set_agent_access_mode(hidden.entry_id, AgentAccessMode.HIDDEN)

    with pytest.raises(ActiveBaseError):
        mcp_bases.base_unregister_base(active.entry_id)

    with pytest.raises(BaseNotFoundError):
        mcp_bases.base_switch_base("01MISSINGENTRY00000000000000")

    with pytest.raises(WorkingBaseNotFoundError):
        mcp_bases.working_base_select_base(f"local:{hidden.entry_id}")

    listed = mcp_bases.working_base_list_bases()

    assert [item.entry_id for item in listed.items if item.kind == "local"] == [active.entry_id]
