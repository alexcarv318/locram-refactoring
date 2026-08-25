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


def apply_migrations(engine: Engine) -> None:
    config = _alembic_config()

    with engine.connect() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        connection.commit()


def _alembic_config() -> Config:
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
