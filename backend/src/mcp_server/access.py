from dependencies import (
    get_access_http_client,
    get_access_relay,
    get_access_repository,
    get_access_settings,
)
from dependencies import get_access_service as load_access_service
from interfaces.services.access import IAccessService
from schemas.access import AccessIdentitySummary, AccessSummary

from .protocol import MCPServerApp


def get_access_service() -> IAccessService:
    return load_access_service(
        access_repository=get_access_repository(),
        access_relay=get_access_relay(),
        http_client=get_access_http_client(),
        settings=get_access_settings(),
    )


def access_summary() -> AccessSummary:
    return get_access_service().summary()


def access_identity() -> AccessIdentitySummary:
    return get_access_service().identity()


def register(mcp: MCPServerApp) -> None:
    mcp.tool()(access_summary)
    mcp.tool()(access_identity)
