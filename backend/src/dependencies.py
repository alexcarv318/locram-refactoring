from collections.abc import Iterator
from functools import lru_cache
from pathlib import Path

from fastapi import Depends, Query
from sqlalchemy import Engine
from sqlalchemy.orm import Session

import database
from database import apply_migrations, create_session_factory, create_sqlite_engine
from interfaces.repositories.backups import IBackupRepository
from interfaces.repositories.bases import IBaseRegistryRepository
from interfaces.repositories.changes import IChangeRepository
from interfaces.repositories.embeddings import IEmbeddingRepository
from interfaces.repositories.links import ILinkRepository
from interfaces.repositories.pages import IPageRepository
from interfaces.repositories.smart_folders import ISmartFolderRepository
from interfaces.services.attachments import IAttachmentService
from interfaces.services.backups import IBackupService
from interfaces.services.bases import IBaseRegistryService
from interfaces.services.bridge import IBridgeService
from interfaces.services.changes import IChangeService
from interfaces.services.embeddings import IEmbeddingProvider, IEmbeddingService
from interfaces.services.links import ILinkService
from interfaces.services.pages import IPageService
from interfaces.services.smart_folders import ISmartFolderService
from repositories.backups import BackupRepository
from repositories.bases import BaseRegistryRepository
from repositories.changes import ChangeRepository
from repositories.embeddings import EmbeddingRepository
from repositories.links import LinkRepository
from repositories.pages import PageRepository
from repositories.smart_folders import SmartFolderRepository
from schemas.bases import WorkingBaseRecord
from services.attachments import AttachmentService
from services.backups import BackupService
from services.bases import BaseRegistryService
from services.bridge import BridgeService
from services.changes import ChangeService
from services.embeddings import EmbeddingService, build_embedding_provider
from services.links import LinkService
from services.pages import PageService
from services.smart_folders import SmartFolderService


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


def get_base_registry_repository(
    db: Session = Depends(get_registry_db),
) -> IBaseRegistryRepository:
    return BaseRegistryRepository(db)


def get_base_registry_service(
    base_registry_repository: IBaseRegistryRepository = Depends(get_base_registry_repository),
) -> IBaseRegistryService:
    return BaseRegistryService(base_registry_repository=base_registry_repository)


def get_working_base(base_ref: str | None, write: bool) -> WorkingBaseRecord:
    session = get_registry_session()
    base_registry_repository = get_base_registry_repository(db=session)
    base_registry_service = get_base_registry_service(
        base_registry_repository=base_registry_repository
    )

    try:
        return base_registry_service.get_working_base(base_ref=base_ref, write=write)
    finally:
        session.close()


def get_writable_working_base(
    base_ref: str | None = Query(default=None),
) -> WorkingBaseRecord:
    return get_working_base(base_ref=base_ref, write=True)


def get_engine_for_base(base_ref: str | None, write: bool) -> Engine:
    working_base = get_working_base(base_ref=base_ref, write=write)

    return database.knowledge_engines.get(Path(working_base.path))


def get_engine() -> Engine:
    return get_engine_for_base(base_ref=None, write=False)


def get_session(base_ref: str | None = None, write: bool = False) -> Session:
    return create_session_factory(get_engine_for_base(base_ref=base_ref, write=write))()


def get_db(base_ref: str | None = Query(default=None)) -> Iterator[Session]:
    session = get_session(base_ref=base_ref, write=False)

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


def get_change_repository(db: Session = Depends(get_db)) -> IChangeRepository:
    return ChangeRepository(db)


def get_embedding_repository(db: Session = Depends(get_db)) -> IEmbeddingRepository:
    return EmbeddingRepository(db)


def get_smart_folder_repository() -> ISmartFolderRepository:
    return SmartFolderRepository(database.filter_presets_path)


def get_page_service(
    page_repository: IPageRepository = Depends(get_page_repository),
    link_repository: ILinkRepository = Depends(get_link_repository),
) -> IPageService:
    return PageService(page_repository=page_repository, link_repository=link_repository)


def get_link_service(
    link_repository: ILinkRepository = Depends(get_link_repository),
    page_repository: IPageRepository = Depends(get_page_repository),
) -> ILinkService:
    return LinkService(link_repository=link_repository, page_repository=page_repository)


def get_change_service(
    change_repository: IChangeRepository = Depends(get_change_repository),
) -> IChangeService:
    return ChangeService(change_repository=change_repository)


def get_bridge_service(
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> IBridgeService:
    return BridgeService(base_registry_service=base_registry_service)


def get_attachment_service() -> IAttachmentService:
    return AttachmentService(attachments_path=database.attachments_path)


def get_backup_repository(base_ref: str | None, write: bool) -> IBackupRepository:
    working_base = get_working_base(base_ref=base_ref, write=write)

    return BackupRepository(source_path=Path(working_base.path))


def get_backup_service(base_ref: str | None = Query(default=None)) -> IBackupService:
    return BackupService(
        backup_repository=get_backup_repository(base_ref=base_ref, write=False)
    )


def get_embedding_provider() -> IEmbeddingProvider:
    return build_embedding_provider()


def get_embedding_service(
    embedding_repository: IEmbeddingRepository = Depends(get_embedding_repository),
    page_repository: IPageRepository = Depends(get_page_repository),
    embedding_provider: IEmbeddingProvider = Depends(get_embedding_provider),
) -> IEmbeddingService:
    return EmbeddingService(
        embedding_repository=embedding_repository,
        page_repository=page_repository,
        embedding_provider=embedding_provider,
    )


def get_smart_folder_service(
    smart_folder_repository: ISmartFolderRepository = Depends(get_smart_folder_repository),
    page_repository: IPageRepository = Depends(get_page_repository),
    link_repository: ILinkRepository = Depends(get_link_repository),
    link_service: ILinkService = Depends(get_link_service),
) -> ISmartFolderService:
    return SmartFolderService(
        smart_folder_repository=smart_folder_repository,
        page_repository=page_repository,
        link_repository=link_repository,
        link_service=link_service,
    )
