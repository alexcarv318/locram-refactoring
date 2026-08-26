from fastapi import APIRouter, Depends

from dependencies import get_bridge_service
from interfaces.services.bridge import IBridgeService
from schemas.bridge import HealthResponse, RuntimeSummary

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
