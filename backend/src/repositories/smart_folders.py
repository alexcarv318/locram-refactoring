import os
from datetime import UTC, datetime
from pathlib import Path
from tempfile import NamedTemporaryFile

from pydantic import ValidationError
from ulid import ULID

from exceptions.smart_folders import SmartFolderStorageError
from interfaces.repositories.smart_folders import ISmartFolderRepository
from schemas.smart_folders import FilterPresetFile, FilterPresetRecord, FilterState


class SmartFolderRepository(ISmartFolderRepository):
    def __init__(self, path: Path) -> None:
        self._path = path

    def list_presets(self) -> list[FilterPresetRecord]:
        return self._read_all()

    def get_preset(self, preset_id: str) -> FilterPresetRecord | None:
        for preset in self._read_all():
            if preset.id == preset_id:
                return preset

        return None

    def create_preset(self, name: str, filter_state: FilterState) -> FilterPresetRecord:
        presets = self._read_all()
        now = self._now()
        preset = FilterPresetRecord(
            id=str(ULID()),
            name=name,
            filter=filter_state,
            created_at=now,
            updated_at=now,
        )
        presets.append(preset)
        self._write_all(presets)

        return preset

    def update_preset(
        self,
        preset_id: str,
        name: str | None,
        filter_state: FilterState | None,
    ) -> FilterPresetRecord | None:
        presets = self._read_all()
        updated: FilterPresetRecord | None = None
        next_presets: list[FilterPresetRecord] = []

        for preset in presets:
            if preset.id != preset_id:
                next_presets.append(preset)
                continue

            updated = preset.model_copy(
                update={
                    "name": name if name is not None else preset.name,
                    "filter": filter_state if filter_state is not None else preset.filter,
                    "updated_at": self._now(),
                }
            )
            next_presets.append(updated)

        if updated is None:
            return None

        self._write_all(next_presets)

        return updated

    def delete_preset(self, preset_id: str) -> bool:
        presets = self._read_all()
        remaining = [preset for preset in presets if preset.id != preset_id]

        if len(remaining) == len(presets):
            return False

        self._write_all(remaining)

        return True

    def _read_all(self) -> list[FilterPresetRecord]:
        if not self._path.exists():
            return []

        try:
            payload = FilterPresetFile.model_validate_json(self._path.read_text(encoding="utf-8"))
        except (OSError, ValidationError) as error:
            raise SmartFolderStorageError(str(self._path)) from error

        return payload.presets

    def _write_all(self, presets: list[FilterPresetRecord]) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        payload = FilterPresetFile(presets=presets).model_dump_json(by_alias=True, indent=2)
        temporary_path: Path | None = None

        try:
            with NamedTemporaryFile(
                "w",
                encoding="utf-8",
                dir=self._path.parent,
                delete=False,
            ) as temporary_file:
                temporary_file.write(payload)
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
                temporary_path = Path(temporary_file.name)

            temporary_path.replace(self._path)
        except OSError as error:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)

            raise SmartFolderStorageError(str(self._path)) from error

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).isoformat(timespec="seconds")
