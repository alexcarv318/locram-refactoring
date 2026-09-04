from dependencies import (
    get_access_http_client,
    get_access_relay,
    get_access_repository,
    get_access_service,
    get_access_settings,
    get_embedding_repository,
    get_page_repository,
    get_session,
    get_working_base,
)
from dependencies import get_embedding_service as load_embedding_service
from interfaces.services.embeddings import IEmbeddingService
from schemas.embeddings import (
    EmbeddingStoreResponse,
    HybridSearchResult,
    SearchCapabilityStatus,
    UnembeddedResponse,
)

from .protocol import MCPServerApp, register_tools


def get_embedding_service(
    base_ref: str | None = None,
    write: bool = False,
    recipient_actor_ref: str | None = None,
) -> IEmbeddingService:
    if write:
        get_working_base(base_ref, True)

    return load_embedding_service(
        get_embedding_repository(db=get_session(base_ref, write)),
        get_page_repository(base_ref=base_ref, recipient_actor_ref=recipient_actor_ref),
        get_access_service(
            access_repository=get_access_repository(),
            access_relay=get_access_relay(),
            http_client=get_access_http_client(),
            settings=get_access_settings(),
        ),
    )


def hybrid_search(
    query: str,
    limit: int = 20,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> HybridSearchResult:
    return get_embedding_service(base_ref, recipient_actor_ref=recipient_actor_ref).hybrid_search(
        query,
        limit,
    )


def search_capability_status(
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> SearchCapabilityStatus:
    return get_embedding_service(
        base_ref,
        recipient_actor_ref=recipient_actor_ref,
    ).capability_status()


def store_embedding(
    page_id: str,
    embedding: list[float],
    model: str,
    field: str = "content",
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> EmbeddingStoreResponse:
    return get_embedding_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).store_embedding(
        page_id,
        embedding,
        model,
        field,
    )


def find_unembedded(
    limit: int = 100,
    model: str | None = None,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> UnembeddedResponse:
    return get_embedding_service(base_ref, recipient_actor_ref=recipient_actor_ref).find_unembedded(
        limit,
        model,
    )


def find_stale_embeddings(
    model: str,
    limit: int = 100,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> UnembeddedResponse:
    return get_embedding_service(
        base_ref,
        recipient_actor_ref=recipient_actor_ref,
    ).find_stale_embeddings(model, limit)


def register(mcp: MCPServerApp) -> None:
    register_tools(
        mcp,
        hybrid_search,
        search_capability_status,
        store_embedding,
        find_unembedded,
        find_stale_embeddings,
    )
