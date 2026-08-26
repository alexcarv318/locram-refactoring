import math
import struct

from sqlalchemy import func, select

from database import BaseRepository
from interfaces.repositories.embeddings import IEmbeddingRepository
from models.embeddings import PageEmbedding
from models.pages import Page
from schemas.embeddings import EmbeddingCoverage, SimilarPage
from schemas.pages import PageStatus


class EmbeddingRepository(BaseRepository, IEmbeddingRepository):
    def store(
        self,
        page_id: str,
        field: str,
        embedding: bytes,
        model: str,
        dimension: int,
        embedded_at: str,
    ) -> None:
        row = self.db.get(PageEmbedding, (page_id, field))

        if row is None:
            self.db.add(
                PageEmbedding(
                    page_id=page_id,
                    field=field,
                    embedding=embedding,
                    model=model,
                    dimension=dimension,
                    embedded_at=embedded_at,
                )
            )
        else:
            row.embedding = embedding
            row.model = model
            row.dimension = dimension
            row.embedded_at = embedded_at

        self.db.flush()
        self.db.commit()

    def find_unembedded(self, limit: int, model: str | None) -> list[str]:
        if model is not None:
            return self.find_stale(model, limit)

        statement = (
            select(Page.id)
            .outerjoin(
                PageEmbedding,
                (PageEmbedding.page_id == Page.id) & (PageEmbedding.field == "content"),
            )
            .where(Page.status == PageStatus.ACTIVE, PageEmbedding.page_id.is_(None))
            .limit(limit)
        )

        return list(self.db.scalars(statement))

    def find_stale(self, model: str, limit: int) -> list[str]:
        statement = (
            select(Page.id)
            .outerjoin(
                PageEmbedding,
                (PageEmbedding.page_id == Page.id)
                & (PageEmbedding.field == "content")
                & (PageEmbedding.model == model),
            )
            .where(
                Page.status == PageStatus.ACTIVE,
                (PageEmbedding.page_id.is_(None)) | (PageEmbedding.embedded_at < Page.updated_at),
            )
            .limit(limit)
        )

        return list(self.db.scalars(statement))

    def search_similar(self, query: list[float], model: str, limit: int) -> list[SimilarPage]:
        statement = (
            select(Page, PageEmbedding)
            .join(PageEmbedding, PageEmbedding.page_id == Page.id)
            .where(
                Page.status == PageStatus.ACTIVE,
                PageEmbedding.field == "content",
                PageEmbedding.model == model,
            )
        )
        ranked: list[SimilarPage] = []

        for page, row in self.db.execute(statement):
            distance = self._cosine_distance(query, self._unpack(row.embedding, row.dimension))

            if distance is None:
                continue

            ranked.append(
                SimilarPage(
                    page_id=page.id,
                    title=page.title,
                    type=page.type,
                    status=page.status,
                    distance=distance,
                )
            )

        ranked.sort(key=lambda item: item.distance)

        return ranked[:limit]

    def get_coverage(self, model: str | None) -> EmbeddingCoverage:
        total_active = self.db.scalar(
            select(func.count()).select_from(Page).where(Page.status == PageStatus.ACTIVE)
        )
        searched_statement = (
            select(func.count())
            .select_from(Page)
            .join(PageEmbedding, PageEmbedding.page_id == Page.id)
            .where(
                Page.status == PageStatus.ACTIVE,
                PageEmbedding.field == "content",
            )
        )

        if model is not None:
            searched_statement = searched_statement.where(PageEmbedding.model == model)

        searched = self.db.scalar(searched_statement)

        return EmbeddingCoverage(searched=searched or 0, total_active=total_active or 0)

    @staticmethod
    def _unpack(payload: bytes, dimension: int) -> list[float]:
        return list(struct.unpack(f"<{dimension}f", payload))

    @staticmethod
    def _cosine_distance(left: list[float], right: list[float]) -> float | None:
        if len(left) != len(right) or not left:
            return None

        dot = 0.0
        left_norm = 0.0
        right_norm = 0.0

        for left_value, right_value in zip(left, right, strict=True):
            if not math.isfinite(left_value) or not math.isfinite(right_value):
                return None

            dot += left_value * right_value
            left_norm += left_value * left_value
            right_norm += right_value * right_value

        if left_norm == 0.0 or right_norm == 0.0:
            return None

        similarity = dot / math.sqrt(left_norm * right_norm)

        return 1.0 - similarity
