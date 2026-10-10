"""Service layer for flood susceptibility risk estimation."""

import logging
from pathlib import Path

from floodlens_ml.config import FloodlensConfig, load_config
from floodlens_ml.predict import evaluate_candidate_zone, get_scenario_by_id
from floodlens_ml.schemas import (
    FeatureInput,
    RiskScoreResult,
    ScenarioInfo,
)
from floodlens_ml.scoring import calculate_risk_score

from app.core.config import Settings
from app.schemas.errors import ApiState
from app.schemas.risk import RiskEstimateRequest
from app.services.errors import ServiceError
from app.services.zones import find_candidate_zone_by_id

logger = logging.getLogger(__name__)


def load_model_configuration(config_path: Path) -> FloodlensConfig:
    """Load and validate the model pipeline configuration."""
    try:
        return load_config(config_path)
    except (OSError, ValueError) as err:
        logger.error(
            "Failed to load model configuration from %s: %s", config_path, err
        )
        raise ServiceError(
            status=ApiState.DATA_UNAVAILABLE,
            message="Model configuration or data service is unavailable.",
            http_status=503,
        ) from err


def estimate_risk_for_zone(
    request: RiskEstimateRequest, settings: Settings
) -> RiskScoreResult:
    """Estimate flood risk for a candidate zone under a given rainfall scenario."""
    config_path = settings.resolve_model_config_path()
    config = load_model_configuration(config_path)

    zone = find_candidate_zone_by_id(request.zone_id)
    if zone is None:
        raise ServiceError(
            status=ApiState.OUTSIDE_COVERAGE,
            message=(
                f"Zone '{request.zone_id}' is outside covered monitoring zones."
            ),
            http_status=422,
        )

    supported_scenarios = [sc.id for sc in config.scenarios]
    if request.scenario_id not in supported_scenarios:
        raise ServiceError(
            status=ApiState.INVALID_INPUT,
            message=(
                f"Scenario '{request.scenario_id}' is not supported. "
                f"Supported scenarios: {supported_scenarios}."
            ),
            http_status=422,
        )

    base_scenario = get_scenario_by_id(config, request.scenario_id)

    # Use custom rainfall rate if explicitly provided
    if request.rainfall_mm_per_hour is not None:
        scenario = ScenarioInfo(
            id=base_scenario.id,
            label=base_scenario.label,
            rainfall_mm_per_hour=request.rainfall_mm_per_hour,
            assumption=base_scenario.assumption,
        )
        empty_features = FeatureInput(
            elevation_m=None,
            local_relief_m=None,
            slope_deg=None,
            flow_accumulation=None,
            rainfall_mm_per_hour=request.rainfall_mm_per_hour,
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

    return evaluate_candidate_zone(
        zone, config, scenario_id=request.scenario_id
    )
