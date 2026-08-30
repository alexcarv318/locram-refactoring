from abc import ABC, abstractmethod

from schemas.embeddings import (
    EmbeddingBootstrapResult,
    EmbeddingSettings,
    EmbeddingSettingsPatch,
    EmbeddingStoreResponse,
    EmbedRunResult,
    HuggingFaceValidationResult,
    HybridSearchResult,
    SearchCapabilityStatus,
    UnembeddedResponse,
)


class IEmbeddingProvider(ABC):
    @property
    @abstractmethod
    def model(self) -> str: ...

    @property
    @abstractmethod
    def ready(self) -> bool: ...

    @abstractmethod
    def embed(self, text: str) -> list[float]: ...


class IEmbeddingService(ABC):
    """Embeddings: page vectors, stale detection, and hybrid search.

    Reciprocal-rank fusion of FTS and cosine similarity, with lexical fallback.
    Desktop settings choose hosted, Hugging Face, or Ollama. Hosted prefers
    the enrolled Access relay token and otherwise mints a bootstrap token.
    """

    @abstractmethod
    def store_embedding(
        self,
        page_id: str,
        embedding: list[float],
        model: str,
        field: str,
    ) -> EmbeddingStoreResponse: ...

    @abstractmethod
    def find_unembedded(self, limit: int, model: str | None) -> UnembeddedResponse: ...

    @abstractmethod
    def find_stale_embeddings(self, model: str, limit: int) -> UnembeddedResponse: ...

    @abstractmethod
    def hybrid_search(self, query: str, limit: int) -> HybridSearchResult: ...

    @abstractmethod
    def capability_status(self) -> SearchCapabilityStatus: ...

    @abstractmethod
    def run_embed(self, force: bool, limit: int) -> EmbedRunResult: ...

    @abstractmethod
    def get_settings(self) -> EmbeddingSettings: ...

    @abstractmethod
    def update_settings(self, payload: EmbeddingSettingsPatch) -> EmbeddingSettings: ...

    @abstractmethod
    def validate_huggingface(
        self,
        draft_api_key: str | None,
    ) -> HuggingFaceValidationResult: ...

    @abstractmethod
    def bootstrap(self) -> EmbeddingBootstrapResult: ...
