from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import database
from repositories.access import AccessRepository
from repositories.embeddings import EmbeddingRepository
from repositories.pages import PageRepository
from schemas.embeddings import (
    EmbeddingProviderKind,
    EmbeddingSettingsPatch,
    HostedEmbeddingBootstrapCredential,
)
from services.access import AccessService
from services.embeddings import EmbeddingService, LocramHostedEmbeddingProvider


def _hosted_service(db: Session) -> EmbeddingService:
    return EmbeddingService(
        EmbeddingRepository(db),
        PageRepository(db),
        AccessRepository(
            database.access_path,
            database.access_credentials_path,
            database.accepted_shares_path,
        ),
    )


def _write_bootstrap_credential(installation_id: str = "install-one") -> None:
    expires_at = (datetime.now(UTC) + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    database.hosted_embedding_bootstrap_path.parent.mkdir(parents=True, exist_ok=True)
    database.hosted_embedding_bootstrap_path.write_text(
        HostedEmbeddingBootstrapCredential(
            installation_id=installation_id,
            token="bootstrap-token",
            model="bge-m3",
            expires_at=expires_at,
            updated_at="2026-01-01T00:00:00Z",
        ).model_dump_json()
    )


def test_default_settings_are_hosted(embedding_service: EmbeddingService) -> None:
    settings = embedding_service.get_settings()

    assert settings.provider is EmbeddingProviderKind.LOCRAM_HOSTED
    assert settings.model == "bge-m3"
    assert settings.huggingface_api_key_configured is False


def test_update_settings_stores_key_separately(
    embedding_service: EmbeddingService,
    tmp_path: Path,
) -> None:
    updated = embedding_service.update_settings(
        EmbeddingSettingsPatch.model_validate(
            {
                "provider": EmbeddingProviderKind.HUGGINGFACE,
                "huggingfaceApiKey": "hf_secret",
            }
        )
    )

    assert updated.provider is EmbeddingProviderKind.HUGGINGFACE
    assert updated.huggingface_api_key_configured is True
    assert "hf_secret" not in (tmp_path / "preferences" / "embedding-settings.json").read_text()
    assert (tmp_path / "preferences" / "huggingface-api-key").read_text() == "hf_secret"


def test_http_embedding_settings_round_trip(client: TestClient) -> None:
    fetched = client.get("/api/desktop/embedding-settings")
    patched = client.patch(
        "/api/desktop/embedding-settings",
        json={"provider": "ollama", "ollamaUrl": "http://127.0.0.1:11434"},
    )
    bootstrapped = client.post("/api/desktop/embedding-settings/bootstrap")

    assert fetched.status_code == 200
    assert fetched.json()["item"]["provider"] == "locram_hosted"
    assert patched.status_code == 200
    assert patched.json()["item"]["provider"] == "ollama"
    assert patched.json()["item"]["ollama_url"] == "http://127.0.0.1:11434"
    assert "huggingface_api_key" not in patched.json()["item"]
    assert bootstrapped.status_code == 200
    assert bootstrapped.json()["item"]["status_lines"][0] == "provider=ollama"


def test_hosted_provider_uses_enrolled_access(
    enrolled_access: AccessService,
    db: Session,
) -> None:
    assert enrolled_access.summary().status.credential_material_present is True
    provider = _hosted_service(db).provider()

    assert type(provider) is LocramHostedEmbeddingProvider
    assert provider.ready is True
    assert provider.model == "bge-m3"
    assert provider._device_id == "device-one"


def test_hosted_provider_uses_bootstrap_without_enroll(db: Session) -> None:
    _write_bootstrap_credential()
    provider = _hosted_service(db).provider()

    assert type(provider) is LocramHostedEmbeddingProvider
    assert provider.ready is True
    assert provider._device_id == "install-one"


def test_hosted_provider_prefers_relay_over_bootstrap(
    enrolled_access: AccessService,
    db: Session,
) -> None:
    _write_bootstrap_credential()
    provider = _hosted_service(db).provider()

    assert enrolled_access.summary().status.credential_material_present is True
    assert type(provider) is LocramHostedEmbeddingProvider
    assert provider._device_id == "device-one"


def test_bootstrap_mints_hosted_credentials(
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    expires_at = (datetime.now(UTC) + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = (
        b'{"access_token":"minted-token","installation_id":"install-minted",'
        b'"model":"bge-m3","expires_at":"' + expires_at.encode() + b'"}'
    )

    class FakeResponse:
        def read(self) -> bytes:
            return body

        def __enter__(self) -> "FakeResponse":
            return self

        def __exit__(self, *_args: object) -> None:
            return None

    def fake_urlopen(request: object, timeout: int = 30, **_kwargs: object) -> FakeResponse:
        return FakeResponse()

    monkeypatch.setattr("services.embeddings.urllib.request.urlopen", fake_urlopen)
    service = _hosted_service(db)
    result = service.bootstrap()
    provider = service.provider()

    assert "ready=True" in result.status_lines
    assert type(provider) is LocramHostedEmbeddingProvider
    assert provider.ready is True
    assert provider._device_id == "install-minted"
