"""Configuration validation tests; test-only coordinates are synthetic."""

from pathlib import Path

import pytest
import yaml
from pydantic import ValidationError

from floodlens_ml.config import FloodlensConfig, load_config

CONFIG_PATH = Path(__file__).resolve().parents[1] / "config.yaml"


def _valid_config_data() -> dict[str, object]:
    return yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))


def test_repository_config_loads_and_requires_locality_setup() -> None:
    config = load_config(CONFIG_PATH)

    assert config.setup_gaps() == [
        "area_of_interest.locality",
        "area_of_interest.bbox",
        "area_of_interest.metric_crs",
    ]


def test_valid_synthetic_test_aoi_passes_validation() -> None:
    data = _valid_config_data()
    aoi = data["area_of_interest"]
    assert isinstance(aoi, dict)
    aoi.update(
        {
            "locality": "Synthetic test locality",
            "bbox": [-74.01, 40.70, -73.99, 40.72],
            "metric_crs": "EPSG:32618",
        }
    )

    config = FloodlensConfig.model_validate(data)

    assert config.setup_gaps() == []


@pytest.mark.parametrize(
    "bbox",
    [
        [10, 0, -10, 1],
        [-181, 0, -180, 1],
        [0, -91, 1, -90],
    ],
)
def test_invalid_bbox_is_rejected(bbox: list[float]) -> None:
    data = _valid_config_data()
    aoi = data["area_of_interest"]
    assert isinstance(aoi, dict)
    aoi.update(
        {
            "locality": "Synthetic test locality",
            "bbox": bbox,
            "metric_crs": "EPSG:32618",
        }
    )

    with pytest.raises(ValidationError):
        FloodlensConfig.model_validate(data)


def test_unordered_score_thresholds_are_rejected() -> None:
    data = _valid_config_data()
    thresholds = data["thresholds"]
    assert isinstance(thresholds, dict)
    thresholds.update({"low_max": 50, "moderate_max": 25})

    with pytest.raises(ValidationError, match="strictly increasing"):
        FloodlensConfig.model_validate(data)


def test_weights_must_sum_to_one() -> None:
    data = _valid_config_data()
    scoring = data["scoring"]
    assert isinstance(scoring, dict)
    weights = scoring["weights"]
    assert isinstance(weights, dict)
    weights["rainfall"] = 0.25

    with pytest.raises(ValidationError, match="must sum to 1"):
        FloodlensConfig.model_validate(data)


def test_unknown_configuration_fields_are_rejected() -> None:
    data = _valid_config_data()
    data["unexpected"] = "not allowed"

    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        FloodlensConfig.model_validate(data)
