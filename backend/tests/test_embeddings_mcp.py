import pytest

import mcp_server.embeddings as mcp_embeddings
from exceptions.pages import PageNotFoundError
from schemas.pages import PageCreate
from services.embeddings import EmbeddingService
from services.pages import PageService


def test_mcp_embedding_tools(
    mcp_embedding_service: EmbeddingService,
    page_service: PageService,
) -> None:
    page = page_service.create_page(PageCreate(title="Alpha", content="alpha note"))
    missing = mcp_embeddings.find_unembedded()
    stored = mcp_embeddings.store_embedding(page.id, [1.0, 0.0], "test-model")
    status = mcp_embeddings.search_capability_status()
    hybrid = mcp_embeddings.hybrid_search("alpha")

    assert page.id in missing.page_ids
    assert stored.stored is True
    assert status.semantic_ready is False
    assert hybrid.semantic_available is False
    assert hybrid.fallback_reason_code == "SEMANTIC_NOT_CONFIGURED"

    with pytest.raises(PageNotFoundError):
        mcp_embeddings.store_embedding("01MISSINGPAGE00000000000000", [1.0], "test-model")
