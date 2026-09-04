from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from exceptions.access import EditionCapabilityError
from schemas.access import AccessEnrollRequest, DesktopCapability
from schemas.embeddings import EmbeddingProviderKind, EmbeddingSettingsPatch
from schemas.exports import ExportScope
from schemas.sharing import ShareGrantCreateRequest, ShareGrantPermission
from schemas.smart_folders import FilterState
from services.access import AccessService
from services.bases import BaseRegistryService
from services.embeddings import EmbeddingService
from services.exports import ExportService
from services.merges import MergeService
from services.pages import PageService
from services.sharing import SharingService
from services.smart_folders import SmartFolderService
from tests.conftest import ScriptedAccessHttp, make_access_service
from tests.entitlement import signed_entitlement_lease


def _enroll(service: AccessService) -> AccessService:
    service.enroll(
        AccessEnrollRequest(redemption_code="code-one", broker_base_url="https://broker.example.test")
    )
    return service


def test_unenrolled_desktop_is_free(access_service: AccessService) -> None:
    activation = access_service.desktop_activation_status()
    edition = access_service.desktop_edition()

    assert activation.edition == "free"
    assert activation.state == "free"
    assert activation.usable_capabilities.multi_base is False
    assert activation.usable_capabilities.share_base is False
    assert activation.usable_capabilities.managed_public_mcp is False
    assert edition.edition == "free"
    assert edition.capabilities.multi_base is False
    assert access_service.has_capability(DesktopCapability.MULTI_BASE) is False


def test_enrolled_pro_lease_unlocks_capabilities(enrolled_access: AccessService) -> None:
    activation = enrolled_access.desktop_activation_status()

    assert activation.edition == "pro"
    assert activation.state == "active"
    assert activation.usable_capabilities.multi_base is True
    assert activation.usable_capabilities.share_base is True
    assert activation.usable_capabilities.managed_public_mcp is True
    assert activation.entitlement_lease is not None
    assert activation.entitlement_lease.verified is True
    assert activation.entitlement_lease.state == "active"
    assert enrolled_access.has_capability(DesktopCapability.MULTI_BASE) is True


def test_enrolled_free_lease_stays_free() -> None:
    service = _enroll(
        make_access_service(ScriptedAccessHttp(signed_entitlement_lease(plan_code="locram_free")))
    )
    activation = service.desktop_activation_status()

    assert activation.state == "active"
    assert activation.edition == "free"
    assert activation.usable_capabilities.multi_base is False
    assert service.has_capability(DesktopCapability.SHARE_BASE) is False


def test_expired_lease_is_free() -> None:
    service = _enroll(
        make_access_service(
            ScriptedAccessHttp(signed_entitlement_lease(expires_at="2020-01-01T00:00:00Z"))
        )
    )

    assert service.desktop_edition().edition == "free"
    assert service.connect().runtime_result.action == "network_unavailable"


def test_free_cannot_create_or_switch_extra_bases(
    base_registry_service: BaseRegistryService,
    free_enrolled_access: AccessService,
    tmp_path: Path,
) -> None:
    base_registry_service._access_service = free_enrolled_access
    first = base_registry_service.create(str(tmp_path / "one.db"), "One", activate=True)

    with pytest.raises(EditionCapabilityError):
        base_registry_service.create(str(tmp_path / "two.db"), "Two", activate=False)

    other = Path(tmp_path / "other.db")
    other.write_bytes(Path(first.path).read_bytes())

    with pytest.raises(EditionCapabilityError):
        base_registry_service.register(str(other), activate=False, display_name="Other")

    replaced = base_registry_service.replace_active(str(other))

    assert replaced.path == str(other.resolve())
    assert replaced.is_active is True


def test_free_cannot_export_or_save_presets(
    export_service: ExportService,
    smart_folder_service: SmartFolderService,
    free_enrolled_access: AccessService,
) -> None:
    export_service._access_service = free_enrolled_access
    smart_folder_service._access_service = free_enrolled_access

    with pytest.raises(EditionCapabilityError):
        export_service.export_subgraph(ExportScope(include_all=True))

    with pytest.raises(EditionCapabilityError):
        smart_folder_service.create_preset("Saved", FilterState())


def test_free_cannot_plan_merge(
    merge_bundle: tuple[MergeService, ExportService, PageService],
    free_enrolled_access: AccessService,
) -> None:
    merge_service, _export_service, _page_service = merge_bundle
    merge_service._access_service = free_enrolled_access

    with pytest.raises(EditionCapabilityError):
        merge_service.plan("/tmp/missing.db")


def test_free_cannot_share_or_use_hosted_embeddings(
    sharing_service: SharingService,
    embedding_service: EmbeddingService,
    free_enrolled_access: AccessService,
) -> None:
    sharing_service._access_service = free_enrolled_access
    embedding_service._access_service = free_enrolled_access

    with pytest.raises(EditionCapabilityError):
        sharing_service.create_grant(
            ShareGrantCreateRequest(
                owner_actor_ref="device:owner-one",
                recipient_account_id="alice",
                permission=ShareGrantPermission.READ,
            )
        )

    with pytest.raises(EditionCapabilityError):
        embedding_service.update_settings(
            EmbeddingSettingsPatch(provider=EmbeddingProviderKind.LOCRAM_HOSTED)
        )


def test_free_http_export_is_denied(live_client: TestClient) -> None:
    created = live_client.post("/api/pages", json={"title": "Note", "content": "body"})
    page_id = created.json()["item"]["id"]
    exported = live_client.post("/api/export", json={"page_ids": [page_id]})
    edition = live_client.get("/api/desktop/edition")

    assert exported.status_code == 403
    assert exported.json()["code"] == "EDITION_CAPABILITY_DENIED"
    assert edition.json()["edition"] == "free"


def test_pro_http_edition(pro_client: TestClient) -> None:
    edition = pro_client.get("/api/desktop/edition")
    activation = pro_client.get("/api/desktop/activation")

    assert edition.status_code == 200
    assert edition.json()["edition"] == "pro"
    assert edition.json()["capabilities"]["multiBase"] is True
    assert activation.json()["edition"] == "pro"
    assert activation.json()["usableCapabilities"]["shareBase"] is True
