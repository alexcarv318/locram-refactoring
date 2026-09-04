from collections.abc import Callable
from functools import wraps
from typing import Protocol, TypeVar

from mcp.server.mcpserver.exceptions import ToolError
from starlette.applications import Starlette

from exceptions.app import AppError

_Function = TypeVar("_Function", bound=Callable[..., object])


class MCPServerApp(Protocol):
    def tool(self) -> Callable[[_Function], _Function]: ...
    def run(self) -> None: ...
    def streamable_http_app(self) -> Starlette: ...


def wrap_app_error[**Parameters, Result](
    function: Callable[Parameters, Result],
) -> Callable[Parameters, Result]:
    @wraps(function)
    def wrapped(*args: Parameters.args, **kwargs: Parameters.kwargs) -> Result:
        try:
            return function(*args, **kwargs)
        except AppError as error:
            raise ToolError(str(error)) from error

    return wrapped


def register_tools(mcp: MCPServerApp, *functions: Callable[..., object]) -> None:
    for function in functions:
        mcp.tool()(wrap_app_error(function))
