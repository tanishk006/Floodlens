"""Tests for high-level prediction and zone evaluation entry points."""

from pathlib import Path

import pytest
import yaml

from floodlens_ml.config import FloodlensConfig
from floodlens_ml.io import (
    create_synthetic_test_features,
    get_candidate_monitoring_zones,
)
from floodlens_ml.predict import (
    evaluate_candidate_zone,
    get_scenario_by_id,
    predict_all_scenarios,
    predict_risk,
)
from floodlens_ml.schemas import CandidateZone

CONFIG_PATH = Path(__file__).resolve().parents[1] / "config.yaml"


@pytest.fixture
def repo_config() -> FloodlensConfig:
    data = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    return FloodlensConfig.model_validate(data)


def test_predict_risk_all_scenarios(repo_config: FloodlensConfig) -> None:
    features = create_synthetic_test_features("moderate_urban")

    res_light = predict_risk(features, "light", repo_config)
    res_mod = predict_risk(features, "moderate", repo_config)
    res_heavy = predict_risk(features, "heavy", repo_config)
    res_ext = predict_risk(features, "extreme", repo_config)

    assert res_light.risk_index is not None
    assert res_mod.risk_index is not None
    assert res_heavy.risk_index is not None
    assert res_ext.risk_index is not None

    # Increasing rainfall scenario increases susceptibility index
    assert res_light.risk_index < res_mod.risk_index
    assert res_mod.risk_index < res_heavy.risk_index
    assert res_heavy.risk_index < res_ext.risk_index

    assert res_light.scenario.id == "light"
    assert res_light.scenario.rainfall_mm_per_hour == 7.5
    assert res_ext.scenario.rainfall_mm_per_hour == 115.0


def test_predict_all_scenarios_dict(repo_config: FloodlensConfig) -> None:
    features = create_synthetic_test_features("moderate_urban")
    all_res = predict_all_scenarios(features, repo_config)

    assert set(all_res.keys()) == {"light", "moderate", "heavy", "extreme"}
    for sc_id, result in all_res.items():
        assert result.scenario.id == sc_id
        assert result.risk_index is not None


def test_invalid_scenario_id_raises_value_error(
    repo_config: FloodlensConfig,
) -> None:
    features = create_synthetic_test_features("moderate_urban")
    with pytest.raises(ValueError, match="Unknown scenario 'monsoon_tsunami'"):
        predict_risk(features, "monsoon_tsunami", repo_config)

    with pytest.raises(ValueError):
        get_scenario_by_id(repo_config, "nonexistent")


def test_evaluate_pilot_zone_returns_verified_score(
    repo_config: FloodlensConfig,
) -> None:
    zones = get_candidate_monitoring_zones()
    zone_up = next(z for z in zones if z.id == "zone-uttar-pradesh")

    result = evaluate_candidate_zone(zone_up, repo_config, scenario_id="moderate")

    assert result.zone_id == zone_up.id
    assert result.locality == zone_up.name
    assert result.coordinates == zone_up.coordinates
    assert result.risk_index is not None
    assert 0.0 <= result.risk_index <= 100.0
    assert result.risk_category == "low"
    assert result.data_quality.status == "available"
    assert result.is_probability is False
    assert len(result.factors) == 5
    assert all(f.available is True for f in result.factors)


def test_evaluate_candidate_zone_returns_insufficient_data(
    repo_config: FloodlensConfig,
) -> None:
    unverified_zone = CandidateZone(
        id="zone-unverified-test",
        name="Unverified Test Zone",
        state="Test State",
        coordinates=(77.0, 20.0),
        data_status="insufficient_data",
    )

    result = evaluate_candidate_zone(
        unverified_zone, repo_config, scenario_id="moderate"
    )

    assert result.zone_id == unverified_zone.id
    assert result.locality == unverified_zone.name
    assert result.coordinates == unverified_zone.coordinates
    assert result.risk_index is None
    assert result.risk_category == "insufficient_data"
    assert result.data_quality.status == "insufficient_data"
    assert result.is_probability is False
    assert len(result.data_quality.missing_inputs) == 4


def test_evaluate_all_catalog_zones(
    repo_config: FloodlensConfig,
) -> None:
    zones = get_candidate_monitoring_zones()
    assert len(zones) == 10

    for zone in zones:
        result = evaluate_candidate_zone(zone, repo_config, scenario_id="moderate")
        assert result.zone_id == zone.id
        assert result.risk_index is not None
        assert 0.0 <= result.risk_index <= 100.0
        assert result.risk_category in ("low", "moderate", "high", "severe")
        assert result.data_quality.status == "available"
        assert result.is_probability is False
        assert len(result.factors) == 5
        assert all(f.available is True for f in result.factors)
