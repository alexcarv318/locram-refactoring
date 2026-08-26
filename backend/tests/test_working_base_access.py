from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from exceptions.bases import (
    WorkingBaseMutationTargetError,
    WorkingBaseNotFoundError,
    WorkingBaseReadOnlyError,
)
from schemas.bases import AgentAccessMode
from services.bases import BaseRegistryService


def test_resolve_local_base_ref(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    created = base_registry_service.create(str(tmp_path / "notes.db"), "Notes", activate=True)
    working_base = base_registry_service.get_working_base(
        base_ref=f"local:{created.entry_id}",
        write=False,
    )

    assert working_base.entry_id == created.entry_id
    assert working_base.path == created.path


def test_resolve_hidden_base_is_not_found(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    created = base_registry_service.create(str(tmp_path / "hidden.db"), "Hidden", activate=True)
    base_registry_service.set_agent_access_mode(created.entry_id, AgentAccessMode.HIDDEN)

    with pytest.raises(WorkingBaseNotFoundError):
        base_registry_service.get_working_base(
            base_ref=f"local:{created.entry_id}",
            write=False,
        )


def test_resolve_read_base_blocks_writes(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    created = base_registry_service.create(str(tmp_path / "read.db"), "Read", activate=True)
    base_registry_service.set_agent_access_mode(created.entry_id, AgentAccessMode.READ)

    with pytest.raises(WorkingBaseReadOnlyError):
        base_registry_service.get_working_base(
            base_ref=f"local:{created.entry_id}",
            write=True,
        )


def test_implicit_write_requires_base_ref_when_two_writable(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    base_registry_service.create(str(tmp_path / "one.db"), "One", activate=True)
    base_registry_service.create(str(tmp_path / "two.db"), "Two", activate=False)

    with pytest.raises(WorkingBaseMutationTargetError):
        base_registry_service.get_working_base(base_ref=None, write=True)


def test_http_write_to_read_base_is_forbidden(
    live_client: TestClient,
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    created = base_registry_service.create(str(tmp_path / "read.db"), "Read", activate=True)
    base_registry_service.set_agent_access_mode(created.entry_id, AgentAccessMode.READ)
    response = live_client.post(
        f"/api/pages?base_ref=local:{created.entry_id}",
        json={"title": "Nope", "content": "blocked"},
    )

    assert response.status_code == 403


def test_http_read_uses_base_ref(
    live_client: TestClient,
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    first = base_registry_service.create(str(tmp_path / "first.db"), "First", activate=True)
    second = base_registry_service.create(str(tmp_path / "second.db"), "Second", activate=False)
    created = live_client.post(
        f"/api/pages?base_ref=local:{second.entry_id}",
        json={"title": "Only second", "content": "scoped"},
    )
    missing = live_client.get(
        f"/api/pages/{created.json()['item']['id']}?base_ref=local:{first.entry_id}"
    )
    found = live_client.get(
        f"/api/pages/{created.json()['item']['id']}?base_ref=local:{second.entry_id}"
    )

    assert created.status_code == 201
    assert missing.status_code == 404
    assert found.status_code == 200
    assert found.json()["item"]["title"] == "Only second"
