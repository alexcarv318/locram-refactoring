from pydantic import BaseModel

from schemas.bases import RegistryEntryRecord


class HealthResponse(BaseModel):
    status: str


class RuntimeSummary(BaseModel):
    locram_home: str
    db_path: str
    active_base: RegistryEntryRecord | None
