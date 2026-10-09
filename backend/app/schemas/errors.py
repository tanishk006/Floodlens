"""Typed API error states and response payloads."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class ApiState(StrEnum):
    INVALID_INPUT = "invalid_input"
    OUTSIDE_COVERAGE = "outside_coverage"
    INSUFFICIENT_DATA = "insufficient_data"
    DATA_UNAVAILABLE = "data_unavailable"
    INTERNAL_ERROR = "internal_error"


class ApiError(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ApiState
    message: str = Field(min_length=1)
