from pathlib import Path

from fastapi.testclient import TestClient

from schemas.embeddings import EmbeddingProviderKind, EmbeddingSettingsPatch
from services.embeddings import EmbeddingService


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
