import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from api.links import links_router
from api.pages import pages_router
from exceptions.links import LinkError
from exceptions.pages import PageError

app = FastAPI(title="locram")
app.include_router(pages_router)
app.include_router(links_router)


@app.exception_handler(PageError)
async def handle_page_error(_request: Request, error: PageError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": str(error)},
    )


@app.exception_handler(LinkError)
async def handle_link_error(_request: Request, error: LinkError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": str(error)},
    )


def main() -> None:
    uvicorn.run("api.main:app", host="127.0.0.1", port=8757, reload=True)


if __name__ == "__main__":
    main()
