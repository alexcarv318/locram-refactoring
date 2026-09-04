from pydantic import BaseModel, ConfigDict, Field

DEFAULT_NOTE_LANGUAGE_NAME = "English"

NOTE_LANGUAGE_NAMES: tuple[str, ...] = (
    "Arabic",
    "Bengali",
    "Bulgarian",
    "Burmese",
    "Chinese",
    "Croatian",
    "Czech",
    "Danish",
    "Dutch",
    "English",
    "Filipino",
    "Finnish",
    "French",
    "German",
    "Greek",
    "Gujarati",
    "Hebrew",
    "Hindi",
    "Hungarian",
    "Indonesian",
    "Italian",
    "Japanese",
    "Korean",
    "Malay",
    "Marathi",
    "Norwegian",
    "Persian",
    "Polish",
    "Portuguese",
    "Punjabi",
    "Romanian",
    "Russian",
    "Serbian",
    "Slovak",
    "Spanish",
    "Swahili",
    "Swedish",
    "Tamil",
    "Telugu",
    "Thai",
    "Turkish",
    "Ukrainian",
    "Urdu",
    "Vietnamese",
)


class UserSettingsRecord(BaseModel):
    note_language_name: str = DEFAULT_NOTE_LANGUAGE_NAME


class UserSettingsPatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    note_language_name: str | None = Field(default=None, alias="noteLanguageName")


class UserSettingsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    note_language_name: str = Field(serialization_alias="noteLanguageName")
    note_language_options: list[str] = Field(serialization_alias="noteLanguageOptions")
    effective_now: bool = Field(serialization_alias="effectiveNow")
