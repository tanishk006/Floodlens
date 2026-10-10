"""Deterministic baseline flood-susceptibility scoring engine.

Computes a transparent 0-100 relative susceptibility index from validated
environmental indicators and exploratory rainfall scenarios.
Does NOT output probabilities, forecasts, or unvalidated predictions.
"""

from datetime import datetime, timezone
from typing import Literal

from floodlens_ml.config import FloodlensConfig
from floodlens_ml.schemas import (
    DataQualityReport,
    DataSourceProvenance,
    FactorContribution,
    FeatureInput,
    RiskCategory,
    RiskScoreResult,
    ScenarioInfo,
)

STANDARD_LIMITATIONS: list[str] = [
    "Experimental estimate. Not an official warning or emergency instruction.",
    (
        "The 0–100 score is a relative susceptibility index and does NOT "
        "represent a flood probability, water depth, or safety guarantee."
    ),
    (
        "Factor weights and normalization bounds are exploratory configuration "
        "assumptions, not scientifically calibrated or validated parameters."
    ),
    (
        "Terrain indicators do not account for municipal stormwater drainage, "
        "pump capacity, soil infiltration, or tidal/riverine flood barriers."
    ),
    (
        "Rainfall values represent user-selected scenario rates (mm/hr), "
        "not real-time observations or meteorological forecasts."
    ),
]


def normalize_low_elevation(
    elevation_m: float, bounds: tuple[float, float]
) -> float:
    """Normalize elevation to relative susceptibility in [0.0, 1.0].

    Lower elevations (closer to minimum baseline) are more susceptible.
    """
    min_b, max_b = bounds
    if elevation_m <= min_b:
        return 1.0
    if elevation_m >= max_b:
        return 0.0
    return (max_b - elevation_m) / (max_b - min_b)


def normalize_local_relief(
    relief_m: float, bounds: tuple[float, float]
) -> float:
    """Normalize local relief to relative susceptibility in [0.0, 1.0].

    Assumes lower local relief indicates flatter topography or depressions
    with higher ponding susceptibility.
    """
    min_b, max_b = bounds
    if relief_m <= min_b:
        return 1.0
    if relief_m >= max_b:
        return 0.0
    return (max_b - relief_m) / (max_b - min_b)


def normalize_slope(slope_deg: float, bounds: tuple[float, float]) -> float:
    """Normalize slope to relative susceptibility in [0.0, 1.0].

    Flatter slopes (closer to 0 degrees) reduce runoff velocity, increasing ponding.
    """
    min_b, max_b = bounds
    if slope_deg <= min_b:
        return 1.0
    if slope_deg >= max_b:
        return 0.0
    return (max_b - slope_deg) / (max_b - min_b)


def normalize_flow_accumulation(
    accumulation: float, bounds: tuple[float, float]
) -> float:
    """Normalize flow accumulation to relative susceptibility in [0.0, 1.0].

    Higher accumulation concentrates greater upstream runoff.
    """
    min_b, max_b = bounds
    if accumulation <= min_b:
        return 0.0
    if accumulation >= max_b:
        return 1.0
    return (accumulation - min_b) / (max_b - min_b)


def normalize_rainfall(rainfall_mm_hr: float, bounds: tuple[float, float]) -> float:
    """Normalize rainfall intensity to relative susceptibility in [0.0, 1.0].

    Higher rainfall rate increases surface water accumulation.
    """
    min_b, max_b = bounds
    if rainfall_mm_hr <= min_b:
        return 0.0
    if rainfall_mm_hr >= max_b:
        return 1.0
    return (rainfall_mm_hr - min_b) / (max_b - min_b)


def categorize_score(
    score: float,
    low_max: float,
    moderate_max: float,
    high_max: float,
) -> RiskCategory:
    """Assign score category based on configured thresholds."""
    if score <= low_max:
        return "low"
    if score <= moderate_max:
        return "moderate"
    if score <= high_max:
        return "high"
    return "severe"


