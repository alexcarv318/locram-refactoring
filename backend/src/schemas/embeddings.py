from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from schemas.pages import PageStatus, PageType


class EmbeddingProviderKind(StrEnum):
    LOCRAM_HOSTED = "locram_hosted"
    HUGGINGFACE = "huggingface"
    OLLAMA = "ollama"


class EmbeddingCoverage(BaseModel):
    searched: int
    total_active: int


class SimilarPage(BaseModel):
    page_id: str
    title: str
    type: PageType
    status: PageStatus
    distance: float


class HybridSearchHit(BaseModel):
    id: str
    title: str
    type: PageType
    status: PageStatus
    snippet: str | None = None
    rank: float | None = None
    distance: float | None = None
    sources: list[str]


class HybridSearchResult(BaseModel):
    results: list[HybridSearchHit]
    coverage: EmbeddingCoverage
    semantic_available: bool
    fallback_reason_code: str | None
    sources_used: list[str]


class SearchCapabilityStatus(BaseModel):
    fts_ready: bool
    embedding_provider_ready: bool
    vector_ready: bool
    vector_backend: str
    active_embedding_model: str | None
    coverage: EmbeddingCoverage
    lexical_fallback_available: bool
    semantic_ready: bool


class EmbeddingStoreRequest(BaseModel):
    page_id: str
    embedding: list[float]
    model: str
    field: str = "content"


class EmbeddingStoreResponse(BaseModel):
    stored: bool
    page_id: str
    model: str


class UnembeddedResponse(BaseModel):
    page_ids: list[str]


class EmbedRunRequest(BaseModel):
    force: bool = False
    limit: int = Field(default=100, ge=1, le=10_000)


class EmbedRunResult(BaseModel):
    embedded: int
    skipped: int
    failed: int
    model: str | None
    warning: str | None = None
    requested_base_id: str | None = None
    requested_base_ref: str | None = None


class EmbeddingSettings(BaseModel):
    provider: EmbeddingProviderKind = EmbeddingProviderKind.LOCRAM_HOSTED
    model: str = "bge-m3"
    ollama_url: str = "http://localhost:11434"
    ollama_bin: str | None = None
    ollama_models_path: str | None = None
    auto_embed: bool = True
    hosted_url: str = "https://embed.locram.app"
    huggingface_api_key_configured: bool = False


class EmbeddingSettingsPatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    provider: EmbeddingProviderKind | None = None
    model: str | None = None
    ollama_url: str | None = Field(default=None, alias="ollamaUrl")
    ollama_bin: str | None = Field(default=None, alias="ollamaBin")
    ollama_models_path: str | None = Field(default=None, alias="ollamaModelsPath")
    auto_embed: bool | None = Field(default=None, alias="autoEmbed")
    hosted_url: str | None = Field(default=None, alias="hostedUrl")
    huggingface_api_key: str | None = Field(default=None, alias="huggingfaceApiKey")
    clear_huggingface_api_key: bool = Field(default=False, alias="clearHuggingfaceApiKey")


class HuggingFaceValidationResult(BaseModel):
    provider: str
    model: str
    dimension: int


class EmbeddingBootstrapResult(BaseModel):
    status_lines: list[str]


class DesktopEmbedRunRequest(BaseModel):
    base_id: str | None = None
    base_ref: str | None = None
    force: bool = False
    limit: int = Field(default=100, ge=1, le=10_000)


class EmbeddingSettingsResponse(BaseModel):
    item: EmbeddingSettings


class HuggingFaceValidationResponse(BaseModel):
    item: HuggingFaceValidationResult


class EmbeddingBootstrapResponse(BaseModel):
    item: EmbeddingBootstrapResult


class HybridSearchResponse(BaseModel):
    item: HybridSearchResult


class SearchCapabilityResponse(BaseModel):
    item: SearchCapabilityStatus


class EmbedRunResponse(BaseModel):
    item: EmbedRunResult
