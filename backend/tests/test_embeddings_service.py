import struct

from sqlalchemy.orm import Session

import database
from interfaces.services.embeddings import IEmbeddingProvider
from repositories.access import AccessRepository
from repositories.embeddings import EmbeddingRepository
from repositories.links import LinkRepository
from repositories.pages import PageRepository
from schemas.pages import PageCreate
from services.embeddings import EmbeddingService
from services.pages import PageService


class FakeEmbeddingProvider(IEmbeddingProvider):
    @property
    def model(self) -> str:
        return "test-model"

    @property
    def ready(self) -> bool:
        return True

    def embed(self, text: str) -> list[float]:
        lowered = text.lower()

        if "alpha" in lowered:
            return [1.0, 0.0]

        if "beta" in lowered:
            return [0.0, 1.0]

        return [0.5, 0.5]


def test_store_unembedded_and_stale(
    embedding_service: EmbeddingService,
    page_service: PageService,
    db: Session,
) -> None:
    page = page_service.create_page(PageCreate(title="Alpha", content="alpha note"))
    missing = embedding_service.find_unembedded(10, None)

    assert page.id in missing.page_ids

    embedding_service.store_embedding(page.id, [1.0, 0.0], "test-model", "content")

    assert embedding_service.find_unembedded(10, None).page_ids == []

    EmbeddingRepository(db).store(
        page.id,
        "content",
        struct.pack("<2f", 1.0, 0.0),
        "test-model",
        2,
        "2020-01-01T00:00:00Z",
    )
    stale = embedding_service.find_stale_embeddings("test-model", 10)

    assert page.id in stale.page_ids


def test_hybrid_search_falls_back_without_provider(
    embedding_service: EmbeddingService,
    page_service: PageService,
) -> None:
    page_service.create_page(PageCreate(title="Alpha", content="searchable alpha"))
    result = embedding_service.hybrid_search("alpha", 10)

    assert result.semantic_available is False
    assert result.fallback_reason_code == "SEMANTIC_NOT_CONFIGURED"
    assert result.sources_used == ["fts"]
    assert any(hit.id for hit in result.results)


def test_hybrid_search_merges_semantic_hits(page_service: PageService, db: Session) -> None:
    service = EmbeddingService(
        EmbeddingRepository(db),
        PageRepository(db),
        AccessRepository(
            database.access_path,
            database.access_credentials_path,
            database.accepted_shares_path,
        ),
        FakeEmbeddingProvider(),
    )
    alpha = page_service.create_page(PageCreate(title="Alpha", content="alpha systems"))
    beta = page_service.create_page(PageCreate(title="Beta", content="beta runtime"))
    service.store_embedding(alpha.id, [1.0, 0.0], "test-model", "content")
    service.store_embedding(beta.id, [0.0, 1.0], "test-model", "content")

    result = service.hybrid_search("alpha", 10)

    assert result.semantic_available is True
    assert result.results[0].id == alpha.id
    assert "semantic" in result.results[0].sources
    assert service.capability_status().semantic_ready is True

    run = service.run_embed(force=True, limit=10)

    assert run.embedded >= 2
    assert run.model == "test-model"


def test_create_page_embeds_when_provider_ready(db: Session) -> None:
    embedding_service = EmbeddingService(
        EmbeddingRepository(db),
        PageRepository(db),
        AccessRepository(
            database.access_path,
            database.access_credentials_path,
            database.accepted_shares_path,
        ),
        FakeEmbeddingProvider(),
    )
    page_service = PageService(
        PageRepository(db),
        LinkRepository(db),
        embedding_service,
    )
    page = page_service.create_page(PageCreate(title="Alpha", content="alpha note"))

    assert page.id not in embedding_service.find_unembedded(10, None).page_ids


def test_create_page_succeeds_when_provider_is_not_ready(
    embedding_service: EmbeddingService,
    page_service: PageService,
) -> None:
    page = page_service.create_page(PageCreate(title="Alpha", content="alpha note"))

    assert page.id in embedding_service.find_unembedded(10, None).page_ids


def test_zero_vector_is_ignored(page_service: PageService, db: Session) -> None:
    page = page_service.create_page(PageCreate(title="Empty", content="empty"))
    EmbeddingRepository(db).store(
        page.id,
        "content",
        struct.pack("<2f", 0.0, 0.0),
        "test-model",
        2,
        "2026-01-01T00:00:00Z",
    )
    similar = EmbeddingRepository(db).search_similar([1.0, 0.0], "test-model", 10)

    assert similar == []
