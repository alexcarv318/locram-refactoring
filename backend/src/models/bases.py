from sqlalchemy import Boolean, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from schemas.bases import AgentAccessMode


class RegistryEntry(Base):
    __tablename__ = "registry_entries"

    entry_id: Mapped[str] = mapped_column(Text, primary_key=True)
    path: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    base_id: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    agent_access_mode: Mapped[AgentAccessMode] = mapped_column(
        Enum(
            AgentAccessMode,
            values_callable=lambda members: [member.value for member in members],
            native_enum=False,
        ),
        nullable=False,
        default=AgentAccessMode.WRITE,
    )
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)


class BaseMetadata(Base):
    __tablename__ = "base_metadata"

    base_id: Mapped[str] = mapped_column(Text, primary_key=True)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
