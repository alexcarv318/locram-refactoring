from os import environ
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


class BaseRepository:
    def __init__(self, db: Session) -> None:
        self.db = db


class KnowledgeEngines:
    def __init__(self) -> None:
        self.engines: dict[str, Engine] = {}

    def get(self, database_path: Path) -> Engine:
        key = str(database_path.expanduser().resolve())
        engine = self.engines.get(key)

        if engine is None:
            engine = create_sqlite_engine(database_path)
            apply_migrations(engine)
            self.engines[key] = engine

        return engine

    def clear(self) -> None:
        for engine in self.engines.values():
            engine.dispose()

        self.engines.clear()


locram_home = Path(environ.get("LOCRAM_HOME", str(Path.home() / ".locram"))).expanduser()
host_state_path = locram_home / "host-state.db"
knowledge_path = locram_home / "locram.db"
attachments_path = locram_home / "attachments"
filter_presets_path = locram_home / "preferences" / "filter-presets.json"
embedding_settings_path = locram_home / "preferences" / "embedding-settings.json"
huggingface_api_key_path = locram_home / "preferences" / "huggingface-api-key"
hosted_embedding_bootstrap_path = locram_home / "preferences" / "hosted-embedding-bootstrap.json"
access_path = locram_home / "preferences" / "access.json"
access_credentials_path = locram_home / "preferences" / "access-credentials.json"
desktop_activation_path = locram_home / "preferences" / "desktop-activation.json"
accepted_shares_path = locram_home / "preferences" / "accepted-shares.json"
mcp_tool_visibility_path = locram_home / "preferences" / "mcp-tool-visibility.json"
desktop_user_settings_path = locram_home / "preferences" / "desktop-user-settings.json"
managed_bases_path = locram_home / "managed-bases"
shared_mirrors_path = locram_home / "shared-mirrors"
managed_base_seeds_path = Path(__file__).resolve().parent.parent / "managed_base_seeds"

if not managed_base_seeds_path.is_dir():
    managed_base_seeds_path = Path(__file__).resolve().parent / "managed_base_seeds"


knowledge_engines = KnowledgeEngines()


def apply_migrations(engine: Engine) -> None:
    config = alembic_config()

    with engine.connect() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        connection.commit()


def alembic_config() -> Config:
    database_directory = Path(__file__).resolve().parent
    config_path = database_directory / "alembic.ini"

    if not config_path.is_file():
        config_path = database_directory.parent / "alembic.ini"

    config = Config(str(config_path))
    script_location = config_path.parent / "alembic"

    if not script_location.is_dir():
        script_location = database_directory / "alembic"

    config.set_main_option("script_location", str(script_location))
    return config


def create_sqlite_engine(database_path: Path | None = None) -> Engine:
    if database_path is None:
        return create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )

    database_path.parent.mkdir(parents=True, exist_ok=True)

    return create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
        future=True,
    )


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, expire_on_commit=False)


def open_knowledge_session(database_path: Path) -> Session:
    return create_session_factory(knowledge_engines.get(database_path))()
