"""Tests for I/O functions, prerequisite validation, and candidate zones."""

from pathlib import Path

import pytest
import yaml

from floodlens_ml.config import FloodlensConfig
from floodlens_ml.io import (
    create_synthetic_test_features,
    get_candidate_monitoring_zones,
    parse_feature_input,
    validate_pipeline_prerequisites,
)

CONFIG_PATH = Path(__file__).resolve().parents[1] / "config.yaml"


@pytest.fixture
def repo_config() -> FloodlensConfig:
    data = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    return FloodlensConfig.model_validate(data)


def test_default_config_reports_missing_prerequisites(
    repo_config: FloodlensConfig,
) -> None:
    report = validate_pipeline_prerequisites(repo_config)

    assert report.locality_configured is False
    assert report.bbox_configured is False
    assert report.metric_crs_configured is False
    assert report.dem_present is False
    assert report.ready_for_terrain_processing is False
    assert report.ready_for_training is False
    assert len(report.missing_prerequisites) >= 4


def test_synthetic_complete_setup_passes_prerequisites(
    tmp_path: Path,
) -> None:
    data = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    data["area_of_interest"].update(
        {
            "locality": "Synthetic Testing Zone",
            "bbox": [77.0, 28.0, 77.5, 28.5],
            "metric_crs": "EPSG:32643",
        }
    )

    # Create dummy files for paths
    raw_dir = tmp_path / "data" / "raw"
    raw_dir.mkdir(parents=True)
    dem_file = raw_dir / "dem.tif"
    dem_file.write_bytes(b"dummy_dem")
    labels_file = raw_dir / "labels.geojson"
    labels_file.write_bytes(b"dummy_labels")
    roads_file = raw_dir / "roads.geojson"
    roads_file.write_bytes(b"dummy_roads")

    cfg = FloodlensConfig.model_validate(data)
    report = validate_pipeline_prerequisites(cfg, base_dir=tmp_path)

    assert report.locality_configured is True
    assert report.bbox_configured is True
    assert report.metric_crs_configured is True
    assert report.dem_present is True
    assert report.labels_present is True
    assert report.roads_present is True
    assert report.ready_for_terrain_processing is True
    assert len(report.missing_prerequisites) == 0


def test_candidate_monitoring_zones_catalog() -> None:
    zones = get_candidate_monitoring_zones()
    assert len(zones) == 10

    expected_states = {
        "Uttar Pradesh",
        "Bihar",
        "Punjab",
        "Rajasthan",
        "Assam",
        "West Bengal",
        "Haryana",
        "Odisha",
        "Andhra Pradesh",
        "Gujarat",
    }
    actual_states = {zone.state for zone in zones}
    assert actual_states == expected_states

    for zone in zones:
        # All candidate zones must declare insufficient_data status
        assert zone.data_status == "insufficient_data"
        assert zone.sources == []
        # Longitude, latitude within India boundaries
        lon, lat = zone.coordinates
        assert 68.0 <= lon <= 98.0
        assert 8.0 <= lat <= 38.0
        assert "unverified" in (zone.notes or "")


def test_synthetic_test_fixtures_presets() -> None:
    lowland = create_synthetic_test_features("lowland_depression")
    assert lowland.elevation_m == 5.0
    assert lowland.has_all_features() is True

    ridge = create_synthetic_test_features("elevated_ridge")
    assert ridge.elevation_m == 120.0
    assert ridge.has_all_features() is True

    urban = create_synthetic_test_features("moderate_urban")
    assert urban.elevation_m == 45.0
    assert urban.has_all_features() is True


def test_parse_feature_input_valid_and_invalid() -> None:
    parsed = parse_feature_input(
        {
            "elevation_m": 50.0,
            "local_relief_m": 5.0,
            "slope_deg": 3.0,
            "flow_accumulation": 100.0,
            "rainfall_mm_per_hour": 35.0,
        }
    )
    assert parsed.elevation_m == 50.0
    assert parsed.rainfall_mm_per_hour == 35.0
