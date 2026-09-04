from fastapi import APIRouter, Depends

from dependencies import get_mcp_tool_service
from interfaces.services.mcp_tools import IMcpToolService
from schemas.mcp_tools import McpToolVisibilityPatch, McpToolVisibilitySettings

mcp_tools_router = APIRouter(prefix="/api/desktop")


@mcp_tools_router.get("/mcp-tools", response_model=McpToolVisibilitySettings)
def get_mcp_tools(
    mcp_tool_service: IMcpToolService = Depends(get_mcp_tool_service),
) -> McpToolVisibilitySettings:
    return mcp_tool_service.visibility()


@mcp_tools_router.patch("/mcp-tools", response_model=McpToolVisibilitySettings)
def patch_mcp_tools(
    payload: McpToolVisibilityPatch,
    mcp_tool_service: IMcpToolService = Depends(get_mcp_tool_service),
) -> McpToolVisibilitySettings:
    return mcp_tool_service.update_visibility(payload.enabled_groups)
