from pathlib import Path

import pytest
from sqlalchemy import func, select, text

from database import open_knowledge_session
from exceptions.bases import (
    ActiveBaseError,
    BaseFileExistsError,
    BaseFileNotFoundError,
    BaseNotFoundError,
    ManagedBaseKindError,
    ManagedBaseLocaleError,
    WorkingBaseNotFoundError,
)
from exceptions.pages import PageNotFoundError
from models.pages import Page
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

    assert [item.entry_id for item in listed if item.kind == "local"] == [visible.entry_id]
    assert {item.base_ref for item in listed if item.kind == "managed"} == {
        "managed:ggl",
        "managed:documentation",
    }
    assert selected.is_current_working_base is True
    assert current is not None
    assert current.entry_id == visible.entry_id

    with pytest.raises(WorkingBaseNotFoundError):
        base_registry_service.select_working_base(f"local:{hidden.entry_id}")

    managed = base_registry_service.select_working_base("managed:documentation")

    assert managed.kind == "managed"
    assert managed.base_ref == "managed:documentation"
    assert managed.agent_access_mode is AgentAccessMode.READ
    assert Path(managed.path).is_file()

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


def test_replace_active_registers_and_drops_the_previous_active(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    previous = base_registry_service.create(str(tmp_path / "old.db"), "Old", activate=True)
    next_base = base_registry_service.create(str(tmp_path / "new.db"), "New", activate=False)
    replaced = base_registry_service.replace_active(next_base.path)
    items = base_registry_service.list_bases()

    assert replaced.entry_id == next_base.entry_id
    assert replaced.is_active is True
    assert previous.entry_id not in {item.entry_id for item in items}


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
    assert [item.kind for item in base_registry_service.list_working_bases()] == [
        "managed",
        "managed",
    ]


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


def test_refresh_managed_base_copies_seed(
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    first = base_registry_service.refresh_managed_base("ggl")
    snapshot = Path(first.path)
    snapshot.write_bytes(b"stale")
    second = base_registry_service.refresh_managed_base("ggl")

    assert first.kind.value == "ggl"
    assert first.refresh_configured is True
    assert first.bootstrap_source == "packaged_seed"
    assert snapshot.is_file()
    assert snapshot.stat().st_size > 4
    assert second.path == first.path


def test_refresh_managed_base_rejects_unknown_kind_and_ggl_locale(
    base_registry_service: BaseRegistryService,
) -> None:
    with pytest.raises(ManagedBaseKindError):
        base_registry_service.refresh_managed_base("unknown")

    with pytest.raises(ManagedBaseLocaleError):
        base_registry_service.refresh_managed_base("ggl", locale="en")

    documented = base_registry_service.refresh_managed_base("documentation", locale="en")

    assert documented.kind.value == "documentation"


def test_refreshed_managed_base_can_open_pages(
    base_registry_service: BaseRegistryService,
) -> None:
    summary = base_registry_service.refresh_managed_base("ggl")
    session = open_knowledge_session(Path(summary.path))
    count = session.scalar(select(func.count()).select_from(Page))

    assert count is not None
    assert count > 0


def test_managed_seed_search_uses_pages_search_index(
    base_registry_service: BaseRegistryService,
) -> None:
    ggl = base_registry_service.refresh_managed_base("ggl")
    documentation = base_registry_service.refresh_managed_base("documentation")
    ggl_session = open_knowledge_session(Path(ggl.path))
    documentation_session = open_knowledge_session(Path(documentation.path))

    try:
        ggl_hits = PageService(
            PageRepository(ggl_session),
            LinkRepository(ggl_session),
        ).search_pages("Routing", limit=10)
        documentation_hits = PageService(
            PageRepository(documentation_session),
            LinkRepository(documentation_session),
        ).search_pages("About locram", limit=10)
        leftover_ggl = ggl_session.execute(
            text("SELECT name FROM sqlite_master WHERE name = 'pages_fts'")
        ).scalar()
        leftover_documentation = documentation_session.execute(
            text("SELECT name FROM sqlite_master WHERE name = 'pages_fts'")
        ).scalar()
    finally:
        ggl_session.close()
        documentation_session.close()

    assert any(hit.title == "Scenario Routing Map" for hit in ggl_hits)
    assert any(hit.title == "About locram" for hit in documentation_hits)
    assert leftover_ggl is None
    assert leftover_documentation is None


def test_managed_seeds_match_published_product(
    base_registry_service: BaseRegistryService,
) -> None:
    ggl = base_registry_service.refresh_managed_base("ggl")
    documentation = base_registry_service.refresh_managed_base("documentation")
    ggl_session = open_knowledge_session(Path(ggl.path))
    documentation_session = open_knowledge_session(Path(documentation.path))

    try:
        ggl_page_count = ggl_session.scalar(text("SELECT COUNT(*) FROM pages"))
        ggl_deleted_count = ggl_session.scalar(
            text("SELECT COUNT(*) FROM pages WHERE status = 'to_delete'")
        )
        ggl_link_count = ggl_session.scalar(text("SELECT COUNT(*) FROM links"))
        ggl_display_name = ggl_session.scalar(text("SELECT display_name FROM base_metadata"))
        documentation_titles = list(
            documentation_session.scalars(select(Page.title).order_by(Page.title))
        )
    finally:
        ggl_session.close()
        documentation_session.close()

    assert ggl_page_count == 84
    assert ggl_deleted_count == 0
    assert ggl_link_count == 334
    assert ggl_display_name == "Graph Governance"
    assert documentation_titles == [
        "About locram",
        "Locram Network overview",
        "Release and download guidance",
    ]
