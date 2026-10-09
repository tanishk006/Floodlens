"""Service-layer errors mapped to stable API error states."""

from dataclasses import dataclass

from app.schemas.errors import ApiState


@dataclass
class ServiceError(Exception):
    status: ApiState
    message: str
    http_status: int


def state_http_status(state: ApiState) -> int:
    """Return the default HTTP status for a known service state."""
    return {
        ApiState.INVALID_INPUT: 422,
        ApiState.OUTSIDE_COVERAGE: 422,
        ApiState.INSUFFICIENT_DATA: 422,
        ApiState.DATA_UNAVAILABLE: 503,
        ApiState.INTERNAL_ERROR: 500,
    }[state]
