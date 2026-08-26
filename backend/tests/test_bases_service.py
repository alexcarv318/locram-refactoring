from pathlib import Path

import pytest

from database import open_knowledge_session
from exceptions.bases import (
    ActiveBaseError,
    BaseFileExistsError,
    BaseFileNotFoundError,
    BaseNotFoundError,
    WorkingBaseNotFoundError,
)
from exceptions.pages import PageNotFoundError
from repositories.links import LinkRepository
from repositories.pages import PageRepository
from schemas.bases import AgentAccessMode
from schemas.pages import PageCreate
from services.bases import BaseRegistryService
from services.pages import PageService


def test_create_list_switch_rename_and_access_mode(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    created = base_registry_service.create(str(tmp_path / "notes.db"), "Notes", activate=True)
    items = base_registry_service.list_bases()
    active = base_registry_service.get_active()

    assert created.display_name == "Notes"
    assert created.is_active is True
    assert created.visible_in_mcp is True
    assert any(item.entry_id == created.entry_id for item in items)
    assert active is not None
    assert active.entry_id == created.entry_id

    other = base_registry_service.create(str(tmp_path / "other.db"), "Other", activate=False)
    switched = base_registry_service.switch(other.entry_id)
    renamed = base_registry_service.rename(other.entry_id, "Renamed")
    hidden = base_registry_service.set_agent_access_mode(other.entry_id, AgentAccessMode.HIDDEN)

    assert switched.is_active is True
    assert renamed.display_name == "Renamed"
    assert hidden.agent_access_mode is AgentAccessMode.HIDDEN
    assert hidden.visible_in_mcp is False


def test_register_refreshes_existing_path(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    path = tmp_path / "shared.db"
    created = base_registry_service.create(str(path), "First", activate=False)
    again = base_registry_service.register(str(path), activate=False, display_name=None)

    assert again.entry_id == created.entry_id
    assert again.base_id == created.base_id


def test_unregister_and_delete_rules(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    active = base_registry_service.create(str(tmp_path / "active.db"), "Active", activate=True)
    spare = base_registry_service.create(str(tmp_path / "spare.db"), "Spare", activate=False)
    path = Path(spare.path)

    with pytest.raises(ActiveBaseError):
        base_registry_service.unregister(active.entry_id)

    with pytest.raises(ActiveBaseError):
        base_registry_service.delete(active.entry_id, force=False)

    base_registry_service.unregister(spare.entry_id)

    assert path.is_file()

    registered = base_registry_service.register(str(path), activate=False, display_name="Spare")
    base_registry_service.delete(registered.entry_id, force=False)

    assert path.is_file() is False

    with pytest.raises(BaseNotFoundError):
        base_registry_service.get_entry(registered.entry_id)


def test_create_and_register_path_errors(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    path = tmp_path / "once.db"
    base_registry_service.create(str(path), "Once", activate=False)

    with pytest.raises(BaseFileExistsError):
        base_registry_service.create(str(path), "Again", activate=False)

    with pytest.raises(BaseFileNotFoundError):
        base_registry_service.register(
            str(tmp_path / "missing.db"),
            activate=False,
            display_name=None,
        )


def test_working_base_select_hides_hidden(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    visible = base_registry_service.create(str(tmp_path / "visible.db"), "Visible", activate=True)
    hidden = base_registry_service.create(str(tmp_path / "hidden.db"), "Hidden", activate=False)
    base_registry_service.set_agent_access_mode(hidden.entry_id, AgentAccessMode.HIDDEN)

    listed = base_registry_service.list_working_bases()
    selected = base_registry_service.select_working_base(f"local:{visible.entry_id}")
    current = base_registry_service.get_current_working_base()

    assert [item.entry_id for item in listed] == [visible.entry_id]
    assert selected.is_current_working_base is True
    assert current is not None
    assert current.entry_id == visible.entry_id

    with pytest.raises(WorkingBaseNotFoundError):
        base_registry_service.select_working_base(f"local:{hidden.entry_id}")

    with pytest.raises(WorkingBaseNotFoundError):
        base_registry_service.select_working_base("managed:documentation")

    with pytest.raises(WorkingBaseNotFoundError):
        base_registry_service.select_working_base("local:")


def test_empty_registry_creates_default_active_base(
    base_registry_service: BaseRegistryService,
) -> None:
    items = base_registry_service.list_bases()
    current = base_registry_service.get_current_working_base()

    assert len(items) == 1
    assert items[0].display_name == "locram"
    assert items[0].is_active is True
    assert current is not None
    assert current.is_current_working_base is True
    assert current.is_local_active_base is True


def test_switch_missing_file_and_missing_entry(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    entry = base_registry_service.create(str(tmp_path / "gone.db"), "Gone", activate=False)
    Path(entry.path).unlink()

    with pytest.raises(BaseFileNotFoundError):
        base_registry_service.switch(entry.entry_id)

    with pytest.raises(BaseNotFoundError):
        base_registry_service.switch("01MISSINGENTRY00000000000000")

    with pytest.raises(BaseNotFoundError):
        base_registry_service.get_entry("01MISSINGENTRY00000000000000")


def test_force_delete_active_switches_to_replacement(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    active = base_registry_service.create(str(tmp_path / "active.db"), "Active", activate=True)
    spare = base_registry_service.create(str(tmp_path / "spare.db"), "Spare", activate=False)
    active_path = Path(active.path)

    base_registry_service.select_working_base(f"local:{active.entry_id}")
    base_registry_service.delete(active.entry_id, force=True)

    remaining = base_registry_service.get_active()

    current = base_registry_service.get_current_working_base()

    assert remaining is not None
    assert remaining.entry_id == spare.entry_id
    assert active_path.is_file() is False
    assert current is not None
    assert current.entry_id == spare.entry_id


def test_hidden_active_base_is_not_current_working_base(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    active = base_registry_service.create(str(tmp_path / "hidden.db"), "Hidden", activate=True)
    base_registry_service.set_agent_access_mode(active.entry_id, AgentAccessMode.HIDDEN)

    assert base_registry_service.get_current_working_base() is None
    assert base_registry_service.list_working_bases() == []


def test_pages_stay_in_the_base_that_created_them(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    first = base_registry_service.create(str(tmp_path / "one.db"), "One", activate=True)
    first_session = open_knowledge_session(Path(first.path))
    first_pages = PageService(PageRepository(first_session), LinkRepository(first_session))
    page = first_pages.create_page(PageCreate(title="Only here"))

    second = base_registry_service.create(str(tmp_path / "two.db"), "Two", activate=True)
    second_session = open_knowledge_session(Path(second.path))
    second_pages = PageService(PageRepository(second_session), LinkRepository(second_session))

    with pytest.raises(PageNotFoundError):
        second_pages.get_page(page.id)

    assert first_pages.get_page(page.id).title == "Only here"
