"""Input loading, prerequisite verification, and zone catalog management."""

from pathlib import Path
from typing import Any

from floodlens_ml.config import FloodlensConfig
from floodlens_ml.schemas import (
    CandidateZone,
    DataSourceProvenance,
    FeatureInput,
    StrictSchema,
)


class InputValidationReport(StrictSchema):
    """Report detailing available and missing inputs and prerequisites."""

    locality_configured: bool
    bbox_configured: bool
    metric_crs_configured: bool
    dem_present: bool
    labels_present: bool
    roads_present: bool
    missing_prerequisites: list[str]
    ready_for_terrain_processing: bool
    ready_for_training: bool


def validate_pipeline_prerequisites(
    config: FloodlensConfig, base_dir: Path | None = None
) -> InputValidationReport:
    """Check configuration and physical file existence against requirements."""
    root = base_dir or Path.cwd()

    setup_gaps = config.setup_gaps()
    locality_ok = "area_of_interest.locality" not in setup_gaps
    bbox_ok = "area_of_interest.bbox" not in setup_gaps
    crs_ok = "area_of_interest.metric_crs" not in setup_gaps

    dem_path = root / config.paths.dem
    labels_path = root / config.paths.labels
    roads_path = root / config.paths.roads

    dem_exists = dem_path.is_file()
    labels_exists = labels_path.is_file()
    roads_exists = roads_path.is_file()

    missing: list[str] = []
    if not locality_ok:
        missing.append("area_of_interest.locality (placeholder locality)")
    if not bbox_ok:
        missing.append("area_of_interest.bbox (bounding box is unset)")
    if not crs_ok:
        missing.append("area_of_interest.metric_crs (projected CRS is unset)")
    if not dem_exists:
        missing.append(f"paths.dem ({config.paths.dem} not found)")
    if not labels_exists:
        missing.append(f"paths.labels ({config.paths.labels} not found)")
    if not roads_exists:
        missing.append(f"paths.roads ({config.paths.roads} not found)")

    terrain_ready = locality_ok and bbox_ok and crs_ok and dem_exists
    training_ready = (
        terrain_ready
        and labels_exists
        and config.training.allow_baseline_fallback is False
    )

    return InputValidationReport(
        locality_configured=locality_ok,
        bbox_configured=bbox_ok,
        metric_crs_configured=crs_ok,
        dem_present=dem_exists,
        labels_present=labels_exists,
        roads_present=roads_exists,
        missing_prerequisites=missing,
        ready_for_terrain_processing=terrain_ready,
        ready_for_training=training_ready,
    )


def get_candidate_monitoring_zones() -> list[CandidateZone]:
    """Return catalog of ten candidate Indian monitoring zones.

    Scientific disclaimer:
    The ten states correspond to candidate monitoring zones identified for the
    prototype. The supplied historical million-hectare figures have not been
    verified against an authoritative source and are NOT used as risk scores
    or training labels. Data status is strictly set to `insufficient_data`
    until real, documented DEMs and ground observations are connected.
    Coordinates are formatted as [longitude, latitude].
    """
    candidates = [
        (
            "zone-uttar-pradesh",
            "Uttar Pradesh Monitoring Zone",
            "Uttar Pradesh",
            (80.9462, 26.8467),
        ),
        (
            "zone-bihar",
            "Bihar Monitoring Zone",
            "Bihar",
            (85.1376, 25.5941),
        ),
        (
            "zone-punjab",
            "Punjab Monitoring Zone",
            "Punjab",
            (75.3412, 31.1471),
        ),
        (
            "zone-rajasthan",
            "Rajasthan Monitoring Zone",
            "Rajasthan",
            (75.7873, 26.9124),
        ),
        (
            "zone-assam",
            "Assam Monitoring Zone",
            "Assam",
            (91.7539, 26.1445),
        ),
        (
            "zone-west-bengal",
            "West Bengal Monitoring Zone",
            "West Bengal",
            (88.3639, 22.5726),
        ),
        (
            "zone-haryana",
            "Haryana Monitoring Zone",
            "Haryana",
            (76.0856, 29.0588),
        ),
        (
            "zone-odisha",
            "Odisha Monitoring Zone",
            "Odisha",
            (85.8245, 20.2961),
        ),
        (
            "zone-andhra-pradesh",
            "Andhra Pradesh Monitoring Zone",
            "Andhra Pradesh",
            (80.6480, 16.5062),
        ),
        (
            "zone-gujarat",
            "Gujarat Monitoring Zone",
            "Gujarat",
            (72.5714, 23.0225),
        ),
    ]

    zones: list[CandidateZone] = []
    for zone_id, name, state, coords in candidates:
        zones.append(
            CandidateZone(
                id=zone_id,
                name=name,
                state=state,
                coordinates=coords,
                aoi_bbox=None,
                data_status="insufficient_data",
                sources=[],
                notes=(
                    "Candidate monitoring zone. The supplied million-hectare "
                    "figure is unverified and not treated as a flood score. "
                    "Local DEM and ground observations are currently absent."
                ),
            )
        )
    return zones


def create_synthetic_test_features(preset: str = "moderate_urban") -> FeatureInput:
    """Generate clearly identified synthetic test fixtures for tests.

    CRITICAL: Synthetic fixtures are exclusively for test coverage and pipeline
    validation. They must never be described as real observations or Indian field data.
    """
    if preset == "lowland_depression":
        return FeatureInput(
            elevation_m=5.0,
            local_relief_m=0.5,
            slope_deg=1.0,
            flow_accumulation=850.0,
            rainfall_mm_per_hour=65.0,
        )
    if preset == "elevated_ridge":
        return FeatureInput(
            elevation_m=120.0,
            local_relief_m=12.0,
            slope_deg=25.0,
            flow_accumulation=20.0,
            rainfall_mm_per_hour=7.5,
        )
    # Default: moderate urban
    return FeatureInput(
        elevation_m=45.0,
        local_relief_m=4.0,
        slope_deg=3.5,
        flow_accumulation=320.0,
        rainfall_mm_per_hour=35.0,
    )


def get_synthetic_provenance() -> DataSourceProvenance:
    """Return provenance metadata for synthetic test fixtures."""
    return DataSourceProvenance(
        name="Synthetic Pipeline Test Fixture",
        url=None,
        accessed_at="2026-10-11",
        licence="Internal Test Use Only",
        role="test_fixture",
        spatial_resolution="Synthetic 10m fixture",
        temporal_coverage="Hypothetical 2026 scenario",
        notes="Synthetic test data. Not observed real-world measurements.",
    )


def parse_feature_input(raw: dict[str, Any]) -> FeatureInput:
    """Parse and validate raw feature inputs from API or CLI."""
    return FeatureInput.model_validate(raw)
