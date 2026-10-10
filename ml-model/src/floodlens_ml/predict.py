"""High-level risk prediction and scenario evaluation entry points."""

from typing import Literal

from floodlens_ml.config import FloodlensConfig, ScenarioConfig
from floodlens_ml.schemas import (
    CandidateZone,
    DataSourceProvenance,
    FeatureInput,
    RiskScoreResult,
    ScenarioInfo,
)
from floodlens_ml.scoring import calculate_risk_score


def scenario_config_to_info(sc: ScenarioConfig) -> ScenarioInfo:
    """Convert a ScenarioConfig to a ScenarioInfo schema object."""
    return ScenarioInfo(
        id=sc.id,
        label=sc.label,
        rainfall_mm_per_hour=sc.mm_per_hr,
        assumption=sc.assumption,
    )


def get_scenario_by_id(
    config: FloodlensConfig, scenario_id: str
) -> ScenarioInfo:
    """Find a configured rainfall scenario by its identifier."""
    for sc in config.scenarios:
        if sc.id == scenario_id:
            return scenario_config_to_info(sc)
    valid_ids = [sc.id for sc in config.scenarios]
    raise ValueError(
        f"Unknown scenario '{scenario_id}'. Valid scenarios are: {valid_ids}"
    )


def predict_risk(
    features: FeatureInput,
    scenario_id: str,
    config: FloodlensConfig,
    zone_id: str | None = None,
    locality: str | None = None,
    coordinates: tuple[float, float] | None = None,
    data_status: Literal["available", "illustrative"] = "available",
    sources: list[DataSourceProvenance] | None = None,
) -> RiskScoreResult:
    """Calculate the relative susceptibility score for a given scenario ID."""
    scenario = get_scenario_by_id(config, scenario_id)
    # Ensure features rainfall matches the scenario rate
    features_with_scenario_rainfall = FeatureInput(
        elevation_m=features.elevation_m,
        local_relief_m=features.local_relief_m,
        slope_deg=features.slope_deg,
        flow_accumulation=features.flow_accumulation,
        rainfall_mm_per_hour=scenario.rainfall_mm_per_hour,
    )
    return calculate_risk_score(
        features=features_with_scenario_rainfall,
        scenario=scenario,
        config=config,
        zone_id=zone_id,
        locality=locality,
        coordinates=coordinates,
        data_status=data_status,
        sources=sources,
    )


def predict_all_scenarios(
    features: FeatureInput,
    config: FloodlensConfig,
    zone_id: str | None = None,
    locality: str | None = None,
    coordinates: tuple[float, float] | None = None,
    data_status: Literal["available", "illustrative"] = "available",
    sources: list[DataSourceProvenance] | None = None,
) -> dict[str, RiskScoreResult]:
    """Calculate scores across all four configured rainfall scenarios."""
    results: dict[str, RiskScoreResult] = {}
    for sc in config.scenarios:
        res = predict_risk(
            features=features,
            scenario_id=sc.id,
            config=config,
            zone_id=zone_id,
            locality=locality,
            coordinates=coordinates,
            data_status=data_status,
            sources=sources,
        )
        results[sc.id] = res
    return results


def evaluate_candidate_zone(
    zone: CandidateZone,
    config: FloodlensConfig,
    scenario_id: str = "moderate",
) -> RiskScoreResult:
    """Evaluate a candidate monitoring zone.

    If zone is in `insufficient_data` status (as candidate zones currently are),
    returns an explicit `insufficient_data` score with transparent factor
    breakdowns, missing inputs, and no fabricated index.
    """
    scenario = get_scenario_by_id(config, scenario_id)
    # If the zone has no verified terrain features, features are None
    empty_features = FeatureInput(
        elevation_m=None,
        local_relief_m=None,
        slope_deg=None,
        flow_accumulation=None,
        rainfall_mm_per_hour=scenario.rainfall_mm_per_hour,
    )
    return calculate_risk_score(
        features=empty_features,
        scenario=scenario,
        config=config,
        zone_id=zone.id,
        locality=zone.name,
        coordinates=zone.coordinates,
        data_status="available",
        sources=zone.sources,
    )
