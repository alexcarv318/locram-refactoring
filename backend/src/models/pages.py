from sqlalchemy import Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from database import Base
from schemas.pages import PageStatus, PageType


class Page(Base):
    __tablename__ = "pages"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    type: Mapped[PageType] = mapped_column(
        Enum(
            PageType,
            values_callable=lambda members: [member.value for member in members],
            native_enum=False,
        ),
        nullable=False,
        default=PageType.FLEETING,
    )
    status: Mapped[PageStatus] = mapped_column(
        Enum(
            PageStatus,
            values_callable=lambda members: [member.value for member in members],
            native_enum=False,
        ),
        nullable=False,
        default=PageStatus.ACTIVE,
    )
    subject: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("pages.id", ondelete="SET NULL"))
    content_hash: Mapped[str | None] = mapped_column(Text)
    review_interval_days: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    reviewed_at: Mapped[str | None] = mapped_column(Text)
