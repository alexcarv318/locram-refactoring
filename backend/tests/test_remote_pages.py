import json as json_module

import httpx
import pytest
from fastapi.testclient import TestClient

from repositories.links import RemoteLinkRepository
from repositories.pages import RemotePageRepository
from repositories.sharing import ShareSession
from schemas.access import AcceptedShareRecord, AccessShareSessionResolveRequest
from schemas.pages import PageStatus
from schemas.sharing import ShareGrantCreateRequest, ShareGrantPermission, ShareTransportEnvelope
from services.access import AccessService
from services.sharing import SharingService


class ScriptedShareHttp:
    def __init__(self, body: bytes, status_code: int = 200) -> None:
        self.body = body
        self.status_code = status_code
        self.urls: list[str] = []

    def post(
        self,
        url: str,
        *,
        json: dict[str, str] | None = None,
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
        params: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response:
        self.urls.append(url)

        return httpx.Response(self.status_code, content=self.body)

    def get(
        self,
        url: str,
        *,
        params: dict[str, str] | None = None,
        headers: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response:
        return httpx.Response(404)


class OperationShareHttp:
    def __init__(self, bodies: dict[str, bytes]) -> None:
        self.bodies = bodies
        self.urls: list[str] = []
        self.operations: list[str] = []

    def post(
        self,
        url: str,
        *,
        json: dict[str, str] | None = None,
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
        params: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response:
        self.urls.append(url)
        payload = json_module.loads(content or b"{}")
        operation = str(payload.get("operation") or "")
        page_id = str(payload.get("page_id") or "")
        self.operations.append(operation)
        body = self.bodies.get(f"{operation}:{page_id}", self.bodies[operation])

        return httpx.Response(200, content=body)

    def get(
        self,
        url: str,
        *,
        params: dict[str, str] | None = None,
        headers: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response:
        return httpx.Response(404)


def _share() -> AcceptedShareRecord:
    envelope = ShareTransportEnvelope(
        broker_base_url="https://broker.example.test",
        device_id="device-one",
        owner_access_url="https://device-one.example.test/mcp",
        owner_proof_key_id="key-one",
        owner_proof_issued_at="2026-01-01T00:00:00Z",
        owner_proof="proof",
        base_share_grant_id="grant-one",
        recipient_actor_ref="account:alice",
        share_base_id="base-one",
        share_base_title="Shared Notes",
        permission=ShareGrantPermission.WRITE,
    )

    return AcceptedShareRecord(
        grant_id="grant-one",
        share_base_id="base-one",
        share_base_title="Shared Notes",
        permission=ShareGrantPermission.WRITE,
        recipient_actor_ref="account:alice",
        owner_actor_ref="device:owner-one",
        broker_base_url="https://broker.example.test",
        device_id="device-one",
        accepted_at="2026-01-01T00:00:00Z",
        invite_url="https://broker.example.test/public-app/base-share?grant=grant-one",
        transport_envelope=envelope,
    )


def _envelope(grant_id: str, base_id: str) -> dict[str, str]:
    return {
        "broker_base_url": "https://broker.example.test",
        "device_id": "device-one",
        "owner_access_url": "https://device-one.example.test/mcp",
        "owner_proof_key_id": "key-one",
        "owner_proof_issued_at": "2026-01-01T00:00:00Z",
        "owner_proof": "proof",
        "base_share_grant_id": grant_id,
        "recipient_actor_ref": "account:alice",
        "share_base_id": base_id,
        "share_base_title": "Notes",
        "permission": "write",
    }


def test_remote_list_get_search_and_save() -> None:
    listed = ScriptedShareHttp(
        b'{"session_state":"ready","items":[{"id":"page-one","title":"Alpha",'
        b'"type":"fleeting","status":"active","parent_id":null,'
        b'"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z",'
        b'"review_interval_days":7,"child_count":0,"active_descendant_count":0}]}'
    )
    session = ShareSession(_share(), "account:alice", listed)
    items = RemotePageRepository(session).list_pages(PageStatus.ACTIVE, None, True, 10, 0)

    detail = ScriptedShareHttp(
        b'{"session_state":"ready","item":{"id":"page-one","title":"Alpha",'
        b'"content":"# Alpha\\n\\nhello","type":"fleeting","status":"active",'
        b'"subject":[],"tags":[],"parent_id":null,"review_interval_days":7,'
        b'"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z",'
        b'"connected_to":[{"id":"page-two","title":"Beta","link_type":"related",'
        b'"direction":"outgoing"}]}}'
    )
    session = ShareSession(_share(), "account:alice", detail)
    page = RemotePageRepository(session).get("page-one")
    links = RemoteLinkRepository(session).list_for_page("page-one")
    saved = RemotePageRepository(session).save(page) if page is not None else None

    searched = ScriptedShareHttp(
        b'{"session_state":"ready","items":[{"id":"page-one","title":"Alpha",'
        b'"type":"fleeting","status":"active","snippet":"hello","rank":1.0}]}'
    )
    hits = RemotePageRepository(
        ShareSession(_share(), "account:alice", searched)
    ).search("hello", 10)

    assert items[0].id == "page-one"
    assert page is not None
    assert page.content.startswith("# Alpha")
    assert [link.target_id for link in links] == ["page-two"]
    assert saved is not None
    assert hits[0].id == "page-one"
    assert listed.urls[0].endswith("/api/public-app/base-share/session")


def test_shared_base_lists_pages_over_http(
    live_client: TestClient,
    sharing_service: SharingService,
    enrolled_access: AccessService,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sharing_service._access_service = enrolled_access
    created = sharing_service.create_grant(
        ShareGrantCreateRequest(
            owner_actor_ref="device:owner-one",
            recipient_account_id="alice",
            permission=ShareGrantPermission.READ,
        )
    )
    invite = sharing_service.get_invite(created.grant_id, "Ada", None)
    enrolled_access.resolve_share_session(
        AccessShareSessionResolveRequest(input=invite.share_invite_url)
    )
    fake = ScriptedShareHttp(
        b'{"session_state":"ready","items":[{"id":"page-one","title":"Alpha",'
        b'"type":"fleeting","status":"active","parent_id":null,'
        b'"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z",'
        b'"review_interval_days":7,"child_count":0,"active_descendant_count":0}]}'
    )
    monkeypatch.setattr("dependencies.get_access_http_client", lambda: fake)
    listed = live_client.get(
        f"/api/pages?base_ref=shared:{created.grant_id}&recipient_actor_ref=account:alice"
    )

    assert listed.status_code == 200
    assert listed.json()["items"][0]["id"] == "page-one"
    assert fake.urls[0].endswith("/api/public-app/base-share/session")


def test_shared_base_get_page_includes_links(
    live_client: TestClient,
    sharing_service: SharingService,
    enrolled_access: AccessService,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sharing_service._access_service = enrolled_access
    created = sharing_service.create_grant(
        ShareGrantCreateRequest(
            owner_actor_ref="device:owner-one",
            recipient_account_id="alice",
            permission=ShareGrantPermission.READ,
        )
    )
    invite = sharing_service.get_invite(created.grant_id, "Ada", None)
    enrolled_access.resolve_share_session(
        AccessShareSessionResolveRequest(input=invite.share_invite_url)
    )
    fake = OperationShareHttp(
        {
            "get_page": (
                b'{"session_state":"ready","item":{"id":"page-one","title":"Alpha",'
                b'"content":"# Alpha\\n\\nhello","type":"fleeting","status":"active",'
                b'"subject":[],"tags":[],"parent_id":null,"review_interval_days":7,'
                b'"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z",'
                b'"connected_to":[{"id":"page-two","title":"Beta","link_type":"related",'
                b'"direction":"outgoing"}]}}'
            ),
            "get_page:page-two": (
                b'{"session_state":"ready","item":{"id":"page-two","title":"Beta",'
                b'"content":"# Beta\\n\\nworld","type":"fleeting","status":"active",'
                b'"subject":[],"tags":[],"parent_id":null,"review_interval_days":7,'
                b'"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z",'
                b'"connected_to":[{"id":"page-one","title":"Alpha","link_type":"related",'
                b'"direction":"incoming"}]}}'
            ),
            "list_pages": b'{"session_state":"ready","items":[]}',
        }
    )
    monkeypatch.setattr("dependencies.get_access_http_client", lambda: fake)
    fetched = live_client.get(
        "/api/pages/page-one"
        f"?base_ref=shared:{created.grant_id}&recipient_actor_ref=account:alice"
    )
    graph = live_client.get(
        "/api/pages/page-one/graph"
        f"?base_ref=shared:{created.grant_id}&recipient_actor_ref=account:alice"
    )

    assert fetched.status_code == 200
    assert fetched.json()["item"]["connected_to"][0]["id"] == "page-two"
    assert fetched.json()["item"]["connected_to"][0]["link_type"] == "related"
    assert graph.status_code == 200
    assert any(link["target"] == "page-two" for link in graph.json()["item"]["links"])


def test_owner_share_session_lists_and_reads_pages(
    live_client: TestClient,
    sharing_service: SharingService,
) -> None:
    created_page = live_client.post("/api/pages", json={"title": "Alpha", "content": "hello"})
    related = live_client.post("/api/pages", json={"title": "Beta", "content": "world"})
    page_id = created_page.json()["item"]["id"]
    related_id = related.json()["item"]["id"]
    linked = live_client.post(
        "/api/links",
        json={"source_id": page_id, "target_id": related_id, "link_type": "related"},
    )
    created = sharing_service.create_grant(
        ShareGrantCreateRequest(
            owner_actor_ref="device:owner-one",
            recipient_account_id="alice",
            permission=ShareGrantPermission.WRITE,
        )
    )
    listed = live_client.post(
        "/api/access/base-share-grants/session",
        json={
            "transport_envelope": _envelope(created.grant_id, created.base_id),
            "operation": "list_pages",
            "recipient_actor_ref": "account:alice",
            "parent_id": "root",
        },
    )
    fetched = live_client.post(
        "/mcp/api/access/base-share-grants/session",
        json={
            "transport_envelope": _envelope(created.grant_id, created.base_id),
            "operation": "get_page",
            "recipient_actor_ref": "account:alice",
            "page_id": page_id,
        },
    )
    graph = live_client.post(
        "/api/access/base-share-grants/session",
        json={
            "transport_envelope": _envelope(created.grant_id, created.base_id),
            "operation": "get_page_graph",
            "recipient_actor_ref": "account:alice",
            "page_id": page_id,
            "expand_hops": 1,
        },
    )

    assert created_page.status_code == 201
    assert related.status_code == 201
    assert linked.status_code == 201
    assert listed.status_code == 200
    assert listed.json()["session_state"] == "ready"
    assert any(item["id"] == page_id for item in listed.json()["items"])
    assert fetched.status_code == 200
    assert fetched.json()["item"]["id"] == page_id
    assert "hello" in fetched.json()["item"]["content"]
    assert any(item["id"] == related_id for item in fetched.json()["item"]["connected_to"])
    assert graph.status_code == 200
    assert graph.json()["item"]["selected_page_id"] == page_id
    assert any(link["target"] == related_id for link in graph.json()["item"]["links"])
