"""Pydantic schemas for monitoring zones API endpoints."""

from floodlens_ml.schemas import CandidateZone
from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    """Base schema forbidding extra unmodeled fields."""

    model_config = ConfigDict(extra="forbid")


class ZonesResponse(StrictSchema):
    """Response containing catalog of candidate monitoring zones."""

    zones: list[CandidateZone] = Field(
        description="List of candidate monitoring zones with coordinates and status"
    )
    total: int = Field(
        description="Total count of candidate monitoring zones returned"
    )
    disclaimer: str = Field(
        default=(
            "Candidate monitoring zones for experimental evaluation. "
            "Not an official warning or verified flood-risk ranking."
        ),
        description="Operational and scientific boundary disclaimer",
    )
