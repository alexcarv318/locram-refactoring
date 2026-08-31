from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from dependencies import get_access_service, get_sharing_service
from exceptions.sharing import SharedBaseSessionError
from interfaces.services.access import IAccessService
from interfaces.services.sharing import ISharingService
from schemas.access import (
    AccessEnrollRequest,
    AccessIdentityResponse,
    AccessRecoverResponse,
    AccessRuntimeActionResponse,
    AccessShareSessionResolveRequest,
    AccessSummaryResponse,
    BrokerActionResponse,
    ConnectedSessionListResponse,
    PendingAuthorizationListResponse,
    ResolvedShareSessionResponse,
)
from schemas.sharing import BaseShareSessionErrorBody, BaseShareSessionRequest

access_router = APIRouter(prefix="/api/access")


@access_router.get("", response_model=AccessSummaryResponse)
def get_access_summary(
    access_service: IAccessService = Depends(get_access_service),
) -> AccessSummaryResponse:
    return AccessSummaryResponse(item=access_service.summary())


@access_router.get("/identity", response_model=AccessIdentityResponse)
def get_access_identity(
    access_service: IAccessService = Depends(get_access_service),
) -> AccessIdentityResponse:
    return AccessIdentityResponse(item=access_service.identity())


@access_router.post("/enroll", response_model=AccessSummaryResponse)
def enroll_access(
    payload: AccessEnrollRequest,
    access_service: IAccessService = Depends(get_access_service),
) -> AccessSummaryResponse:
    return AccessSummaryResponse(item=access_service.enroll(payload))


@access_router.post("/connect", response_model=AccessRuntimeActionResponse)
def connect_access(
    access_service: IAccessService = Depends(get_access_service),
) -> AccessRuntimeActionResponse:
    return AccessRuntimeActionResponse(item=access_service.connect())


@access_router.post("/reconnect", response_model=AccessRuntimeActionResponse)
def reconnect_access(
    access_service: IAccessService = Depends(get_access_service),
) -> AccessRuntimeActionResponse:
    return AccessRuntimeActionResponse(item=access_service.reconnect())


@access_router.post("/disconnect", response_model=AccessRuntimeActionResponse)
def disconnect_access(
    access_service: IAccessService = Depends(get_access_service),
) -> AccessRuntimeActionResponse:
    return AccessRuntimeActionResponse(item=access_service.disconnect())


@access_router.post("/recover", response_model=AccessRecoverResponse)
def recover_access(
    access_service: IAccessService = Depends(get_access_service),
) -> AccessRecoverResponse:
    return AccessRecoverResponse(item=access_service.recover())


@access_router.get("/pending-authorizations", response_model=PendingAuthorizationListResponse)
def list_pending_authorizations(
    access_service: IAccessService = Depends(get_access_service),
) -> PendingAuthorizationListResponse:
    return PendingAuthorizationListResponse(items=access_service.list_pending_authorizations())


@access_router.post(
    "/pending-authorizations/{request_id}/approve",
    response_model=BrokerActionResponse,
)
def approve_pending_authorization(
    request_id: str,
    access_service: IAccessService = Depends(get_access_service),
) -> BrokerActionResponse:
    return BrokerActionResponse(item=access_service.approve_pending_authorization(request_id))


@access_router.get("/connected-sessions", response_model=ConnectedSessionListResponse)
def list_connected_sessions(
    access_service: IAccessService = Depends(get_access_service),
) -> ConnectedSessionListResponse:
    return ConnectedSessionListResponse(items=access_service.list_connected_sessions())


@access_router.post("/connected-sessions/{client_id}/revoke", response_model=BrokerActionResponse)
def revoke_connected_session(
    client_id: str,
    access_service: IAccessService = Depends(get_access_service),
) -> BrokerActionResponse:
    return BrokerActionResponse(item=access_service.revoke_connected_session(client_id))


@access_router.post("/connected-sessions/revoke-all", response_model=BrokerActionResponse)
def revoke_all_connected_sessions(
    access_service: IAccessService = Depends(get_access_service),
) -> BrokerActionResponse:
    return BrokerActionResponse(item=access_service.revoke_all_connected_sessions())


@access_router.post("/base-share-sessions/resolve", response_model=ResolvedShareSessionResponse)
def resolve_share_session(
    payload: AccessShareSessionResolveRequest,
    access_service: IAccessService = Depends(get_access_service),
) -> ResolvedShareSessionResponse:
    return ResolvedShareSessionResponse(item=access_service.resolve_share_session(payload))


@access_router.post("/base-share-grants/session")
def owner_share_session(
    payload: BaseShareSessionRequest,
    sharing_service: ISharingService = Depends(get_sharing_service),
) -> JSONResponse:
    try:
        result = sharing_service.run_session(payload)
    except SharedBaseSessionError as error:
        return JSONResponse(
            status_code=error.status_code,
            content=BaseShareSessionErrorBody(
                error=error.error_code,
                session_state="unavailable",
                reason=str(error),
            ).model_dump(),
        )

    return JSONResponse(content=result.model_dump(exclude_none=True, mode="json"))
