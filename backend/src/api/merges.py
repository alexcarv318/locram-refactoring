from fastapi import APIRouter, Depends

from dependencies import get_merge_service, get_writable_working_base
from interfaces.services.merges import IMergeService
from schemas.bases import WorkingBaseRecord
from schemas.merges import MergeOutcomeResponse, MergePlanResponse, MergeRequest

merges_router = APIRouter()


@merges_router.post("/api/merges/plan", response_model=MergePlanResponse)
def plan_merge(
    payload: MergeRequest,
    merge_service: IMergeService = Depends(get_merge_service),
) -> MergePlanResponse:
    return MergePlanResponse(item=merge_service.plan(payload.path))


@merges_router.post("/api/merges/execute", response_model=MergeOutcomeResponse)
def execute_merge(
    payload: MergeRequest,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    merge_service: IMergeService = Depends(get_merge_service),
) -> MergeOutcomeResponse:
    return MergeOutcomeResponse(item=merge_service.execute(payload.path))
