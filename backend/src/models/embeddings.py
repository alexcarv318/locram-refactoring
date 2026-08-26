from sqlalchemy import ForeignKey, Integer, LargeBinary, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class PageEmbedding(Base):
    __tablename__ = "page_embeddings"

    page_id: Mapped[str] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"),
        primary_key=True,
    )
    field: Mapped[str] = mapped_column(Text, primary_key=True, default="content")
    embedding: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    dimension: Mapped[int] = mapped_column(Integer, nullable=False)
    embedded_at: Mapped[str] = mapped_column(Text, nullable=False)
