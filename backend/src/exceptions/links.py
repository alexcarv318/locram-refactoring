class LinkError(Exception):
    status_code: int = 400


class SelfLinkError(LinkError):
    status_code = 400

    def __init__(self) -> None:
        super().__init__("A page cannot link to itself.")
