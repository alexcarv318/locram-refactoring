from sqlalchemy import Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from schemas.links import LinkType


class Link(Base):
    __tablename__ = "links"

    source_id: Mapped[str] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"),
        primary_key=True,
    )
    target_id: Mapped[str] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"),
        primary_key=True,
    )
    link_type: Mapped[LinkType] = mapped_column(
        Enum(
            LinkType,
            values_callable=lambda members: [member.value for member in members],
            native_enum=False,
        ),
        primary_key=True,
    )
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
