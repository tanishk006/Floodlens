"""Pydantic schemas for risk estimation API requests."""

from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    """Base schema forbidding extra unmodeled fields."""

    model_config = ConfigDict(extra="forbid")


class RiskEstimateRequest(StrictSchema):
    """Request payload for flood susceptibility estimation."""

    zone_id: str = Field(
        min_length=1,
        description="Stable identifier of the candidate monitoring zone",
    )
    scenario_id: str = Field(
        default="moderate",
        min_length=1,
        description=(
            "Exploratory rainfall scenario identifier: "
            "light, moderate, heavy, extreme"
        ),
    )
    rainfall_mm_per_hour: float | None = Field(
        default=None,
        ge=0,
        description=(
            "Optional custom rainfall intensity override in mm/hour. "
            "If omitted, the configured scenario rate is used."
        ),
    )
