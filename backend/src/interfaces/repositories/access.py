from abc import ABC, abstractmethod

from schemas.access import (
    AcceptedShareRecord,
    AccessCredentialRecord,
    DesktopActivationAttemptRecord,
)


class IAccessRepository(ABC):
    @abstractmethod
    def load(self) -> AccessCredentialRecord | None: ...

    @abstractmethod
    def save(self, record: AccessCredentialRecord) -> AccessCredentialRecord: ...

    @abstractmethod
    def clear(self) -> None: ...

    @abstractmethod
    def load_activation_attempt(self) -> DesktopActivationAttemptRecord | None: ...

    @abstractmethod
    def save_activation_attempt(
        self,
        record: DesktopActivationAttemptRecord,
    ) -> DesktopActivationAttemptRecord: ...

    @abstractmethod
    def clear_activation_attempt(self) -> None: ...

    @abstractmethod
    def list_accepted_shares(self) -> list[AcceptedShareRecord]: ...

    @abstractmethod
    def get_accepted_share(self, grant_id: str) -> AcceptedShareRecord | None: ...

    @abstractmethod
    def save_accepted_share(self, share: AcceptedShareRecord) -> AcceptedShareRecord: ...

    @abstractmethod
    def delete_accepted_share(self, grant_id: str) -> None: ...
