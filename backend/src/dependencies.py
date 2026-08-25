from functools import lru_cache
from pathlib import Path

from sqlalchemy import Engine

from database import create_sqlite_engine
from interfaces.repositories.links import ILinkRepository
from interfaces.repositories.pages import IPageRepository
from interfaces.services.links import ILinkService
from interfaces.services.pages import IPageService
from repositories.links import LinkRepository
from repositories.pages import PageRepository
from services.links import LinkService
from services.pages import PageService


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    return create_sqlite_engine(Path.home() / ".locram" / "locram.db")


def get_page_repository() -> IPageRepository:
    return PageRepository(get_engine())


def get_link_repository() -> ILinkRepository:
    return LinkRepository(get_engine())


def get_page_service() -> IPageService:
    return PageService(get_page_repository(), get_link_repository())


def get_link_service() -> ILinkService:
    return LinkService(get_link_repository(), get_page_repository())
