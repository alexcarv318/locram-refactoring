from collections.abc import Iterator
from functools import lru_cache
from pathlib import Path

from fastapi import Depends
from sqlalchemy import Engine
from sqlalchemy.orm import Session

import database
from database import apply_migrations, create_session_factory, create_sqlite_engine
from interfaces.repositories.bases import IBaseRegistryRepository
from interfaces.repositories.links import ILinkRepository
from interfaces.repositories.pages import IPageRepository
from interfaces.services.bases import IBaseRegistryService
from interfaces.services.links import ILinkService
from interfaces.services.pages import IPageService
from repositories.bases import BaseRegistryRepository
from repositories.links import LinkRepository
from repositories.pages import PageRepository
from services.bases import BaseRegistryService, selected_working_entry_id
from services.links import LinkService
from services.pages import PageService


@lru_cache
def get_registry_engine() -> Engine:
    engine = create_sqlite_engine(database.host_state_path)
    apply_migrations(engine)
    return engine


def get_registry_session() -> Session:
    return create_session_factory(get_registry_engine())()


def get_registry_db() -> Iterator[Session]:
    session = get_registry_session()

    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def resolve_knowledge_path() -> Path:
    session = get_registry_session()

    try:
        repository = BaseRegistryRepository(session)

        if selected_working_entry_id is not None:
            working = repository.get(selected_working_entry_id)

            if working is not None:
                return Path(working.path)

        active = repository.get_active()

        if active is not None:
            return Path(active.path)
    finally:
        session.close()

    return database.knowledge_path


@lru_cache
def get_engine() -> Engine:
    engine = create_sqlite_engine(resolve_knowledge_path())
    apply_migrations(engine)
    return engine


def get_session() -> Session:
    return create_session_factory(get_engine())()


def get_db(engine: Engine = Depends(get_engine)) -> Iterator[Session]:
    session = create_session_factory(engine)()

    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_page_repository(db: Session = Depends(get_db)) -> IPageRepository:
    return PageRepository(db)


def get_link_repository(db: Session = Depends(get_db)) -> ILinkRepository:
    return LinkRepository(db)


def get_base_registry_repository(
    db: Session = Depends(get_registry_db),
) -> IBaseRegistryRepository:
    return BaseRegistryRepository(db)


def get_page_service(
    page_repository: IPageRepository = Depends(get_page_repository),
    link_repository: ILinkRepository = Depends(get_link_repository),
) -> IPageService:
    return PageService(page_repository, link_repository)


def get_link_service(
    link_repository: ILinkRepository = Depends(get_link_repository),
    page_repository: IPageRepository = Depends(get_page_repository),
) -> ILinkService:
    return LinkService(link_repository, page_repository)


def get_base_registry_service(
    base_registry_repository: IBaseRegistryRepository = Depends(get_base_registry_repository),
) -> IBaseRegistryService:
    return BaseRegistryService(base_registry_repository)
