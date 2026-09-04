from dependencies import (
    get_access_http_client,
    get_access_relay,
    get_access_repository,
    get_access_service,
    get_access_settings,
    get_export_repository,
    get_link_repository,
    get_page_repository,
    get_smart_folder_repository,
    get_working_base,
)
from dependencies import get_link_service as load_link_service
from dependencies import get_smart_folder_service as load_smart_folder_service
from interfaces.services.exports import IExportService
from schemas.exports import (
    ArtifactInspection,
    ExportDeletedResponse,
    ExportListResponse,
    ExportResult,
    ExportScope,
)
from schemas.smart_folders import FilterState
from services.exports import ExportService

from .protocol import MCPServerApp, register_tools


def get_export_service(
    base_ref: str | None = None,
    write: bool = False,
    recipient_actor_ref: str | None = None,
) -> IExportService:
    if write:
        get_working_base(base_ref, True)

    page_repository = get_page_repository(
        base_ref=base_ref,
        recipient_actor_ref=recipient_actor_ref,
    )
    link_repository = get_link_repository(
        base_ref=base_ref,
        recipient_actor_ref=recipient_actor_ref,
    )

    return ExportService(
        export_repository=get_export_repository(base_ref=base_ref, write=write),
        page_repository=page_repository,
        smart_folder_service=load_smart_folder_service(
            smart_folder_repository=get_smart_folder_repository(),
            page_repository=page_repository,
            link_repository=link_repository,
            link_service=load_link_service(
                link_repository=link_repository,
                page_repository=page_repository,
            ),
            access_service=get_access_service(
                access_repository=get_access_repository(),
                access_relay=get_access_relay(),
                http_client=get_access_http_client(),
                settings=get_access_settings(),
            ),
        ),
        access_service=get_access_service(
            access_repository=get_access_repository(),
            access_relay=get_access_relay(),
            http_client=get_access_http_client(),
            settings=get_access_settings(),
        ),
    )


def artifact_list_exports(base_ref: str | None = None) -> ExportListResponse:
    return ExportListResponse(items=get_export_service(base_ref=base_ref).list_exports())


def artifact_inspect_artifact(path: str, base_ref: str | None = None) -> ArtifactInspection:
    return get_export_service(base_ref=base_ref).inspect_artifact(path)


def artifact_delete_export(
    artifact_id: str,
    base_ref: str | None = None,
) -> ExportDeletedResponse:
    return get_export_service(base_ref=base_ref, write=True).delete_export_by_artifact_id(
        artifact_id
    )


def export_subgraph(
    page_ids: list[str] | None = None,
    filter_state: FilterState | None = None,
    preset_id: str | None = None,
    page_type: str | None = None,
    status: str | None = None,
    subject: str | None = None,
    tag: str | None = None,
    include_all: bool = False,
    package_label: str | None = None,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> ExportResult:
    return get_export_service(
        base_ref=base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).export_subgraph(
        ExportScope(
            page_ids=page_ids or [],
            filter=filter_state,
            preset_id=preset_id,
            page_type=page_type,
            status=status,
            subject=subject,
            tag=tag,
            include_all=include_all,
            package_label=package_label,
        )
    )


def register(mcp: MCPServerApp) -> None:
    register_tools(
        mcp,
        artifact_list_exports,
        artifact_inspect_artifact,
        artifact_delete_export,
        export_subgraph,
    )
