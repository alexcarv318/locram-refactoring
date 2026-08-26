from fastapi import APIRouter, Depends, Query

from dependencies import get_smart_folder_service
from interfaces.services.smart_folders import ISmartFolderService
from schemas.smart_folders import (
    FilterPresetCreate,
    FilterPresetDeletedResponse,
    FilterPresetListResponse,
    FilterPresetResponse,
    FilterPresetUpdate,
    NotesSummariesResponse,
    SmartFolderGraphResponse,
)

presets_router = APIRouter(prefix="/api/presets")
notes_router = APIRouter(prefix="/api/notes")


@presets_router.get("", response_model=FilterPresetListResponse)
def list_presets(
    smart_folder_service: ISmartFolderService = Depends(get_smart_folder_service),
) -> FilterPresetListResponse:
    return FilterPresetListResponse(items=smart_folder_service.list_presets())


@presets_router.post("", response_model=FilterPresetResponse, status_code=201)
def create_preset(
    payload: FilterPresetCreate,
    smart_folder_service: ISmartFolderService = Depends(get_smart_folder_service),
) -> FilterPresetResponse:
    return FilterPresetResponse(
        item=smart_folder_service.create_preset(payload.name, payload.filter)
    )


@presets_router.put("/{preset_id}", response_model=FilterPresetResponse)
def update_preset(
    preset_id: str,
    payload: FilterPresetUpdate,
    smart_folder_service: ISmartFolderService = Depends(get_smart_folder_service),
) -> FilterPresetResponse:
    return FilterPresetResponse(
        item=smart_folder_service.update_preset(preset_id, payload.name, payload.filter)
    )


@presets_router.delete("/{preset_id}", response_model=FilterPresetDeletedResponse)
def delete_preset(
    preset_id: str,
    smart_folder_service: ISmartFolderService = Depends(get_smart_folder_service),
) -> FilterPresetDeletedResponse:
    return smart_folder_service.delete_preset(preset_id)


@presets_router.get("/{preset_id}/graph", response_model=SmartFolderGraphResponse)
def get_preset_graph(
    preset_id: str,
    expand_hops: int = Query(default=2, ge=1, le=5),
    smart_folder_service: ISmartFolderService = Depends(get_smart_folder_service),
) -> SmartFolderGraphResponse:
    return SmartFolderGraphResponse(
        item=smart_folder_service.get_smart_folder_graph(preset_id, None, expand_hops)
    )


@notes_router.get("/summaries", response_model=NotesSummariesResponse)
def get_notes_summaries(
    smart_folder_service: ISmartFolderService = Depends(get_smart_folder_service),
) -> NotesSummariesResponse:
    return smart_folder_service.get_notes_summaries()


@notes_router.get("/graph", response_model=SmartFolderGraphResponse)
def get_notes_graph(
    expand_hops: int = Query(default=2, ge=1, le=5),
    smart_folder_service: ISmartFolderService = Depends(get_smart_folder_service),
) -> SmartFolderGraphResponse:
    return SmartFolderGraphResponse(item=smart_folder_service.get_notes_graph(expand_hops))
