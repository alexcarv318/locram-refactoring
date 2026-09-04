import json
import os
import secrets
import struct
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import ClassVar, Literal

from pydantic import ValidationError

import database
from exceptions.embeddings import (
    EmbeddingProviderError,
    EmbeddingProviderNotReadyError,
    InvalidEmbeddingError,
)
from exceptions.pages import PageNotFoundError
from interfaces.repositories.access import IAccessRepository
from interfaces.repositories.embeddings import IEmbeddingRepository
from interfaces.repositories.pages import IPageRepository
from interfaces.services.access import IAccessService
from interfaces.services.embeddings import IEmbeddingProvider, IEmbeddingService
from schemas.access import DesktopCapability
from schemas.embeddings import (
    EmbeddingBootstrapResult,
    EmbeddingCoverage,
    EmbeddingProviderKind,
    EmbeddingSettings,
    EmbeddingSettingsPatch,
    EmbeddingStoreResponse,
    EmbedRunResult,
    HostedBootstrapTokenResponse,
    HostedEmbeddingBootstrapCredential,
    HostedEmbeddingResponse,
    HuggingFaceValidationResult,
    HybridSearchHit,
    HybridSearchResult,
    SearchCapabilityStatus,
    SimilarPage,
    UnembeddedResponse,
)
from schemas.pages import PageSearchHit, PageStatus


class NullEmbeddingProvider(IEmbeddingProvider):
    @property
    def model(self) -> str:
        return ""

    @property
    def ready(self) -> bool:
        return False

    def embed(self, text: str) -> list[float]:
        raise EmbeddingProviderNotReadyError()


