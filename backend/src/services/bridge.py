from shutil import which

from pydantic import ValidationError

import database
from interfaces.services.access import IAccessService
from interfaces.services.bases import IBaseRegistryService
from interfaces.services.bridge import IBridgeService
from interfaces.services.mcp_tools import IMcpToolService
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
from schemas.embeddings import EmbeddingProviderKind, EmbeddingSettings


class BridgeService(IBridgeService):
    def __init__(
        self,
        base_registry_service: IBaseRegistryService,
        access_service: IAccessService,
        mcp_tool_service: IMcpToolService,
    ) -> None:
        self._base_registry_service = base_registry_service
        self._access_service = access_service
        self._mcp_tool_service = mcp_tool_service

    @staticmethod
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    def runtime(self) -> RuntimeSummary:
        active_base = self._base_registry_service.get_active()
        db_path = str(database.knowledge_path)

        if active_base is not None:
            db_path = active_base.path

        return RuntimeSummary(
            locram_home=str(database.locram_home),
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

    def desktop_edition(self) -> DesktopEditionStatus:
        return self._access_service.desktop_edition()

    def desktop_activation(self) -> DesktopActivationStatus:
        return self._access_service.desktop_activation_status()

    def start_or_continue_desktop_activation(
        self,
        machine_label: str | None,
    ) -> DesktopActivationStatus:
        return self._access_service.start_or_continue_desktop_activation(machine_label)

    def sign_out(self) -> DesktopActivationStatus:
        return self._access_service.sign_out()

    def forget_device(self) -> DesktopActivationStatus:
        return self._access_service.forget_device()

    def desktop_setup_status(self) -> DesktopSetupStatus:
        settings = self._embedding_settings()
        launcher = self._mcp_tool_service.ensure_launcher()
        first_run_complete = database.host_state_path.is_file() or database.knowledge_path.is_file()
        ollama_available = which(settings.ollama_bin or "ollama") is not None
        embed_model_ready = self._embed_model_ready(settings, ollama_available)

        return DesktopSetupStatus(
            first_run_complete=first_run_complete,
            bootstrap_complete=first_run_complete,
            embedding_runtime_phase="ready" if embed_model_ready else "pending",
            embedding_runtime_last_error=None,
            embedding_runtime_detail=None,
            embedding_runtime_attempt_count=0,
            embeddings_usable=embed_model_ready,
            embed_provider=settings.provider.value,
            embed_model=settings.model,
            ollama_available=ollama_available,
            embed_model_ready=embed_model_ready,
            http_mcp_background_service=False,
            embed_runner_background_service=False,
            desktop_mcp_launcher=launcher.is_file(),
            desktop_mcp_launcher_path=str(launcher),
            locram_home=str(database.locram_home),
        )

    @staticmethod
    def track_analytics() -> AnalyticsTrackResponse:
        return AnalyticsTrackResponse(status="ok")

    def _embed_model_ready(self, settings: EmbeddingSettings, ollama_available: bool) -> bool:
        if settings.provider is EmbeddingProviderKind.OLLAMA:
            return ollama_available

        if settings.provider is EmbeddingProviderKind.HUGGINGFACE:
            return settings.huggingface_api_key_configured

        return self._access_service.desktop_activation_status().network_features_usable

    @staticmethod
    def _embedding_settings() -> EmbeddingSettings:
        settings = EmbeddingSettings()

        if database.embedding_settings_path.is_file():
            try:
                settings = EmbeddingSettings.model_validate_json(
                    database.embedding_settings_path.read_text()
                )
            except (OSError, ValidationError):
                settings = EmbeddingSettings()

        settings.huggingface_api_key_configured = database.huggingface_api_key_path.is_file()

        return settings
