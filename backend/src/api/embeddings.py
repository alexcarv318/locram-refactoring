from fastapi import APIRouter, Body, Depends, Query

from dependencies import (
    get_embedding_provider,
    get_embedding_repository,
    get_embedding_service,
    get_page_repository,
    get_session,
    get_writable_working_base,
)
from interfaces.services.embeddings import IEmbeddingService
from schemas.bases import WorkingBaseRecord
from schemas.embeddings import (
    DesktopEmbedRunRequest,
    EmbeddingBootstrapResponse,
    EmbeddingSettingsPatch,
    EmbeddingSettingsResponse,
    EmbedRunRequest,
    EmbedRunResponse,
    HuggingFaceValidationResponse,
    HybridSearchResponse,
    SearchCapabilityResponse,
)

embeddings_router = APIRouter(prefix="/api/embeddings")
desktop_embeddings_router = APIRouter(prefix="/api/desktop")


@embeddings_router.get("/search", response_model=HybridSearchResponse)
def hybrid_search(
    q: str = Query(default=""),
    limit: int = Query(default=20, ge=1, le=100),
    embedding_service: IEmbeddingService = Depends(get_embedding_service),
) -> HybridSearchResponse:
    return HybridSearchResponse(item=embedding_service.hybrid_search(q, limit))


@embeddings_router.get("/status", response_model=SearchCapabilityResponse)
def embedding_status(
    embedding_service: IEmbeddingService = Depends(get_embedding_service),
) -> SearchCapabilityResponse:
    return SearchCapabilityResponse(item=embedding_service.capability_status())


@embeddings_router.post("/run", response_model=EmbedRunResponse)
def run_embed(
    payload: EmbedRunRequest,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    embedding_service: IEmbeddingService = Depends(get_embedding_service),
) -> EmbedRunResponse:
    return EmbedRunResponse(item=embedding_service.run_embed(payload.force, payload.limit))


@desktop_embeddings_router.get("/embedding-settings", response_model=EmbeddingSettingsResponse)
def get_embedding_settings(
    embedding_service: IEmbeddingService = Depends(get_embedding_service),
) -> EmbeddingSettingsResponse:
    return EmbeddingSettingsResponse(item=embedding_service.get_settings())


@desktop_embeddings_router.patch("/embedding-settings", response_model=EmbeddingSettingsResponse)
def update_embedding_settings(
    payload: EmbeddingSettingsPatch,
    embedding_service: IEmbeddingService = Depends(get_embedding_service),
) -> EmbeddingSettingsResponse:
    return EmbeddingSettingsResponse(item=embedding_service.update_settings(payload))


@desktop_embeddings_router.post(
    "/embedding-settings/validate",
    response_model=HuggingFaceValidationResponse,
)
def validate_embedding_settings(
    payload: EmbeddingSettingsPatch | None = Body(default=None),
    embedding_service: IEmbeddingService = Depends(get_embedding_service),
) -> HuggingFaceValidationResponse:
    draft_key = None

    if payload is not None:
        draft_key = payload.huggingface_api_key

    return HuggingFaceValidationResponse(item=embedding_service.validate_huggingface(draft_key))


@desktop_embeddings_router.post(
    "/embedding-settings/bootstrap",
    response_model=EmbeddingBootstrapResponse,
)
def bootstrap_embedding_settings(
    embedding_service: IEmbeddingService = Depends(get_embedding_service),
) -> EmbeddingBootstrapResponse:
    return EmbeddingBootstrapResponse(item=embedding_service.bootstrap())


@desktop_embeddings_router.post("/embeddings/run", response_model=EmbedRunResponse)
def run_desktop_embed(payload: DesktopEmbedRunRequest) -> EmbedRunResponse:
    session = get_session(base_ref=payload.base_ref, write=True)

    try:
        embedding_service = get_embedding_service(
            embedding_repository=get_embedding_repository(db=session),
            page_repository=get_page_repository(db=session),
            embedding_provider=get_embedding_provider(),
        )
        result = embedding_service.run_embed(payload.force, payload.limit)
        result.requested_base_id = payload.base_id
        result.requested_base_ref = payload.base_ref
        return EmbedRunResponse(item=result)
    finally:
        session.close()
