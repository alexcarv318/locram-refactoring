import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from api.bases import bases_router
from api.links import links_router
from api.pages import pages_router
from exceptions.app import AppError

app = FastAPI(title="locram")
app.include_router(pages_router)
app.include_router(links_router)
app.include_router(bases_router)


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
