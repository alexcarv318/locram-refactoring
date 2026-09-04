from abc import ABC, abstractmethod

from schemas.bridge import (
    AnalyticsTrackResponse,
    DesktopActivationStatus,
    DesktopEditionStatus,
    DesktopSetupStatus,
    HealthResponse,
    RuntimeSummary,
    SessionBootstrap,
)
from schemas.changes import DataVersion


class IBridgeService(ABC):
    """Bridge: desktop sidecar probes.

    Health, runtime, session bootstrap, desktop activation, setup status, and
    analytics ingest for the React app.
    """

    @abstractmethod
    def health(self) -> HealthResponse: ...

    @abstractmethod
    def runtime(self) -> RuntimeSummary: ...

    @abstractmethod
    def session_bootstrap(self, data_version: DataVersion) -> SessionBootstrap: ...

    @abstractmethod
    def desktop_edition(self) -> DesktopEditionStatus: ...

    @abstractmethod
    def desktop_activation(self) -> DesktopActivationStatus: ...

    @abstractmethod
    def start_or_continue_desktop_activation(
        self,
        machine_label: str | None,
    ) -> DesktopActivationStatus: ...

    @abstractmethod
    def sign_out(self) -> DesktopActivationStatus: ...

    @abstractmethod
    def forget_device(self) -> DesktopActivationStatus: ...

    @abstractmethod
    def desktop_setup_status(self) -> DesktopSetupStatus: ...

    @abstractmethod
    def track_analytics(self) -> AnalyticsTrackResponse: ...
