from dependencies import (
    get_embedding_repository,
    get_page_repository,
    get_session,
)
from dependencies import get_embedding_service as load_embedding_service
from interfaces.services.embeddings import IEmbeddingService
from schemas.embeddings import (
    EmbeddingStoreResponse,
    HybridSearchResult,
    SearchCapabilityStatus,
    UnembeddedResponse,
)

from .protocol import MCPServerApp


def get_embedding_service(base_ref: str | None = None, write: bool = False) -> IEmbeddingService:
    db = get_session(base_ref, write)

    return load_embedding_service(
        get_embedding_repository(db),
        get_page_repository(db),
    )


def hybrid_search(query: str, limit: int = 20, base_ref: str | None = None) -> HybridSearchResult:
    return get_embedding_service(base_ref).hybrid_search(query, limit)


def search_capability_status(base_ref: str | None = None) -> SearchCapabilityStatus:
    return get_embedding_service(base_ref).capability_status()


def store_embedding(
    page_id: str,
    embedding: list[float],
    model: str,
    field: str = "content",
    base_ref: str | None = None,
) -> EmbeddingStoreResponse:
    return get_embedding_service(base_ref, write=True).store_embedding(
        page_id,
        embedding,
        model,
        field,
    )


def find_unembedded(
    limit: int = 100,
    model: str | None = None,
    base_ref: str | None = None,
) -> UnembeddedResponse:
    return get_embedding_service(base_ref).find_unembedded(limit, model)


def find_stale_embeddings(
    model: str,
    limit: int = 100,
    base_ref: str | None = None,
) -> UnembeddedResponse:
    return get_embedding_service(base_ref).find_stale_embeddings(model, limit)


def register(mcp: MCPServerApp) -> None:
    mcp.tool()(hybrid_search)
    mcp.tool()(search_capability_status)
    mcp.tool()(store_embedding)
    mcp.tool()(find_unembedded)
    mcp.tool()(find_stale_embeddings)
