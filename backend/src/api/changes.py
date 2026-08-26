import time
from collections.abc import Iterator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from dependencies import (
    get_change_repository,
    get_change_service,
    get_session,
    get_working_base,
)
from interfaces.services.changes import IChangeService
from schemas.bases import WorkingBaseRecord
from schemas.changes import DataChange, DataVersion, DataVersionResponse

changes_router = APIRouter(prefix="/api")


@changes_router.get("/data-version", response_model=DataVersionResponse)
def get_data_version(
    change_service: IChangeService = Depends(get_change_service),
) -> DataVersionResponse:
    return DataVersionResponse(item=change_service.get_data_version())


@changes_router.get("/events")
def event_stream(base_ref: str | None = Query(default=None)) -> StreamingResponse:
    working_base = get_working_base(base_ref=base_ref, write=False)

    return StreamingResponse(
        stream_data_version_events(base_ref=base_ref, working_base=working_base),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


def stream_data_version_events(
    base_ref: str | None,
    working_base: WorkingBaseRecord,
) -> Iterator[str]:
    current = read_data_version(base_ref)
    yield sse_event(current)

    while True:
        time.sleep(2.0)
        latest = read_data_version(base_ref)

        if latest.version != current.version:
            latest.changes = read_changes(
                base_ref=base_ref,
                after_version=current.version,
                through_version=latest.version,
                working_base=working_base,
            )
            current = latest
            yield sse_event(current)
        else:
            yield ": keepalive\n\n"


def read_data_version(base_ref: str | None) -> DataVersion:
    session = get_session(base_ref=base_ref, write=False)

    try:
        change_service = get_change_service(
            change_repository=get_change_repository(db=session)
        )

        return change_service.get_data_version()
    finally:
        session.close()


def read_changes(
    base_ref: str | None,
    after_version: int,
    through_version: int,
    working_base: WorkingBaseRecord,
) -> list[DataChange]:
    session = get_session(base_ref=base_ref, write=False)

    try:
        change_service = get_change_service(
            change_repository=get_change_repository(db=session)
        )

        return change_service.list_changes(
            after_version=after_version,
            through_version=through_version,
            base_ref=working_base.base_ref,
            entry_id=working_base.entry_id,
        )
    finally:
        session.close()


def sse_event(payload: DataVersion) -> str:
    return f"event: data-version\ndata: {payload.model_dump_json(exclude_none=True)}\n\n"
