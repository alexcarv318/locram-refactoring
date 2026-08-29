from collections.abc import Iterator
from functools import lru_cache
from pathlib import Path

import httpx
from fastapi import Depends, Query
from sqlalchemy import Engine
from sqlalchemy.orm import Session

import database
from database import apply_migrations, create_session_factory, create_sqlite_engine
from exceptions.bases import WorkingBaseNotFoundError
from interfaces.repositories.access import IAccessRepository
from interfaces.repositories.backups import IBackupRepository
from interfaces.repositories.bases import IBaseRegistryRepository
from interfaces.repositories.changes import IChangeRepository
from interfaces.repositories.embeddings import IEmbeddingRepository
from interfaces.repositories.exports import IExportRepository
from interfaces.repositories.links import ILinkRepository
from interfaces.repositories.merges import IMergeRepository
from interfaces.repositories.pages import IPageRepository
from interfaces.repositories.sharing import ISharingRepository
from interfaces.repositories.smart_folders import ISmartFolderRepository
from interfaces.services.access import AccessHttpClient, IAccessRelay, IAccessService
from interfaces.services.attachments import IAttachmentService
from interfaces.services.backups import IBackupService
from interfaces.services.bases import IBaseRegistryService
from interfaces.services.bridge import IBridgeService
from interfaces.services.changes import IChangeService
from interfaces.services.embeddings import IEmbeddingProvider, IEmbeddingService
from interfaces.services.exports import IExportService
from interfaces.services.links import ILinkService
from interfaces.services.merges import IMergeService
from interfaces.services.pages import IPageService
from interfaces.services.sharing import ISharingService
from interfaces.services.smart_folders import ISmartFolderService
from repositories.access import AccessRepository
from repositories.backups import BackupRepository
from repositories.bases import BaseRegistryRepository
from repositories.changes import ChangeRepository
from repositories.embeddings import EmbeddingRepository
from repositories.exports import ExportRepository
from repositories.links import LinkRepository
from repositories.merges import MergeRepository
from repositories.pages import PageRepository
from repositories.sharing import SharingRepository
from repositories.smart_folders import SmartFolderRepository
from schemas.access import AccessSettings
from schemas.bases import WorkingBaseRecord
from services.access import AccessRelay, AccessService
from services.attachments import AttachmentService
from services.backups import BackupService
from services.bases import BaseRegistryService
from services.bridge import BridgeService
from services.changes import ChangeService
from services.embeddings import EmbeddingService, build_embedding_provider
from services.exports import ExportService
from services.links import LinkService
from services.merges import MergeService
from services.pages import PageService
from services.sharing import SharingService
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


def get_access_repository() -> IAccessRepository:
    return AccessRepository(
        database.access_path,
        database.access_credentials_path,
        database.accepted_shares_path,
    )


@lru_cache
def get_access_settings() -> AccessSettings:
    return AccessSettings()


@lru_cache
def get_access_relay() -> IAccessRelay:
    return AccessRelay(settings=get_access_settings())


@lru_cache
def get_access_http_client() -> AccessHttpClient:
    return httpx.Client()


def get_access_service(
    access_repository: IAccessRepository = Depends(get_access_repository),
    access_relay: IAccessRelay = Depends(get_access_relay),
    http_client: AccessHttpClient = Depends(get_access_http_client),
    settings: AccessSettings = Depends(get_access_settings),
) -> IAccessService:
    return AccessService(
        access_repository=access_repository,
        access_relay=access_relay,
        http_client=http_client,
        settings=settings,
    )


def get_base_registry_service(
    base_registry_repository: IBaseRegistryRepository = Depends(get_base_registry_repository),
    access_service: IAccessService = Depends(get_access_service),
) -> IBaseRegistryService:
    return BaseRegistryService(
        base_registry_repository=base_registry_repository,
        access_service=access_service,
    )


def get_working_base(base_ref: str | None, write: bool) -> WorkingBaseRecord:
    session = get_registry_session()
    base_registry_repository = get_base_registry_repository(db=session)
    access_service = get_access_service(
        access_repository=get_access_repository(),
        access_relay=get_access_relay(),
        http_client=get_access_http_client(),
        settings=get_access_settings(),
    )
    base_registry_service = get_base_registry_service(
        base_registry_repository=base_registry_repository,
        access_service=access_service,
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

    if working_base.path == "":
        raise WorkingBaseNotFoundError(working_base.base_ref)

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


def get_merge_repository(db: Session = Depends(get_db)) -> IMergeRepository:
    return MergeRepository(db)


def get_embedding_repository(db: Session = Depends(get_db)) -> IEmbeddingRepository:
    return EmbeddingRepository(db)


def get_sharing_repository(
    db: Session = Depends(get_registry_db),
) -> ISharingRepository:
    return SharingRepository(db)


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


def get_export_repository(base_ref: str | None, write: bool) -> IExportRepository:
    working_base = get_working_base(base_ref=base_ref, write=write)

    return ExportRepository(source_path=Path(working_base.path))


def get_embedding_provider() -> IEmbeddingProvider:
    return build_embedding_provider(access_repository=get_access_repository())


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


def get_export_service(
    page_repository: IPageRepository = Depends(get_page_repository),
    smart_folder_service: ISmartFolderService = Depends(get_smart_folder_service),
    base_ref: str | None = Query(default=None),
) -> IExportService:
    return ExportService(
        export_repository=get_export_repository(base_ref=base_ref, write=False),
        page_repository=page_repository,
        smart_folder_service=smart_folder_service,
    )


def get_merge_service(
    merge_repository: IMergeRepository = Depends(get_merge_repository),
    page_repository: IPageRepository = Depends(get_page_repository),
    link_repository: ILinkRepository = Depends(get_link_repository),
    backup_service: IBackupService = Depends(get_backup_service),
) -> IMergeService:
    return MergeService(
        merge_repository=merge_repository,
        page_repository=page_repository,
        link_repository=link_repository,
        backup_service=backup_service,
    )


def get_sharing_service(
    sharing_repository: ISharingRepository = Depends(get_sharing_repository),
    base_registry_repository: IBaseRegistryRepository = Depends(get_base_registry_repository),
    access_service: IAccessService = Depends(get_access_service),
) -> ISharingService:
    return SharingService(
        sharing_repository=sharing_repository,
        base_registry_repository=base_registry_repository,
        access_service=access_service,
    )
