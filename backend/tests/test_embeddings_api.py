from fastapi.testclient import TestClient

from schemas.pages import PageCreate
from services.pages import PageService


def test_http_embedding_status_and_fallback_search(
    client: TestClient,
    page_service: PageService,
) -> None:
    page_service.create_page(PageCreate(title="Alpha", content="searchable alpha"))
    status = client.get("/api/embeddings/status")
    search = client.get("/api/embeddings/search?q=alpha")
    run = client.post("/api/embeddings/run", json={"force": False})

    assert status.status_code == 200
    assert status.json()["item"]["semantic_ready"] is False
    assert status.json()["item"]["vector_backend"] == "python-cosine"
    assert search.status_code == 200
    assert search.json()["item"]["semantic_available"] is False
    assert search.json()["item"]["fallback_reason_code"] == "SEMANTIC_NOT_CONFIGURED"
    assert run.status_code == 200
    assert run.json()["item"]["warning"] == "Embedding provider is not configured"
