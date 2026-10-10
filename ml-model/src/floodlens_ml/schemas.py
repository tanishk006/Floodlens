"""Data schemas and export contracts for FloodLens ML risk scoring.

Defines machine-readable data structures for candidate monitoring zones,
rainfall scenarios, factor explanations, risk estimates, and export bundles.
Strictly adheres to:
- Longitude/latitude coordinate ordering for GeoJSON and MapLibre.
- Explicit non-probability declarations (is_probability = False).
- Typed data quality and missing-input states.
"""

from datetime import datetime, timezone
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictSchema(BaseModel):
    """Base schema forbidding extra unmodeled fields."""

    model_config = ConfigDict(extra="forbid")


# Type aliases for state and category enumerations
DataQualityStatus = Literal["available", "illustrative", "insufficient_data"]
ZoneDataStatus = Literal["verified", "illustrative", "insufficient_data"]
RiskCategory = Literal["low", "moderate", "high", "severe", "insufficient_data"]
BaselineFactorName = Literal[
    "low_elevation",
    "local_relief",
    "slope",
    "flow_accumulation",
    "rainfall",
]


class DataSourceProvenance(StrictSchema):
    """Metadata documenting dataset origin, licence, and applicability."""

    name: str = Field(min_length=1, description="Name of the dataset or feed")
    url: str | None = Field(default=None, description="Source URL or catalog entry")
    accessed_at: str | None = Field(
        default=None, description="ISO date when data was retrieved or verified"
    )
    licence: str = Field(min_length=1, description="Dataset license or terms of use")
    role: str = Field(
        min_length=1,
        description="Role in pipeline: elevation, rainfall, boundaries, test_fixture",
    )
    spatial_resolution: str | None = Field(
        default=None, description="Spatial resolution if geospatial raster or grid"
    )
    temporal_coverage: str | None = Field(
        default=None, description="Temporal validity or publication date"
    )
    notes: str | None = Field(
        default=None, description="Scientific or operational caveats"
    )


class CandidateZone(StrictSchema):
    """A monitoring zone record representing a candidate region."""

    id: str = Field(min_length=1, description="Stable zone identifier, e.g. zone-up")
    name: str = Field(min_length=1, description="Human-readable zone name")
    state: str = Field(min_length=1, description="Indian state name")
    coordinates: tuple[float, float] = Field(
        description="Representative coordinate as [longitude, latitude] in EPSG:4326"
    )
    aoi_bbox: tuple[float, float, float, float] | None = Field(
        default=None,
        description="Bounding box [west, south, east, north] in EPSG:4326 if set",
    )
    data_status: ZoneDataStatus = Field(
        description="Status: verified, illustrative, or insufficient_data"
    )
    sources: list[DataSourceProvenance] = Field(
        default_factory=list, description="Documented sources supporting this zone"
    )
    notes: str | None = Field(
        default=None,
        description="Documentation of assumptions or missing prerequisites",
    )

    @model_validator(mode="after")
    def validate_coordinates(self) -> "CandidateZone":
        lon, lat = self.coordinates
        if not (-180 <= lon <= 180):
            raise ValueError(f"Longitude must be within [-180, 180], got {lon}")
        if not (-90 <= lat <= 90):
            raise ValueError(f"Latitude must be within [-90, 90], got {lat}")
        if self.aoi_bbox is not None:
            west, south, east, north = self.aoi_bbox
            if not (-180 <= west < east <= 180):
                raise ValueError(
                    "bbox longitude must satisfy -180 <= west < east <= 180"
                )
            if not (-90 <= south < north <= 90):
                raise ValueError(
                    "bbox latitude must satisfy -90 <= south < north <= 90"
                )
        return self


class ScenarioInfo(StrictSchema):
    """Specification of an exploratory rainfall scenario."""

    id: str = Field(min_length=1, description="Scenario identifier, e.g. moderate")
    label: str = Field(min_length=1, description="Human-readable scenario label")
    rainfall_mm_per_hour: float = Field(
        ge=0, description="Rainfall intensity expressed strictly in mm/hour"
    )
    assumption: str = Field(
        min_length=1,
        description="Explicit notice that scenario is exploratory and unforecasted",
    )


class FeatureInput(StrictSchema):
    """Input features required for deterministic flood susceptibility scoring."""

    elevation_m: float | None = Field(
        default=None,
        description="Terrain elevation in meters above sea level",
    )
    local_relief_m: float | None = Field(
        default=None,
        ge=0,
        description="Local terrain relief in meters within neighborhood radius",
    )
    slope_deg: float | None = Field(
        default=None,
        ge=0,
        le=90,
        description="Surface terrain slope in degrees (0 to 90)",
    )
    flow_accumulation: float | None = Field(
        default=None,
        ge=0,
        description="Upslope contributing area / flow accumulation cell count",
    )
    rainfall_mm_per_hour: float = Field(
        ge=0,
        description="Rainfall intensity in mm/hour",
    )

    def missing_features(self) -> list[str]:
        """Return list of required features that are absent."""
        missing = []
        if self.elevation_m is None:
            missing.append("elevation_m")
        if self.local_relief_m is None:
            missing.append("local_relief_m")
        if self.slope_deg is None:
            missing.append("slope_deg")
        if self.flow_accumulation is None:
            missing.append("flow_accumulation")
        return missing

    def has_all_features(self) -> bool:
        """Check if all five baseline indicators are available."""
        return len(self.missing_features()) == 0


