class AppError(Exception):
    status_code: int = 400
    code: str | None = None
