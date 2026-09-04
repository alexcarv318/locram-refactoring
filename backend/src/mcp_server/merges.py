from dependencies import (
    get_access_http_client,
    get_access_relay,
    get_access_repository,
    get_access_service,
    get_access_settings,
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

from .protocol import MCPServerApp, register_tools


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
        access_service=get_access_service(
            access_repository=get_access_repository(),
            access_relay=get_access_relay(),
            http_client=get_access_http_client(),
            settings=get_access_settings(),
        ),
    )


def merge_plan(path: str, base_ref: str | None = None) -> MergePlan:
    return get_merge_service(base_ref=base_ref).plan(path)


def merge_execute(path: str, base_ref: str | None = None) -> MergeOutcome:
    return get_merge_service(base_ref=base_ref, write=True).execute(path)


def register(mcp: MCPServerApp) -> None:
    register_tools(mcp, merge_plan, merge_execute)
