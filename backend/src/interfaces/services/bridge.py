from abc import ABC, abstractmethod

from schemas.bridge import DesktopActivationStatus, HealthResponse, RuntimeSummary, SessionBootstrap
from schemas.changes import DataVersion


class IBridgeService(ABC):
    """Bridge: desktop sidecar probes.

    Health, runtime, session bootstrap, and desktop activation status for the
    React app.
    """

    @abstractmethod
    def health(self) -> HealthResponse: ...

    @abstractmethod
    def runtime(self) -> RuntimeSummary: ...

    @abstractmethod
    def session_bootstrap(self, data_version: DataVersion) -> SessionBootstrap: ...

    @abstractmethod
    def desktop_activation(self) -> DesktopActivationStatus: ...

    @abstractmethod
    def start_or_continue_desktop_activation(
        self,
        machine_label: str | None,
    ) -> DesktopActivationStatus: ...
