"""Tests for JSON and GeoJSON export generation and contract validation."""

import json
from pathlib import Path

import pytest
import yaml

from floodlens_ml.config import FloodlensConfig
from floodlens_ml.export import (
    build_candidate_zones_export_bundle,
    build_synthetic_benchmark_results,
    candidate_zones_to_geojson,
    write_export_artifacts,
)
from floodlens_ml.schemas import ZoneExportBundle

CONFIG_PATH = Path(__file__).resolve().parents[1] / "config.yaml"


@pytest.fixture
def repo_config() -> FloodlensConfig:
    data = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    return FloodlensConfig.model_validate(data)


def test_build_candidate_zones_export_bundle(
    repo_config: FloodlensConfig,
) -> None:
    bundle = build_candidate_zones_export_bundle(repo_config)

    assert isinstance(bundle, ZoneExportBundle)
    assert bundle.export_version == "0.1.0"
    assert len(bundle.candidate_zones) == 10
    assert len(bundle.scenarios) == 4

    # Every zone must have entries for all four scenarios
    for zone in bundle.candidate_zones:
        assert zone.id in bundle.zone_risk_summaries
        zone_summary = bundle.zone_risk_summaries[zone.id]
        for sc in bundle.scenarios:
            assert sc.id in zone_summary
            res = zone_summary[sc.id]
            assert res.risk_index is None
            assert res.risk_category == "insufficient_data"
            assert res.is_probability is False


def test_candidate_zones_to_geojson_format(
    repo_config: FloodlensConfig,
) -> None:
    bundle = build_candidate_zones_export_bundle(repo_config)
    geojson = candidate_zones_to_geojson(bundle.candidate_zones)

    assert geojson["type"] == "FeatureCollection"
    features = geojson["features"]
    assert len(features) == 10

    for feat in features:
        assert feat["type"] == "Feature"
        geom = feat["geometry"]
        assert geom["type"] == "Point"
        coords = geom["coordinates"]
        assert len(coords) == 2
        lon, lat = coords
        # Longitude, latitude order
        assert 68.0 <= lon <= 98.0
        assert 8.0 <= lat <= 38.0
        props = feat["properties"]
        assert props["data_status"] == "insufficient_data"


def test_build_synthetic_benchmark_results(
    repo_config: FloodlensConfig,
) -> None:
    benchmarks = build_synthetic_benchmark_results(repo_config)

    assert set(benchmarks.keys()) == {
        "synthetic-lowland",
        "synthetic-urban",
        "synthetic-ridge",
    }
    for _b_id, sc_dict in benchmarks.items():
        assert len(sc_dict) == 4
        for _sc_id, res in sc_dict.items():
            assert res.risk_index is not None
            assert 0.0 <= res.risk_index <= 100.0
            assert res.data_quality.status == "illustrative"


def test_write_export_artifacts(
    repo_config: FloodlensConfig, tmp_path: Path
) -> None:
    out = write_export_artifacts(repo_config, output_dir=tmp_path)

    assert out["bundle"].exists()
    assert out["geojson"].exists()
    assert out["benchmarks"].exists()

    bundle_data = json.loads(out["bundle"].read_text(encoding="utf-8"))
    assert bundle_data["export_version"] == "0.1.0"
    assert len(bundle_data["candidate_zones"]) == 10

    geojson_data = json.loads(out["geojson"].read_text(encoding="utf-8"))
    assert geojson_data["type"] == "FeatureCollection"
    assert len(geojson_data["features"]) == 10

    benchmarks_data = json.loads(out["benchmarks"].read_text(encoding="utf-8"))
    assert "synthetic-urban" in benchmarks_data
