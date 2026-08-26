from abc import ABC, abstractmethod

from schemas.embeddings import EmbeddingCoverage, SimilarPage


class IEmbeddingRepository(ABC):
    @abstractmethod
    def store(
        self,
        page_id: str,
        field: str,
        embedding: bytes,
        model: str,
        dimension: int,
        embedded_at: str,
    ) -> None: ...

    @abstractmethod
    def find_unembedded(self, limit: int, model: str | None) -> list[str]: ...

    @abstractmethod
    def find_stale(self, model: str, limit: int) -> list[str]: ...

    @abstractmethod
    def search_similar(self, query: list[float], model: str, limit: int) -> list[SimilarPage]: ...

    @abstractmethod
    def get_coverage(self, model: str | None) -> EmbeddingCoverage: ...