class OllamaEmbeddingProvider(IEmbeddingProvider):
    def __init__(self, base_url: str, model: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model

    @property
    def model(self) -> str:
        return self._model

    @property
    def ready(self) -> bool:
        return True

    def embed(self, text: str) -> list[float]:
        payload = json.dumps({"model": self._model, "input": text}).encode()
        request = urllib.request.Request(
            url=f"{self._base_url}/api/embed",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read()
        except urllib.error.HTTPError as error:
            raise EmbeddingProviderError(
                f"Ollama returned HTTP {error.code} for model '{self._model}'"
            ) from error
        except urllib.error.URLError as error:
            raise EmbeddingProviderError(f"Cannot reach Ollama at {self._base_url}") from error

        parsed = json.loads(body)
        embeddings = parsed.get("embeddings")

        if type(embeddings) is not list or embeddings == []:
            raise EmbeddingProviderError("Ollama response missing embeddings")

        first = embeddings[0]

        if type(first) is not list or first == []:
            raise EmbeddingProviderError("Ollama response missing embeddings")

        return [float(value) for value in first]


class HuggingFaceEmbeddingProvider(IEmbeddingProvider):
    _ALIASES: ClassVar[dict[str, str]] = {"bge-m3": "BAAI/bge-m3"}

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model
        self._huggingface_model = self._ALIASES.get(model, model)

    @property
    def model(self) -> str:
        return self._model

    @property
    def ready(self) -> bool:
        return self._api_key != ""

    def embed(self, text: str) -> list[float]:
        if self._api_key == "":
            raise EmbeddingProviderNotReadyError()

        payload = json.dumps({"inputs": text, "normalize": True}).encode()
        request = urllib.request.Request(
            url=(
                "https://router.huggingface.co/hf-inference/models/"
                f"{self._huggingface_model}/pipeline/feature-extraction"
            ),
            data=payload,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                body = response.read()
        except urllib.error.HTTPError as error:
            raise EmbeddingProviderError(
                f"Hugging Face returned HTTP {error.code} for model '{self._huggingface_model}'"
            ) from error
        except urllib.error.URLError as error:
            raise EmbeddingProviderError("Cannot reach Hugging Face") from error

        return self._extract_values(json.loads(body))

    @staticmethod
    def _extract_values(parsed: object) -> list[float]:
        if type(parsed) is list and parsed:
            first = parsed[0]

            if type(first) is list:
                return [float(value) for value in first]

            return [float(value) for value in parsed]

        raise EmbeddingProviderError("Hugging Face response missing embedding vector")


class LocramHostedEmbeddingProvider(IEmbeddingProvider):
    def __init__(self, device_id: str, bearer_token: str, model: str, base_url: str) -> None:
        self._device_id = device_id
        self._bearer_token = bearer_token
        self._model = model
        self._base_url = base_url.rstrip("/")

    @property
    def model(self) -> str:
        return self._model

    @property
    def ready(self) -> bool:
        return self._device_id != "" and self._bearer_token != ""

    def embed(self, text: str) -> list[float]:
        if not self.ready:
            raise EmbeddingProviderNotReadyError()

        payload = json.dumps({"model": self._model, "input": text}).encode()
        request = urllib.request.Request(
            url=f"{self._base_url}/v1/embeddings",
            data=payload,
            headers={
                "Authorization": f"Bearer {self._bearer_token}",
                "X-Locram-Device-Id": self._device_id,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                body = response.read()
        except urllib.error.HTTPError as error:
            raise EmbeddingProviderError(
                f"Locram hosted embeddings returned HTTP {error.code} for model '{self._model}'"
            ) from error
        except urllib.error.URLError as error:
            raise EmbeddingProviderError(
                f"Cannot reach Locram hosted embeddings at {self._base_url}"
            ) from error

        parsed = HostedEmbeddingResponse.model_validate_json(body)

        if parsed.data == []:
            raise EmbeddingProviderError(
                "Locram hosted embeddings response missing embedding vector"
            )

        return parsed.data[0].embedding


class EmbeddingService(IEmbeddingService):
    _RECIPROCAL_RANK_OFFSET = 60
    _VECTOR_BACKEND = "python-cosine"

    def __init__(
        self,
        embedding_repository: IEmbeddingRepository,
        page_repository: IPageRepository,
        access_repository: IAccessRepository,
        embedding_provider: IEmbeddingProvider | None = None,
        settings_path: Path | None = None,
        huggingface_api_key_path: Path | None = None,
        bootstrap_path: Path | None = None,
        access_service: IAccessService | None = None,
    ) -> None:
        self._embedding_repository = embedding_repository
        self._page_repository = page_repository
        self._access_repository = access_repository
        self._access_service = access_service
        self._fixed_provider = embedding_provider
        self._settings_path = settings_path or database.embedding_settings_path
        self._huggingface_api_key_path = (
            huggingface_api_key_path or database.huggingface_api_key_path
        )
        self._bootstrap_path = bootstrap_path or database.hosted_embedding_bootstrap_path

    def store_embedding(
        self,
        page_id: str,
        embedding: list[float],
        model: str,
        field: str,
    ) -> EmbeddingStoreResponse:
        page = self._page_repository.get(page_id)

        if page is None:
            raise PageNotFoundError(page_id)

        if not embedding:
            raise InvalidEmbeddingError()

        self._embedding_repository.store(
            page_id,
            field,
            self._pack(embedding),
            model,
            len(embedding),
            self._now(),
        )

        return EmbeddingStoreResponse(stored=True, page_id=page_id, model=model)

    def find_unembedded(self, limit: int, model: str | None) -> UnembeddedResponse:
        return UnembeddedResponse(
            page_ids=self._embedding_repository.find_unembedded(limit, model)
        )

    def find_stale_embeddings(self, model: str, limit: int) -> UnembeddedResponse:
        return UnembeddedResponse(page_ids=self._embedding_repository.find_stale(model, limit))

    def hybrid_search(self, query: str, limit: int) -> HybridSearchResult:
        provider = self.provider()
        fts_hits = self._page_repository.search(query, limit * 2)
        coverage = self._embedding_repository.get_coverage(self._active_model())

        if not provider.ready:
            return self._lexical_only(fts_hits, limit, coverage, "SEMANTIC_NOT_CONFIGURED")

        try:
            query_vector = provider.embed(query)
            vector_hits = self._embedding_repository.search_similar(
                query_vector,
                provider.model,
                limit * 2,
            )
        except (EmbeddingProviderNotReadyError, EmbeddingProviderError):
            return self._lexical_only(fts_hits, limit, coverage, "EMBEDDING_PROVIDER_UNAVAILABLE")

        merged = self._merge_hits(fts_hits, vector_hits, limit)

        return HybridSearchResult(
            results=merged,
            coverage=coverage,
            semantic_available=True,
            fallback_reason_code=None,
            sources_used=["fts", "semantic"],
        )

    def capability_status(self) -> SearchCapabilityStatus:
        provider_ready = self.provider().ready
        model = self._active_model()

        return SearchCapabilityStatus(
            fts_ready=True,
            embedding_provider_ready=provider_ready,
            vector_ready=True,
            vector_backend=self._VECTOR_BACKEND,
            active_embedding_model=model,
            coverage=self._embedding_repository.get_coverage(model),
            lexical_fallback_available=True,
            semantic_ready=provider_ready,
        )

    def run_embed(self, force: bool, limit: int) -> EmbedRunResult:
        provider = self.provider()

        if not provider.ready:
            return EmbedRunResult(
                embedded=0,
                skipped=0,
                failed=0,
                model=None,
                warning="Embedding provider is not configured",
            )

        model = provider.model

        if force:
            page_ids = [
                page.id
                for page in self._page_repository.list_pages(
                    status=PageStatus.ACTIVE,
                    parent_id=None,
                    roots_only=False,
                    limit=limit,
                    offset=0,
                )
            ]
        else:
            page_ids = self._embedding_repository.find_stale(model, limit)

        embedded = 0
        skipped = 0
        failed = 0

        for page_id in page_ids:
            result = self._store_page_embedding(page_id, provider)

            if result == "embedded":
                embedded += 1
                continue

            if result == "skipped":
                skipped += 1
                continue

            failed += 1

        return EmbedRunResult(
            embedded=embedded,
            skipped=skipped,
            failed=failed,
            model=model,
        )

    def embed_page(self, page_id: str) -> None:
        if not self.get_settings().auto_embed:
            return

        provider = self.provider()

        if not provider.ready:
            return

        self._store_page_embedding(page_id, provider)

    def get_settings(self) -> EmbeddingSettings:
        settings, _api_key = self._load_settings()

        return settings

    def update_settings(self, payload: EmbeddingSettingsPatch) -> EmbeddingSettings:
        settings, api_key = self._load_settings()

        if payload.provider is EmbeddingProviderKind.LOCRAM_HOSTED:
            self._deny_without_hosted()

        updates = payload.model_dump(
            exclude_unset=True,
            exclude={"huggingface_api_key", "clear_huggingface_api_key"},
        )
        settings = settings.model_copy(update=updates)

        if payload.huggingface_api_key is not None:
            api_key = payload.huggingface_api_key.strip()
        elif payload.clear_huggingface_api_key:
            api_key = ""

        self._settings_path.parent.mkdir(parents=True, exist_ok=True)
        self._settings_path.write_text(
            settings.model_copy(update={"huggingface_api_key_configured": False}).model_dump_json(
                indent=2
            )
        )

        if api_key == "":
            if self._huggingface_api_key_path.is_file():
                self._huggingface_api_key_path.unlink()
        else:
            self._huggingface_api_key_path.write_text(api_key)

        settings.huggingface_api_key_configured = api_key != ""
        return settings

    def validate_huggingface(self, draft_api_key: str | None) -> HuggingFaceValidationResult:
        settings, stored_key = self._load_settings()
        api_key = stored_key

        if draft_api_key is not None:
            api_key = draft_api_key.strip()

        provider = HuggingFaceEmbeddingProvider(api_key, settings.model)

        if not provider.ready:
            raise EmbeddingProviderNotReadyError()

        vector = provider.embed("ping")

        return HuggingFaceValidationResult(
            provider=EmbeddingProviderKind.HUGGINGFACE.value,
            model=settings.model,
            dimension=len(vector),
        )

    def bootstrap(self) -> EmbeddingBootstrapResult:
        settings = self.get_settings()

        if settings.provider is EmbeddingProviderKind.LOCRAM_HOSTED:
            self._deny_without_hosted()
            self._hosted_bootstrap(settings)

        provider = self.provider()

        return EmbeddingBootstrapResult(
            status_lines=[
                f"provider={settings.provider.value}",
                f"model={settings.model}",
                f"ready={provider.ready}",
            ]
        )

    def _store_page_embedding(
        self,
        page_id: str,
        provider: IEmbeddingProvider,
    ) -> Literal["embedded", "skipped", "failed"]:
        page = self._page_repository.get(page_id)

        if page is None or page.status is not PageStatus.ACTIVE:
            return "skipped"

        try:
            vector = provider.embed(self._embed_text(page.title, page.content))
            self._embedding_repository.store(
                page.id,
                "content",
                self._pack(vector),
                provider.model,
                len(vector),
                self._now(),
            )
        except (
            EmbeddingProviderNotReadyError,
            EmbeddingProviderError,
            InvalidEmbeddingError,
            struct.error,
        ):
            return "failed"

        return "embedded"

    def provider(self) -> IEmbeddingProvider:
        if self._fixed_provider is not None:
            return self._fixed_provider

        settings, api_key = self._load_settings()

        if settings.provider is EmbeddingProviderKind.OLLAMA:
            return OllamaEmbeddingProvider(settings.ollama_url, settings.model)

        if settings.provider is EmbeddingProviderKind.HUGGINGFACE and api_key != "":
            return HuggingFaceEmbeddingProvider(api_key, settings.model)

        if settings.provider is EmbeddingProviderKind.LOCRAM_HOSTED and self._hosted_allowed():
            hosted = self._hosted_provider(settings)

            if hosted is not None:
                return hosted

        return NullEmbeddingProvider()

    def _load_settings(self) -> tuple[EmbeddingSettings, str]:
        settings = EmbeddingSettings()

        if self._settings_path.is_file():
            settings = EmbeddingSettings.model_validate_json(self._settings_path.read_text())

        api_key = ""

        if self._huggingface_api_key_path.is_file():
            api_key = self._huggingface_api_key_path.read_text().strip()

        if api_key == "":
            api_key = os.environ.get("LOCRAM_EMBED_API_KEY", "").strip()

        if api_key == "":
            api_key = os.environ.get("HUGGINGFACE_API_KEY", "").strip()

        settings.huggingface_api_key_configured = api_key != ""
        return settings, api_key

    def _hosted_provider(
        self,
        settings: EmbeddingSettings,
    ) -> LocramHostedEmbeddingProvider | None:
        record = self._access_repository.load()

        if record is not None and record.identity is not None:
            relay_token = record.credential_data.get("relay_token", "").strip()

            if relay_token != "":
                return LocramHostedEmbeddingProvider(
                    record.identity,
                    relay_token,
                    settings.model,
                    settings.hosted_url,
                )

        cached = self._hosted_bootstrap_record()

        if cached is not None and not self._hosted_bootstrap_is_stale(cached, settings.model):
            return LocramHostedEmbeddingProvider(
                cached.installation_id,
                cached.token,
                settings.model,
                settings.hosted_url,
            )

        return None

    def _hosted_bootstrap_record(self) -> HostedEmbeddingBootstrapCredential | None:
        if not self._bootstrap_path.is_file():
            return None

        try:
            return HostedEmbeddingBootstrapCredential.model_validate_json(
                self._bootstrap_path.read_text()
            )
        except ValidationError:
            return None

    @staticmethod
    def _hosted_bootstrap_is_stale(
        record: HostedEmbeddingBootstrapCredential,
        model: str,
    ) -> bool:
        if record.model != model:
            return True

        try:
            expires_at = datetime.fromisoformat(record.expires_at.replace("Z", "+00:00"))
        except ValueError:
            return True

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)

        remaining_seconds = (expires_at - datetime.now(UTC)).total_seconds()
        return remaining_seconds <= 3600

    def _hosted_bootstrap(
        self,
        settings: EmbeddingSettings,
    ) -> HostedEmbeddingBootstrapCredential:
        cached = self._hosted_bootstrap_record()

        if cached is not None and not self._hosted_bootstrap_is_stale(cached, settings.model):
            return cached

        installation_id = secrets.token_hex(16)

        if cached is not None:
            installation_id = cached.installation_id

        issued = self._request_hosted_bootstrap(
            settings.hosted_url,
            installation_id,
            settings.model,
        )
        self._bootstrap_path.parent.mkdir(parents=True, exist_ok=True)
        self._bootstrap_path.write_text(issued.model_dump_json(indent=2))
        return issued

    def _request_hosted_bootstrap(
        self,
        hosted_url: str,
        installation_id: str,
        model: str,
    ) -> HostedEmbeddingBootstrapCredential:
        payload = json.dumps({"installation_id": installation_id, "model": model}).encode()
        request = urllib.request.Request(
            url=f"{hosted_url.rstrip('/')}/v1/bootstrap-token",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "locram (locram-hosted-bootstrap)",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read()
        except urllib.error.HTTPError as error:
            raise EmbeddingProviderError(
                f"Locram hosted bootstrap returned HTTP {error.code}",
                status_code=502,
            ) from error
        except urllib.error.URLError as error:
            raise EmbeddingProviderError(
                f"Cannot reach Locram hosted bootstrap at {hosted_url}",
                status_code=502,
            ) from error

        try:
            parsed = HostedBootstrapTokenResponse.model_validate_json(body)
        except ValidationError as error:
            raise EmbeddingProviderError(
                "Locram hosted bootstrap response was incomplete.",
                status_code=502,
            ) from error

        token = parsed.access_token or parsed.token

        if token is None or token.strip() == "":
            raise EmbeddingProviderError(
                "Locram hosted bootstrap response was incomplete.",
                status_code=502,
            )

        return HostedEmbeddingBootstrapCredential(
            installation_id=parsed.installation_id.strip(),
            token=token.strip(),
            model=parsed.model.strip(),
            expires_at=parsed.expires_at.strip(),
            updated_at=self._now(),
        )

    @staticmethod
    def _lexical_only(
        fts_hits: list[PageSearchHit],
        limit: int,
        coverage: EmbeddingCoverage,
        reason: str,
    ) -> HybridSearchResult:
        return HybridSearchResult(
            results=[
                HybridSearchHit(
                    id=hit.id,
                    title=hit.title,
                    type=hit.type,
                    status=hit.status,
                    snippet=hit.snippet,
                    rank=hit.rank,
                    sources=["fts"],
                )
                for hit in fts_hits[:limit]
            ],
            coverage=coverage,
            semantic_available=False,
            fallback_reason_code=reason,
            sources_used=["fts"],
        )

    def _merge_hits(
        self,
        fts_hits: list[PageSearchHit],
        vector_hits: list[SimilarPage],
        limit: int,
    ) -> list[HybridSearchHit]:
        scores: dict[str, float] = {}
        hits: dict[str, HybridSearchHit] = {}

        for rank, hit in enumerate(fts_hits):
            scores[hit.id] = scores.get(hit.id, 0.0) + 1.0 / (
                self._RECIPROCAL_RANK_OFFSET + rank + 1
            )
            hits[hit.id] = HybridSearchHit(
                id=hit.id,
                title=hit.title,
                type=hit.type,
                status=hit.status,
                snippet=hit.snippet,
                rank=hit.rank,
                sources=["fts"],
            )

        for rank, similar in enumerate(vector_hits):
            page_id = similar.page_id
            scores[page_id] = scores.get(page_id, 0.0) + 1.0 / (
                self._RECIPROCAL_RANK_OFFSET + rank + 1
            )
            existing = hits.get(page_id)

            if existing is None:
                hits[page_id] = HybridSearchHit(
                    id=page_id,
                    title=similar.title,
                    type=similar.type,
                    status=similar.status,
                    distance=similar.distance,
                    sources=["semantic"],
                )
                continue

            existing.distance = similar.distance
            existing.sources = ["fts", "semantic"]

        ordered = sorted(hits.values(), key=lambda item: scores[item.id], reverse=True)

        return ordered[:limit]

    def _hosted_allowed(self) -> bool:
        if self._access_service is None:
            return True

        return self._access_service.has_capability(DesktopCapability.MANAGED_PUBLIC_MCP)

    def _deny_without_hosted(self) -> None:
        if self._access_service is None:
            return

        self._access_service.deny_without_capability(DesktopCapability.MANAGED_PUBLIC_MCP)

    def _active_model(self) -> str | None:
        provider = self.provider()

        if not provider.ready:
            return None

        return provider.model

    @staticmethod
    def _embed_text(title: str, content: str) -> str:
        return f"{title}\n\n{content}".strip()

    @staticmethod
    def _pack(values: list[float]) -> bytes:
        return struct.pack(f"<{len(values)}f", *values)

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
