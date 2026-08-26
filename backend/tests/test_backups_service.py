from pathlib import Path

import pytest

from database import open_knowledge_session
from exceptions.backups import BackupNotFoundError, BackupRestoreError, InvalidBackupFilenameError
from exceptions.pages import PageNotFoundError
from models.bases import BaseMetadata
from repositories.backups import BackupRepository
from repositories.links import LinkRepository
from repositories.pages import PageRepository
from schemas.pages import PageCreate, PageStatus
from services.backups import BackupService
from services.pages import PageService


def test_create_list_rename_and_delete(backup_service: BackupService) -> None:
    created = backup_service.create_backup("manual")
    items = backup_service.list_backups()
    renamed = backup_service.rename_backup(created.filename, "locram-renamed-20260101T000000Z.db")
    deleted = backup_service.delete_backup(renamed.filename)

    assert created.filename.startswith("locram-manual-")
    assert created.page_count == 1
    assert created.active_page_count == 1
    assert created.display_name == "Notes"
    assert created.base_id == "base-one"
    assert [item.filename for item in items] == [created.filename]
    assert renamed.filename == "locram-renamed-20260101T000000Z.db"
    assert deleted.deleted is True
    assert backup_service.list_backups() == []


def test_restore_replaces_live_database(backup_service: BackupService) -> None:
    snapshot = backup_service.create_backup("manual")
    source_path = Path(snapshot.path).parent.parent / "notes.db"
    session = open_knowledge_session(source_path)
    page_service = PageService(PageRepository(session), LinkRepository(session))
    extra = page_service.create_page(PageCreate(title="Later", content="new"))
    session.close()

    restored = backup_service.restore_backup(
        filename=snapshot.filename,
        path=None,
        allow_base_replacement=False,
    )
    session = open_knowledge_session(source_path)
    page_service = PageService(PageRepository(session), LinkRepository(session))
    pages = page_service.list_pages(
        status=PageStatus.ACTIVE,
        parent_id=None,
        roots_only=True,
        limit=10,
        offset=0,
    )

    with pytest.raises(PageNotFoundError):
        page_service.get_page(extra.id)

    session.close()

    assert restored.restored_from == snapshot.filename
    assert restored.pre_restore_backup is not None
    assert [item.title for item in pages] == ["Kept"]


def test_restore_rejects_different_base_id(
    backup_service: BackupService,
    tmp_path: Path,
) -> None:
    other_path = tmp_path / "other.db"
    session = open_knowledge_session(other_path)
    session.add(BaseMetadata(base_id="base-two", display_name="Other"))
    session.commit()
    PageService(PageRepository(session), LinkRepository(session)).create_page(
        PageCreate(title="Other", content="other")
    )
    session.close()
    other = BackupService(backup_repository=BackupRepository(source_path=other_path))
    foreign = other.create_backup("manual")

    with pytest.raises(BackupRestoreError):
        backup_service.restore_backup(
            filename=None,
            path=foreign.path,
            allow_base_replacement=False,
        )


def test_missing_and_unsafe_filenames(backup_service: BackupService) -> None:
    with pytest.raises(BackupNotFoundError):
        backup_service.delete_backup("locram-missing-20260101T000000Z.db")

    with pytest.raises(InvalidBackupFilenameError):
        backup_service.delete_backup("../secret.db")

    with pytest.raises(BackupRestoreError):
        backup_service.restore_backup(filename=None, path=None, allow_base_replacement=False)
