import pytest

from app.schemas.errors import ApiState
from app.services.errors import ServiceError, state_http_status


@pytest.mark.parametrize(
    ("state", "status_code"),
    [
        (ApiState.INVALID_INPUT, 422),
        (ApiState.OUTSIDE_COVERAGE, 422),
        (ApiState.INSUFFICIENT_DATA, 422),
        (ApiState.DATA_UNAVAILABLE, 503),
        (ApiState.INTERNAL_ERROR, 500),
    ],
)
def test_service_error_state_http_mapping(state: ApiState, status_code: int) -> None:
    assert state_http_status(state) == status_code
    error = ServiceError(state, "Explicit service error.", status_code)
    assert error.status == state
    assert error.http_status == status_code
