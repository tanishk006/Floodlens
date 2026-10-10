"""Tests for deterministic baseline flood-susceptibility scoring engine."""

from pathlib import Path

import pytest
import yaml
from pydantic import ValidationError

from floodlens_ml.config import FloodlensConfig
from floodlens_ml.schemas import (
    FeatureInput,
    ScenarioInfo,
)
from floodlens_ml.scoring import (
    calculate_risk_score,
    categorize_score,
    normalize_flow_accumulation,
    normalize_local_relief,
    normalize_low_elevation,
    normalize_rainfall,
    normalize_slope,
)

CONFIG_PATH = Path(__file__).resolve().parents[1] / "config.yaml"


@pytest.fixture
def test_config() -> FloodlensConfig:
    data = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    return FloodlensConfig.model_validate(data)


@pytest.fixture
def moderate_scenario() -> ScenarioInfo:
    return ScenarioInfo(
        id="moderate",
        label="Moderate rainfall",
        rainfall_mm_per_hour=35.0,
        assumption="ASSUMPTION: fixed exploratory rainfall rate.",
    )


def test_normalization_functions_bound_outputs() -> None:
    # Low elevation: lower elevation -> higher score (0m -> 1.0, 100m -> 0.0)
    assert normalize_low_elevation(0.0, (0.0, 100.0)) == 1.0
    assert normalize_low_elevation(100.0, (0.0, 100.0)) == 0.0
    assert normalize_low_elevation(50.0, (0.0, 100.0)) == 0.5
    # Beyond bounds should clip
    assert normalize_low_elevation(-10.0, (0.0, 100.0)) == 1.0
    assert normalize_low_elevation(150.0, (0.0, 100.0)) == 0.0

    # Slope: lower slope -> higher score (0 deg -> 1.0, 30 deg -> 0.0)
    assert normalize_slope(0.0, (0.0, 30.0)) == 1.0
    assert normalize_slope(30.0, (0.0, 30.0)) == 0.0
    assert normalize_slope(15.0, (0.0, 30.0)) == 0.5
    assert normalize_slope(-5.0, (0.0, 30.0)) == 1.0
    assert normalize_slope(45.0, (0.0, 30.0)) == 0.0

    # Flow accumulation: higher accumulation -> higher score
    assert normalize_flow_accumulation(0.0, (0.0, 1000.0)) == 0.0
    assert normalize_flow_accumulation(1000.0, (0.0, 1000.0)) == 1.0
    assert normalize_flow_accumulation(500.0, (0.0, 1000.0)) == 0.5
    assert normalize_flow_accumulation(2000.0, (0.0, 1000.0)) == 1.0

    # Local relief: lower relief -> higher score
    assert normalize_local_relief(0.0, (0.0, 10.0)) == 1.0
    assert normalize_local_relief(10.0, (0.0, 10.0)) == 0.0
    assert normalize_local_relief(5.0, (0.0, 10.0)) == 0.5

    # Rainfall: higher rate -> higher score
    assert normalize_rainfall(0.0, (0.0, 115.0)) == 0.0
    assert normalize_rainfall(115.0, (0.0, 115.0)) == 1.0
    assert normalize_rainfall(230.0, (0.0, 115.0)) == 1.0


def test_categorize_score_boundaries() -> None:
    assert categorize_score(10.0, 25.0, 50.0, 75.0) == "low"
    assert categorize_score(25.0, 25.0, 50.0, 75.0) == "low"
    assert categorize_score(25.1, 25.0, 50.0, 75.0) == "moderate"
    assert categorize_score(50.0, 25.0, 50.0, 75.0) == "moderate"
    assert categorize_score(50.1, 25.0, 50.0, 75.0) == "high"
    assert categorize_score(75.0, 25.0, 50.0, 75.0) == "high"
    assert categorize_score(75.1, 25.0, 50.0, 75.0) == "severe"
    assert categorize_score(100.0, 25.0, 50.0, 75.0) == "severe"


