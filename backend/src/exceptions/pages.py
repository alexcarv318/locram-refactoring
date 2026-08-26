from exceptions.app import AppError


class PageError(AppError):
    status_code: int = 400


class PageNotFoundError(PageError):
    status_code = 404

    def __init__(self, page_id: str) -> None:
        super().__init__(f"Page {page_id} not found")

        self.page_id = page_id


class PageNotDeletedError(PageError):
    status_code = 409

    def __init__(self, page_id: str) -> None:
        super().__init__(f"Page {page_id} is not in to_delete state")

        self.page_id = page_id


class HubParentError(PageError):
    status_code = 400

    def __init__(self) -> None:
        super().__init__("Hub pages cannot have parent_id; hubs must be root-level nodes.")


class PagePromotionError(PageError):
    status_code = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)


class PageTextNotFoundError(PageError):
    status_code = 404

    def __init__(self, page_id: str) -> None:
        super().__init__("Text not found in page content")

        self.page_id = page_id
