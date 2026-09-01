from fastapi import APIRouter, Depends

from dependencies import get_bridge_service, get_change_service
from interfaces.services.bridge import IBridgeService
from interfaces.services.changes import IChangeService
from schemas.bridge import (
    DesktopActivationRequest,
    DesktopActivationStatus,
    HealthResponse,
    RuntimeSummary,
    SessionBootstrap,
)

bridge_router = APIRouter(prefix="/api")


@bridge_router.get("/health", response_model=HealthResponse)
def get_health(
    bridge_service: IBridgeService = Depends(get_bridge_service),
) -> HealthResponse:
    return bridge_service.health()


@bridge_router.get("/runtime", response_model=RuntimeSummary)
def get_runtime(
    bridge_service: IBridgeService = Depends(get_bridge_service),
) -> RuntimeSummary:
    return bridge_service.runtime()


@bridge_router.get("/session/bootstrap", response_model=SessionBootstrap)
def get_session_bootstrap(
    bridge_service: IBridgeService = Depends(get_bridge_service),
    change_service: IChangeService = Depends(get_change_service),
) -> SessionBootstrap:
    return bridge_service.session_bootstrap(change_service.get_data_version())


@bridge_router.get("/desktop/activation", response_model=DesktopActivationStatus)
def get_desktop_activation(
    bridge_service: IBridgeService = Depends(get_bridge_service),
) -> DesktopActivationStatus:
    return bridge_service.desktop_activation()


@bridge_router.post("/desktop/activation", response_model=DesktopActivationStatus)
def post_desktop_activation(
    payload: DesktopActivationRequest | None = None,
    bridge_service: IBridgeService = Depends(get_bridge_service),
) -> DesktopActivationStatus:
    machine_label = None if payload is None else payload.machine_label

    return bridge_service.start_or_continue_desktop_activation(machine_label)
