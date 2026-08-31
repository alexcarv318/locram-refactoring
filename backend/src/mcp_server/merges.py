from dependencies import (
    get_backup_repository,
    get_link_repository,
    get_merge_repository,
    get_page_repository,
    get_session,
    get_working_base,
)
from interfaces.services.merges import IMergeService
from schemas.merges import MergeOutcome, MergePlan
from services.backups import BackupService
from services.merges import MergeService

from .protocol import MCPServerApp


def get_merge_service(
    base_ref: str | None = None,
    write: bool = False,
    recipient_actor_ref: str | None = None,
) -> IMergeService:
    if write:
        get_working_base(base_ref, True)

    return MergeService(
        merge_repository=get_merge_repository(db=get_session(base_ref=base_ref, write=write)),
        page_repository=get_page_repository(
            base_ref=base_ref,
            recipient_actor_ref=recipient_actor_ref,
        ),
        link_repository=get_link_repository(
            base_ref=base_ref,
            recipient_actor_ref=recipient_actor_ref,
        ),
        backup_service=BackupService(
            backup_repository=get_backup_repository(base_ref=base_ref, write=write)
        ),
    )


def merge_plan(path: str, base_ref: str | None = None) -> MergePlan:
    return get_merge_service(base_ref=base_ref).plan(path)


def merge_execute(path: str, base_ref: str | None = None) -> MergeOutcome:
    return get_merge_service(base_ref=base_ref, write=True).execute(path)


def register(mcp: MCPServerApp) -> None:
    mcp.tool()(merge_plan)
    mcp.tool()(merge_execute)
