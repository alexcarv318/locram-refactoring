from abc import ABC, abstractmethod

from schemas.bridge import HealthResponse, RuntimeSummary


class IBridgeService(ABC):
    """Bridge: desktop sidecar probes.

    Health check and runtime summary (home, db path, active base).
    """

    @abstractmethod
    def health(self) -> HealthResponse: ...

    @abstractmethod
    def runtime(self) -> RuntimeSummary: ...