def calculate_risk_score(
    features: FeatureInput,
    scenario: ScenarioInfo,
    config: FloodlensConfig,
    zone_id: str | None = None,
    locality: str | None = None,
    coordinates: tuple[float, float] | None = None,
    data_status: Literal["available", "illustrative"] = "available",
    sources: list[DataSourceProvenance] | None = None,
) -> RiskScoreResult:
    """Calculate the deterministic relative flood-susceptibility score.

    If any required feature is missing, returns an explicit `insufficient_data`
    result with detailed missing input diagnostics and no fabricated score.
    """
    weights = config.scoring.weights
    norm_bounds = config.scoring.normalization
    thresholds = config.thresholds
    now_iso = datetime.now(timezone.utc).isoformat()
    sources_list = sources or []

    missing = features.missing_features()
    if missing:
        # Construct transparent factor explanation with missing factors identified
        factors: list[FactorContribution] = [
            FactorContribution(
                factor_name="low_elevation",
                raw_value=features.elevation_m,
                normalized_value=None,
                weight=weights["low_elevation"],
                weighted_score=None,
                available=features.elevation_m is not None,
                interpretation=(
                    "Elevation data absent. Cannot compute elevation contribution."
                    if features.elevation_m is None
                    else "Raw elevation available."
                ),
            ),
            FactorContribution(
                factor_name="local_relief",
                raw_value=features.local_relief_m,
                normalized_value=None,
                weight=weights["local_relief"],
                weighted_score=None,
                available=features.local_relief_m is not None,
                interpretation=(
                    "Local relief absent. Neighborhood terrain data required."
                    if features.local_relief_m is None
                    else "Local relief available."
                ),
            ),
            FactorContribution(
                factor_name="slope",
                raw_value=features.slope_deg,
                normalized_value=None,
                weight=weights["slope"],
                weighted_score=None,
                available=features.slope_deg is not None,
                interpretation=(
                    "Slope absent. Terrain gradient calculation required."
                    if features.slope_deg is None
                    else "Slope available."
                ),
            ),
            FactorContribution(
                factor_name="flow_accumulation",
                raw_value=features.flow_accumulation,
                normalized_value=None,
                weight=weights["flow_accumulation"],
                weighted_score=None,
                available=features.flow_accumulation is not None,
                interpretation=(
                    "Flow accumulation absent. Hydrological catchment data required."
                    if features.flow_accumulation is None
                    else "Flow accumulation available."
                ),
            ),
            FactorContribution(
                factor_name="rainfall",
                raw_value=scenario.rainfall_mm_per_hour,
                normalized_value=round(
                    normalize_rainfall(
                        scenario.rainfall_mm_per_hour, norm_bounds["rainfall"]
                    ),
                    4,
                ),
                weight=weights["rainfall"],
                weighted_score=None,
                available=True,
                interpretation=(
                    f"Exploratory rainfall rate: {scenario.rainfall_mm_per_hour} mm/hr."
                ),
            ),
        ]

        return RiskScoreResult(
            zone_id=zone_id,
            locality=locality,
            coordinates=coordinates,
            scenario=scenario,
            risk_index=None,
            risk_category="insufficient_data",
            is_probability=False,
            factors=factors,
            data_quality=DataQualityReport(
                status="insufficient_data",
                missing_inputs=[
                    f"Missing feature: {feat}" for feat in missing
                ],
                warnings=[
                    "Score cannot be calculated because required terrain "
                    "features are not available."
                ],
            ),
            model_version="0.1.0-baseline",
            generated_at=now_iso,
            limitations=STANDARD_LIMITATIONS,
            data_provenance=sources_list,
        )

    # All features are present - compute deterministic normalized factors
    assert features.elevation_m is not None
    assert features.local_relief_m is not None
    assert features.slope_deg is not None
    assert features.flow_accumulation is not None

    norm_elev = normalize_low_elevation(
        features.elevation_m, norm_bounds["low_elevation"]
    )
    norm_relief = normalize_local_relief(
        features.local_relief_m, norm_bounds["local_relief"]
    )
    norm_slope = normalize_slope(features.slope_deg, norm_bounds["slope"])
    norm_flow = normalize_flow_accumulation(
        features.flow_accumulation, norm_bounds["flow_accumulation"]
    )
    norm_rain = normalize_rainfall(
        scenario.rainfall_mm_per_hour, norm_bounds["rainfall"]
    )

    factors_data = [
        (
            "low_elevation",
            features.elevation_m,
            norm_elev,
            weights["low_elevation"],
            (
                f"Elevation {features.elevation_m:.1f}m: normalized susceptibility "
                f"{norm_elev:.2f} based on [{norm_bounds['low_elevation'][0]}, "
                f"{norm_bounds['low_elevation'][1]}]m baseline."
            ),
        ),
        (
            "local_relief",
            features.local_relief_m,
            norm_relief,
            weights["local_relief"],
            (
                f"Local relief {features.local_relief_m:.1f}m: normalized "
                f"susceptibility {norm_relief:.2f}."
            ),
        ),
        (
            "slope",
            features.slope_deg,
            norm_slope,
            weights["slope"],
            (
                f"Slope {features.slope_deg:.1f}°: normalized "
                f"susceptibility {norm_slope:.2f}."
            ),
        ),
        (
            "flow_accumulation",
            features.flow_accumulation,
            norm_flow,
            weights["flow_accumulation"],
            (
                f"Flow accumulation {features.flow_accumulation:.0f} cells: "
                f"normalized susceptibility {norm_flow:.2f}."
            ),
        ),
        (
            "rainfall",
            scenario.rainfall_mm_per_hour,
            norm_rain,
            weights["rainfall"],
            (
                f"Scenario rainfall {scenario.rainfall_mm_per_hour:.1f} mm/hr: "
                f"normalized susceptibility {norm_rain:.2f}."
            ),
        ),
    ]

    total_weighted_sum = 0.0
    factor_contributions: list[FactorContribution] = []

    for name, raw_v, norm_v, weight, interp in factors_data:
        weighted_val = norm_v * weight * 100.0
        total_weighted_sum += weighted_val
        factor_contributions.append(
            FactorContribution(
                factor_name=name,  # type: ignore[arg-type]
                raw_value=round(raw_v, 2),
                normalized_value=round(norm_v, 4),
                weight=weight,
                weighted_score=round(weighted_val, 2),
                available=True,
                interpretation=interp,
            )
        )

    # Clamped 0-100 deterministic relative index
    final_score = max(0.0, min(100.0, round(total_weighted_sum, 2)))
    category = categorize_score(
        final_score,
        thresholds.low_max,
        thresholds.moderate_max,
        thresholds.high_max,
    )

    warnings: list[str] = []
    if data_status == "illustrative":
        warnings.append(
            "This score was computed from illustrative test fixtures, not "
            "calibrated field observations."
        )

    return RiskScoreResult(
        zone_id=zone_id,
        locality=locality,
        coordinates=coordinates,
        scenario=scenario,
        risk_index=final_score,
        risk_category=category,
        is_probability=False,
        factors=factor_contributions,
        data_quality=DataQualityReport(
            status=data_status,
            missing_inputs=[],
            warnings=warnings,
        ),
        model_version="0.1.0-baseline",
        generated_at=now_iso,
        limitations=STANDARD_LIMITATIONS,
        data_provenance=sources_list,
    )
