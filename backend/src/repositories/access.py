from pathlib import Path

from interfaces.repositories.access import IAccessRepository
from schemas.access import (
    AcceptedShareList,
    AcceptedShareRecord,
    AccessCredentialRecord,
    AccessSecrets,
)


class AccessRepository(IAccessRepository):
    def __init__(
        self,
        path: Path,
        credentials_path: Path | None = None,
        accepted_shares_path: Path | None = None,
    ) -> None:
        self._path = path
        self._credentials_path = credentials_path or path.with_name("access-credentials.json")
        self._accepted_shares_path = accepted_shares_path or path.with_name("accepted-shares.json")

    def load(self) -> AccessCredentialRecord | None:
        if not self._path.is_file():
            return None

        record = AccessCredentialRecord.model_validate_json(self._path.read_text())

        if self._credentials_path.is_file():
            secrets = AccessSecrets.model_validate_json(self._credentials_path.read_text())
            return record.model_copy(update={"credential_data": secrets.credential_data})

        return record

    def save(self, record: AccessCredentialRecord) -> AccessCredentialRecord:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._credentials_path.parent.mkdir(parents=True, exist_ok=True)
        public_record = record.model_copy(update={"credential_data": {}})
        self._path.write_text(public_record.model_dump_json(indent=2))
        self._credentials_path.write_text(
            AccessSecrets(credential_data=record.credential_data).model_dump_json(indent=2)
        )
        return record

    def clear(self) -> None:
        if self._path.is_file():
            self._path.unlink()

        if self._credentials_path.is_file():
            self._credentials_path.unlink()

    def list_accepted_shares(self) -> list[AcceptedShareRecord]:
        if not self._accepted_shares_path.is_file():
            return []

        return AcceptedShareList.model_validate_json(self._accepted_shares_path.read_text()).items

    def get_accepted_share(self, grant_id: str) -> AcceptedShareRecord | None:
        for share in self.list_accepted_shares():
            if share.grant_id == grant_id:
                return share

        return None

    def save_accepted_share(self, share: AcceptedShareRecord) -> AcceptedShareRecord:
        shares = [item for item in self.list_accepted_shares() if item.grant_id != share.grant_id]
        shares.append(share)
        self._write_accepted_shares(shares)
        return share

    def delete_accepted_share(self, grant_id: str) -> None:
        shares = [item for item in self.list_accepted_shares() if item.grant_id != grant_id]
        self._write_accepted_shares(shares)

    def _write_accepted_shares(self, shares: list[AcceptedShareRecord]) -> None:
        self._accepted_shares_path.parent.mkdir(parents=True, exist_ok=True)
        self._accepted_shares_path.write_text(
            AcceptedShareList(items=shares).model_dump_json(indent=2)
        )
