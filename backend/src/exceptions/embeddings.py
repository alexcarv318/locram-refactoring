from exceptions.app import AppError


class EmbeddingError(AppError):
    status_code: int = 400


class EmbeddingProviderNotReadyError(EmbeddingError):
    def __init__(self) -> None:
        super().__init__("Embedding provider is not configured")


class InvalidEmbeddingError(EmbeddingError):
    def __init__(self) -> None:
        super().__init__("Embedding vector must not be empty")


class EmbeddingProviderError(EmbeddingError):
    def __init__(self, message: str) -> None:
        super().__init__(message)
