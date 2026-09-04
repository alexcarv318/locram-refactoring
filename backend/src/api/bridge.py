from fastapi import APIRouter, Depends

from dependencies import get_bridge_service, get_change_service
from interfaces.services.bridge import IBridgeService
from interfaces.services.changes import IChangeService
from schemas.bridge import (
    AnalyticsTrackRequest,
    AnalyticsTrackResponse,
    DesktopActivationRequest,
    DesktopActivationStatus,
    DesktopEditionStatus,
    DesktopSetupStatus,
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


@bridge_router.get("/desktop/edition", response_model=DesktopEditionStatus)
def get_desktop_edition(
    bridge_service: IBridgeService = Depends(get_bridge_service),
) -> DesktopEditionStatus:
    return bridge_service.desktop_edition()


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


@bridge_router.post("/desktop/activation/logout", response_model=DesktopActivationStatus)
def logout_desktop_activation(
    bridge_service: IBridgeService = Depends(get_bridge_service),
) -> DesktopActivationStatus:
    return bridge_service.sign_out()


@bridge_router.post("/desktop/activation/forget", response_model=DesktopActivationStatus)
def forget_desktop_activation(
    bridge_service: IBridgeService = Depends(get_bridge_service),
) -> DesktopActivationStatus:
    return bridge_service.forget_device()


@bridge_router.get("/setup-status", response_model=DesktopSetupStatus)
def get_setup_status(
    bridge_service: IBridgeService = Depends(get_bridge_service),
) -> DesktopSetupStatus:
    return bridge_service.desktop_setup_status()


@bridge_router.post("/desktop/analytics/track", response_model=AnalyticsTrackResponse)
def track_desktop_analytics(
    _payload: AnalyticsTrackRequest,
    bridge_service: IBridgeService = Depends(get_bridge_service),
) -> AnalyticsTrackResponse:
    return bridge_service.track_analytics()
