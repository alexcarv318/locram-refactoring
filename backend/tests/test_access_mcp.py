import mcp_server.access as mcp_access
from schemas.access import AccessState
from services.access import AccessService


def test_mcp_access_tools(mcp_access_service: AccessService) -> None:
    summary = mcp_access.access_summary()
    identity = mcp_access.access_identity()

    assert summary.status.state is AccessState.ENROLLMENT_REQUIRED
    assert identity.owner_actor_ref is None
