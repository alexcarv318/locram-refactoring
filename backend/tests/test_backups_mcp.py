import mcp_server.backups as mcp_backups
from services.backups import BackupService


def test_mcp_backup_tools(mcp_backup_service: BackupService) -> None:
    created = mcp_backups.backup_create_backup(reason_label="manual")
    items = mcp_backups.backup_list_backups()
    renamed = mcp_backups.backup_rename_backup(
        created.filename,
        "locram-renamed-20260101T000000Z.db",
    )
    deleted = mcp_backups.backup_delete_backup(renamed.filename)

    assert created.filename.startswith("Notes-manual-")
    assert [item.filename for item in items.items] == [created.filename]
    assert renamed.filename == "locram-renamed-20260101T000000Z.db"
    assert deleted.deleted is True
    assert mcp_backups.backup_list_backups().items == []
