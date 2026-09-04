from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.access import access_router
from api.attachments import attachments_router
from api.backups import backups_router
from api.bases import bases_router
from api.bridge import bridge_router
from api.changes import changes_router
from api.embeddings import desktop_embeddings_router, embeddings_router
from api.exports import exports_router
from api.links import links_router
from api.mcp_tools import mcp_tools_router
from api.merges import merges_router
from api.pages import pages_router
from api.sharing import sharing_router
from api.smart_folders import notes_router, presets_router
from api.user_settings import user_settings_router
from exceptions.app import AppError
from mcp_server.main import mcp_server

app = FastAPI(title="locram")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:1420", "http://localhost:1420"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pages_router)
app.include_router(links_router)
app.include_router(bases_router)
app.include_router(bridge_router)
app.include_router(changes_router)
app.include_router(attachments_router)
app.include_router(backups_router)
app.include_router(exports_router)
app.include_router(merges_router)
app.include_router(sharing_router)
app.include_router(access_router)
app.include_router(access_router, prefix="/mcp")
app.include_router(presets_router)
app.include_router(notes_router)
app.include_router(embeddings_router)
app.include_router(desktop_embeddings_router)
app.include_router(mcp_tools_router)
app.include_router(user_settings_router)


@app.exception_handler(AppError)
async def handle_app_error(_request: Request, error: AppError) -> JSONResponse:
    content = {"detail": str(error), "error": str(error)}

    if error.code is not None:
        content["code"] = error.code

    return JSONResponse(status_code=error.status_code, content=content)


def mount_mcp_http(application: FastAPI) -> None:
    mcp_http_app = mcp_server.streamable_http_app()
    inner_lifespan = mcp_http_app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(_application: FastAPI) -> AsyncIterator[None]:
        async with inner_lifespan(mcp_http_app):
            yield

    application.router.lifespan_context = lifespan
    application.mount("/", mcp_http_app)


def main() -> None:
    mount_mcp_http(app)
    uvicorn.run(app, host="127.0.0.1", port=8757)


if __name__ == "__main__":
    main()
