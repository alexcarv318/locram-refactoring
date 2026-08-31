import httpx
from pydantic import ValidationError
from sqlalchemy import select

from database import BaseRepository
from exceptions.sharing import (
    SharedBaseRequestError,
    SharedBaseSessionError,
    ShareReacceptRequiredError,
)
from interfaces.repositories.sharing import IShareSession, ISharingRepository
from interfaces.services.access import AccessHttpClient
from models.sharing import BaseShareGrant
from schemas.access import AcceptedShareRecord
from schemas.sharing import (
    BaseShareErrorPayload,
    BaseShareItemPayload,
    BaseShareListPayload,
    BaseSharePageFields,
    BaseShareSearchPayload,
    BaseShareSessionRequest,
    RemotePageDetail,
    RemotePageListItem,
    RemoteSearchHit,
    ShareGrantPermission,
)


class SharingRepository(BaseRepository, ISharingRepository):
    def get(self, grant_id: str) -> BaseShareGrant | None:
        return self.db.get(BaseShareGrant, grant_id)

    def list_owner(self, owner_actor_ref: str) -> list[BaseShareGrant]:
        return list(
            self.db.scalars(
                select(BaseShareGrant)
                .where(BaseShareGrant.owner_actor_ref == owner_actor_ref)
                .order_by(BaseShareGrant.created_at.desc())
            )
        )

    def save(self, grant: BaseShareGrant) -> BaseShareGrant:
        saved = self.db.merge(grant)
        self.db.flush()
        self.db.commit()
        return saved

    def delete(self, grant_id: str) -> None:
        grant = self.get(grant_id)

        if grant is None:
            return

        self.db.delete(grant)
        self.db.flush()
        self.db.commit()


class ShareSession(IShareSession):
    def __init__(
        self,
        accepted_share: AcceptedShareRecord,
        recipient_actor_ref: str,
        http_client: AccessHttpClient,
    ) -> None:
        self._accepted_share = accepted_share
        self._recipient_actor_ref = recipient_actor_ref
        self._http_client = http_client
        self._pages: dict[str, RemotePageDetail | None] = {}

    def get_page(self, page_id: str) -> RemotePageDetail | None:
        if page_id in self._pages:
            return self._pages[page_id]

        response = self._operation("get_page", page_id=page_id)

        if self._is_missing(response):
            self._pages[page_id] = None

            return None

        self._raise_for_error(response)
        item = self._item_payload(response).item
        self._pages[page_id] = item

        return item

    def list_pages(
        self,
        parent_id: str,
        limit: int,
        offset: int,
    ) -> list[RemotePageListItem]:
        response = self._operation(
            "list_pages",
            parent_id=parent_id,
            limit=limit,
            offset=offset,
        )
        self._raise_for_error(response)

        return self._list_payload(response).items

    def search_pages(self, query: str, limit: int) -> list[RemoteSearchHit]:
        response = self._operation("search_pages", query=query, limit=limit)
        self._raise_for_error(response)

        return self._search_payload(response).items

    def update_page(self, page_id: str, title: str, content: str) -> RemotePageDetail:
        response = self._operation(
            "update_page",
            page_id=page_id,
            required_permission=ShareGrantPermission.WRITE.value,
            fields=BaseSharePageFields(title=title, content=content),
        )

        if self._is_missing(response):
            raise SharedBaseSessionError("not_found", f"Page {page_id} not found", 404)

        self._raise_for_error(response)
        item = self._item_payload(response).item

        if item is None:
            raise SharedBaseRequestError("Remote shared base update returned no page")

        self._pages[page_id] = item

        return item

    def _operation(
        self,
        operation: str,
        page_id: str | None = None,
        parent_id: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
        query: str | None = None,
        required_permission: str | None = None,
        fields: BaseSharePageFields | None = None,
    ) -> httpx.Response:
        invite_url = (self._accepted_share.invite_url or "").strip()

        if invite_url == "":
            raise ShareReacceptRequiredError()

        url = (
            f"{self._accepted_share.broker_base_url.rstrip('/')}"
            "/api/public-app/base-share/session"
        )

        try:
            return self._http_client.post(
                url,
                content=BaseShareSessionRequest(
                    invite_url=invite_url or None,
                    transport_envelope=self._accepted_share.transport_envelope,
                    operation=operation,
                    recipient_actor_ref=self._recipient_actor_ref,
                    required_permission=required_permission,
                    parent_id=parent_id,
                    limit=limit,
                    offset=offset,
                    page_id=page_id,
                    query=query,
                    fields=fields,
                ).model_dump_json().encode(),
                headers={"Content-Type": "application/json"},
                timeout=15.0,
            )
        except httpx.HTTPError as error:
            raise SharedBaseRequestError(
                "Broker request could not be completed."
            ) from error

    def _error_payload(self, response: httpx.Response) -> BaseShareErrorPayload:
        try:
            return BaseShareErrorPayload.model_validate_json(response.content)
        except ValidationError:
            return BaseShareErrorPayload()

    def _item_payload(self, response: httpx.Response) -> BaseShareItemPayload:
        try:
            return BaseShareItemPayload.model_validate_json(response.content)
        except ValidationError as error:
            raise SharedBaseRequestError(
                "Brokered base-share gateway returned invalid payload"
            ) from error

    def _list_payload(self, response: httpx.Response) -> BaseShareListPayload:
        try:
            return BaseShareListPayload.model_validate_json(response.content)
        except ValidationError as error:
            raise SharedBaseRequestError(
                "Brokered base-share gateway returned invalid payload"
            ) from error

    def _search_payload(self, response: httpx.Response) -> BaseShareSearchPayload:
        try:
            return BaseShareSearchPayload.model_validate_json(response.content)
        except ValidationError as error:
            raise SharedBaseRequestError(
                "Brokered base-share gateway returned invalid payload"
            ) from error

    def _is_missing(self, response: httpx.Response) -> bool:
        if response.status_code == 404:
            return True

        return self._error_payload(response).error in {"missing", "not_found"}

    def _raise_for_error(self, response: httpx.Response) -> None:
        payload = self._error_payload(response)

        if payload.error is None and response.status_code < 400:
            return

        if payload.error == "share_reaccept_required":
            raise ShareReacceptRequiredError()

        code = "unavailable"
        message = "Remote shared base request failed."

        if payload.error == "invalid_owner_authorization":
            code = "invalid_owner_authorization"
            message = "Remote shared base authorization was rejected."
        elif payload.error == "working_base_forbidden":
            code = "working_base_forbidden"
            message = "Remote shared base access was denied."
        elif payload.error in {"missing", "not_found"}:
            code = "not_found"
            message = "Remote shared base was not found."
        elif payload.error == "unavailable":
            message = "Remote shared base is unavailable."

        if payload.reason is not None and payload.reason.strip() != "":
            message = payload.reason

        status_code = response.status_code

        if status_code < 400:
            status_code = 502

        raise SharedBaseSessionError(code, message, status_code)
