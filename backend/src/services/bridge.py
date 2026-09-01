import database
from interfaces.services.access import IAccessService
from interfaces.services.bases import IBaseRegistryService
from interfaces.services.bridge import IBridgeService
from schemas.bridge import (
    DesktopActivationStatus,
    HealthResponse,
    RuntimeSummary,
    SessionBootstrap,
)
from schemas.changes import DataVersion


class BridgeService(IBridgeService):
    def __init__(
        self,
        base_registry_service: IBaseRegistryService,
        access_service: IAccessService,
    ) -> None:
        self._base_registry_service = base_registry_service
        self._access_service = access_service

    @staticmethod
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    def runtime(self) -> RuntimeSummary:
        active_base = self._base_registry_service.get_active()
        db_path = str(database.knowledge_path)

        if active_base is not None:
            db_path = active_base.path

        return RuntimeSummary(
            locram_home=str(database.host_state_path.parent),
            db_path=db_path,
            active_base=active_base,
        )

    def session_bootstrap(self, data_version: DataVersion) -> SessionBootstrap:
        runtime = self.runtime()

        return SessionBootstrap(
            active_base=runtime.active_base,
            data_version=data_version,
            db_path=runtime.db_path,
        )

    def desktop_activation(self) -> DesktopActivationStatus:
        return self._access_service.desktop_activation_status()

    def start_or_continue_desktop_activation(
        self,
        machine_label: str | None,
    ) -> DesktopActivationStatus:
        return self._access_service.start_or_continue_desktop_activation(machine_label)
