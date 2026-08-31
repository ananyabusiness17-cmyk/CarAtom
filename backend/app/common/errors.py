from fastapi.responses import JSONResponse


class DomainProblem(Exception):
    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        *,
        retryable: bool = False,
        allowed_actions: list[str] | None = None,
        request_id: str | None = None,
        details: dict[str, object] | None = None,
    ) -> None:
        self.status = status
        self.code = code
        self.message = message
        self.retryable = retryable
        self.allowed_actions = allowed_actions or []
        self.request_id = request_id
        self.details = details
        super().__init__(message)


def problem(
    status: int,
    code: str,
    message: str,
    request_id: str | None = None,
    *,
    retryable: bool = False,
    allowed_actions: list[str] | None = None,
    details: dict[str, object] | None = None,
) -> JSONResponse:
    body: dict[str, object] = {
        "code": code,
        "message": message,
        "retryable": retryable,
    }
    if request_id:
        body["request_id"] = request_id
    if allowed_actions is not None:
        body["allowed_actions"] = allowed_actions
    if details:
        body["details"] = details
    return JSONResponse(status_code=status, content=body)


def not_found(request_id: str | None = None) -> DomainProblem:
    return DomainProblem(404, "NOT_FOUND", "Not found.", request_id=request_id)