class FactorContribution(StrictSchema):
    """Explainability breakdown for an individual scoring factor."""

    factor_name: BaselineFactorName
    raw_value: float | None = Field(
        default=None, description="Original unnormalized input value"
    )
    normalized_value: Annotated[float, Field(ge=0.0, le=1.0)] | None = Field(
        default=None,
        description="Normalized relative susceptibility contribution in [0.0, 1.0]",
    )
    weight: Annotated[float, Field(ge=0.0, le=1.0)] = Field(
        description="Configured weight in overall score calculation"
    )
    weighted_score: float | None = Field(
        default=None,
        description="Contribution to 0-100 index (normalized_value * weight * 100)",
    )
    available: bool = Field(
        description="Whether this factor was available from verified inputs"
    )
    interpretation: str = Field(
        min_length=1,
        description="Explanation of how factor contributes to susceptibility",
    )


class DataQualityReport(StrictSchema):
    """Diagnostics on data availability, missing inputs, and operational warnings."""

    status: DataQualityStatus
    missing_inputs: list[str] = Field(
        default_factory=list,
        description="List of prerequisites or features not available",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Caveats regarding input precision or proxy assumptions",
    )


class RiskScoreResult(StrictSchema):
    """Canonical machine-readable output contract for flood susceptibility scoring.

    Consumed by FastAPI backend and React/MapLibre frontend.
    """

    zone_id: str | None = Field(
        default=None, description="Identifier of the evaluated monitoring zone"
    )
    locality: str | None = Field(
        default=None, description="Name of locality or area of interest"
    )
    coordinates: tuple[float, float] | None = Field(
        default=None,
        description="Location coordinates as [longitude, latitude] in EPSG:4326",
    )
    scenario: ScenarioInfo
    risk_index: Annotated[float, Field(ge=0.0, le=100.0)] | None = Field(
        default=None,
        description="Relative susceptibility index (0-100). None if insufficient data.",
    )
    risk_category: RiskCategory = Field(
        description="Category: low, moderate, high, severe, or insufficient_data"
    )
    is_probability: Literal[False] = Field(
        default=False,
        description="Explicit flag: index is NOT a flood probability or forecast",
    )
    factors: list[FactorContribution] = Field(
        default_factory=list,
        description="Factor-by-factor breakdown explaining the calculated score",
    )
    data_quality: DataQualityReport
    model_version: str = Field(
        min_length=1, description="Semantic version of scoring pipeline"
    )
    generated_at: str = Field(
        description="ISO 8601 UTC timestamp when result was computed"
    )
    limitations: list[str] = Field(
        min_length=1,
        description="Documented operational boundaries and safety warnings",
    )
    data_provenance: list[DataSourceProvenance] = Field(
        default_factory=list,
        description="Documented sources supporting the evaluation",
    )

    @model_validator(mode="after")
    def validate_consistency(self) -> "RiskScoreResult":
        # Ensure that if data is insufficient, risk_index is None
        if self.data_quality.status == "insufficient_data":
            if self.risk_index is not None:
                raise ValueError(
                    "risk_index must be None when data status is insufficient_data"
                )
            if self.risk_category != "insufficient_data":
                raise ValueError(
                    "risk_category must be 'insufficient_data' for insufficient data"
                )
        elif self.risk_index is None:
            raise ValueError(
                "risk_index must be provided when data status is not insufficient_data"
            )
        return self


class ZoneExportBundle(StrictSchema):
    """Complete bundle exported by ML pipeline for frontend/API consumption."""

    export_version: str = Field(min_length=1)
    generated_at: str
    disclaimer: str = Field(
        default="Experimental estimate. Not an official warning.",
        min_length=1,
    )
    candidate_zones: list[CandidateZone]
    scenarios: list[ScenarioInfo]
    zone_risk_summaries: dict[str, dict[str, RiskScoreResult]] = Field(
        description="zone_id -> scenario_id -> RiskScoreResult mapping"
    )
    limitations: list[str]
    contract_documentation: dict[str, Any] = Field(
        default_factory=dict,
        description="Machine-readable specification for backend and frontend consumers",
    )


def current_utc_iso() -> str:
    """Helper returning current timestamp in UTC ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat()
