from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.routing import Mount

from api.main import app, mount_mcp_http


def test_imported_app_does_not_mount_mcp() -> None:
    assert not any(type(route) is Mount for route in app.routes)


def test_mcp_http_mounts_at_mcp() -> None:
    application = FastAPI()
    mount_mcp_http(application)

    with TestClient(application) as client:
        response = client.post("/mcp")

    assert response.status_code != 404
    assert response.status_code != 500
