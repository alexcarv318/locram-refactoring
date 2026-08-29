from collections.abc import Callable
from typing import Protocol, TypeVar

from starlette.applications import Starlette

_Function = TypeVar("_Function", bound=Callable[..., object])


class MCPServerApp(Protocol):
    def tool(self) -> Callable[[_Function], _Function]: ...
    def run(self) -> None: ...
    def streamable_http_app(self) -> Starlette: ...
