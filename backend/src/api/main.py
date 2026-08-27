import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from api.attachments import attachments_router
from api.backups import backups_router
from api.bases import bases_router
from api.bridge import bridge_router
from api.changes import changes_router
from api.embeddings import desktop_embeddings_router, embeddings_router
from api.exports import exports_router
from api.links import links_router
from api.merges import merges_router
from api.pages import pages_router
from api.smart_folders import notes_router, presets_router
from exceptions.app import AppError

app = FastAPI(title="locram")

app.include_router(pages_router)
app.include_router(links_router)
app.include_router(bases_router)
app.include_router(bridge_router)
app.include_router(changes_router)
app.include_router(attachments_router)
app.include_router(backups_router)
app.include_router(exports_router)
app.include_router(merges_router)
app.include_router(presets_router)
app.include_router(notes_router)
app.include_router(embeddings_router)
app.include_router(desktop_embeddings_router)


@app.exception_handler(AppError)
async def handle_app_error(_request: Request, error: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": str(error)},
    )


def main() -> None:
    uvicorn.run("api.main:app", host="127.0.0.1", port=8757, reload=True)


if __name__ == "__main__":
    main()