def test_scoring_deterministic_output(
    test_config: FloodlensConfig, moderate_scenario: ScenarioInfo
) -> None:
    features = FeatureInput(
        elevation_m=20.0,
        local_relief_m=2.0,
        slope_deg=2.0,
        flow_accumulation=400.0,
        rainfall_mm_per_hour=moderate_scenario.rainfall_mm_per_hour,
    )

    res1 = calculate_risk_score(features, moderate_scenario, test_config)
    res2 = calculate_risk_score(features, moderate_scenario, test_config)

    assert res1.risk_index is not None
    assert res2.risk_index is not None
    assert res1.risk_index == res2.risk_index
    assert res1.risk_category == res2.risk_category
    assert res1.is_probability is False
    assert len(res1.factors) == 5

    for f1, f2 in zip(res1.factors, res2.factors, strict=True):
        assert f1.factor_name == f2.factor_name
        assert f1.normalized_value == f2.normalized_value
        assert f1.weighted_score == f2.weighted_score


def test_scoring_bounds_extreme_high_and_low(
    test_config: FloodlensConfig, moderate_scenario: ScenarioInfo
) -> None:
    # Max susceptibility conditions: min elevation, 0 relief, 0 slope, max flow/rain
    max_features = FeatureInput(
        elevation_m=0.0,
        local_relief_m=0.0,
        slope_deg=0.0,
        flow_accumulation=1000.0,
        rainfall_mm_per_hour=115.0,
    )
    max_scenario = ScenarioInfo(
        id="extreme",
        label="Extreme",
        rainfall_mm_per_hour=115.0,
        assumption="ASSUMPTION",
    )
    res_max = calculate_risk_score(max_features, max_scenario, test_config)
    assert res_max.risk_index == 100.0
    assert res_max.risk_category == "severe"

    # Min susceptibility conditions: max elevation, max relief, max slope, 0 flow/rain
    min_features = FeatureInput(
        elevation_m=100.0,
        local_relief_m=10.0,
        slope_deg=30.0,
        flow_accumulation=0.0,
        rainfall_mm_per_hour=0.0,
    )
    min_scenario = ScenarioInfo(
        id="zero",
        label="Zero",
        rainfall_mm_per_hour=0.0,
        assumption="ASSUMPTION",
    )
    res_min = calculate_risk_score(min_features, min_scenario, test_config)
    assert res_min.risk_index == 0.0
    assert res_min.risk_category == "low"


def test_missing_features_yields_insufficient_data(
    test_config: FloodlensConfig, moderate_scenario: ScenarioInfo
) -> None:
    # Missing elevation and local relief
    partial_features = FeatureInput(
        elevation_m=None,
        local_relief_m=None,
        slope_deg=5.0,
        flow_accumulation=100.0,
        rainfall_mm_per_hour=35.0,
    )

    result = calculate_risk_score(partial_features, moderate_scenario, test_config)

    assert result.risk_index is None
    assert result.risk_category == "insufficient_data"
    assert result.data_quality.status == "insufficient_data"
    assert "Missing feature: elevation_m" in result.data_quality.missing_inputs
    assert "Missing feature: local_relief_m" in result.data_quality.missing_inputs
    assert result.is_probability is False


def test_scenario_sensitivity_monotonicity(
    test_config: FloodlensConfig,
) -> None:
    """Verifies that increasing scenario rainfall monotonically increases score."""
    features_base = FeatureInput(
        elevation_m=30.0,
        local_relief_m=3.0,
        slope_deg=4.0,
        flow_accumulation=250.0,
        rainfall_mm_per_hour=7.5,
    )

    rates = [7.5, 35.0, 65.0, 115.0]
    scores: list[float] = []

    for rate in rates:
        sc = ScenarioInfo(
            id=f"rate-{rate}",
            label=f"{rate} mm/hr",
            rainfall_mm_per_hour=rate,
            assumption="ASSUMPTION",
        )
        feats = FeatureInput(
            elevation_m=features_base.elevation_m,
            local_relief_m=features_base.local_relief_m,
            slope_deg=features_base.slope_deg,
            flow_accumulation=features_base.flow_accumulation,
            rainfall_mm_per_hour=rate,
        )
        res = calculate_risk_score(feats, sc, test_config)
        assert res.risk_index is not None
        scores.append(res.risk_index)

    # Strictly monotonic increase as rainfall increases
    for i in range(len(scores) - 1):
        assert scores[i] < scores[i + 1]


def test_invalid_feature_ranges_rejected() -> None:
    with pytest.raises(ValidationError):
        FeatureInput(slope_deg=-1.0, rainfall_mm_per_hour=10.0)

    with pytest.raises(ValidationError):
        FeatureInput(slope_deg=95.0, rainfall_mm_per_hour=10.0)

    with pytest.raises(ValidationError):
        FeatureInput(rainfall_mm_per_hour=-5.0)
