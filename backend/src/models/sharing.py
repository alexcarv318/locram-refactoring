from sqlalchemy import Enum, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from schemas.sharing import ShareGrantPermission


class BaseShareGrant(Base):
    __tablename__ = "base_share_grants"

    grant_id: Mapped[str] = mapped_column(Text, primary_key=True)
    owner_actor_ref: Mapped[str] = mapped_column(Text, nullable=False)
    recipient_actor_ref: Mapped[str] = mapped_column(Text, nullable=False)
    base_id: Mapped[str] = mapped_column(Text, nullable=False)
    entry_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    permission: Mapped[ShareGrantPermission] = mapped_column(
        Enum(
            ShareGrantPermission,
            values_callable=lambda members: [member.value for member in members],
            native_enum=False,
        ),
        nullable=False,
    )
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    last_invited_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    activated_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    revoked_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    revocation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
