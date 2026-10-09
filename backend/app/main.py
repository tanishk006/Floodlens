"""FastAPI application factory and centralized error handling."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes.health import router as health_router
from app.core.config import get_settings
from app.schemas.errors import ApiError, ApiState
from app.services.errors import ServiceError

logger = logging.getLogger(__name__)


def _error_response(state: ApiState, message: str, status_code: int) -> JSONResponse:
    body = ApiError(status=state, message=message)
    return JSONResponse(status_code=status_code, content=body.model_dump(mode="json"))


def _http_error_state(status_code: int) -> ApiState:
    if status_code < 500:
        return ApiState.INVALID_INPUT
    if status_code == 503:
        return ApiState.DATA_UNAVAILABLE
    return ApiState.INTERNAL_ERROR


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    application = FastAPI(title=settings.app_name)
    application.include_router(health_router, prefix="/api")

    @application.exception_handler(ServiceError)
    async def handle_service_error(
        _request: Request, error: ServiceError
    ) -> JSONResponse:
        if error.status == ApiState.INTERNAL_ERROR:
            logger.error("Service reported an internal error.")
            return _error_response(
                ApiState.INTERNAL_ERROR,
                "An internal error occurred.",
                error.http_status,
            )
        return _error_response(error.status, error.message, error.http_status)

    @application.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, _error: RequestValidationError
    ) -> JSONResponse:
        return _error_response(
            ApiState.INVALID_INPUT,
            "Request input is invalid.",
            422,
        )

    @application.exception_handler(StarletteHTTPException)
    async def handle_http_error(
        _request: Request, error: StarletteHTTPException
    ) -> JSONResponse:
        state = _http_error_state(error.status_code)
        message = (
            "The requested resource was not found."
            if error.status_code == 404
            else "The request could not be completed."
        )
        if error.status_code >= 500:
            logger.error(
                "HTTP error response generated with status %s.", error.status_code
            )
        return _error_response(state, message, error.status_code)

    @application.exception_handler(Exception)
    async def handle_unexpected_error(
        _request: Request, _error: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled application error.")
        return _error_response(
            ApiState.INTERNAL_ERROR,
            "An internal error occurred.",
            500,
        )

    return application


app = create_app()
