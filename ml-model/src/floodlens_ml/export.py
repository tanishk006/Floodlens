"""Export pipeline generating validated JSON and GeoJSON artifacts.

Creates machine-readable contracts for FastAPI and the React/MapLibre frontend.
Guarantees:
- Strict longitude/latitude coordinate ordering for MapLibre/GeoJSON compatibility.
- Transparent reporting of candidate monitoring zones.
- Explicit non-probability declarations.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from floodlens_ml.config import FloodlensConfig
from floodlens_ml.io import (
    create_synthetic_test_features,
    get_candidate_monitoring_zones,
    get_synthetic_provenance,
)
from floodlens_ml.predict import evaluate_candidate_zone, predict_risk
from floodlens_ml.schemas import (
    CandidateZone,
    RiskScoreResult,
    ScenarioInfo,
    ZoneExportBundle,
)
from floodlens_ml.scoring import STANDARD_LIMITATIONS

EXPORT_CONTRACT_DOCS: dict[str, Any] = {
    "version": "0.1.0",
    "coordinate_system": "EPSG:4326",
    "coordinate_ordering": "[longitude, latitude]",
    "score_semantics": (
        "0–100 relative susceptibility index. NOT an event probability, "
        "calibrated forecast, or inundation depth."
    ),
    "rainfall_units": "mm/hour",
    "risk_categories": [
        {"id": "low", "threshold": "<= 25.0", "color_token": "risk-low"},
        {"id": "moderate", "threshold": "25.0 - 50.0", "color_token": "risk-moderate"},
        {"id": "high", "threshold": "50.0 - 75.0", "color_token": "risk-high"},
        {"id": "severe", "threshold": "> 75.0", "color_token": "risk-severe"},
        {
            "id": "insufficient_data",
            "threshold": "null",
            "color_token": "muted",
        },
    ],
    "backend_endpoints": {
        "health": "GET /api/health",
        "zones": "GET /api/zones",
        "estimate": "POST /api/risk/estimate",
    },
}


def build_candidate_zones_export_bundle(
    config: FloodlensConfig,
) -> ZoneExportBundle:
    """Build the complete export bundle for candidate monitoring zones."""
    zones = get_candidate_monitoring_zones()
    scenarios = [
        ScenarioInfo(
            id=sc.id,
            label=sc.label,
            rainfall_mm_per_hour=sc.mm_per_hr,
            assumption=sc.assumption,
        )
        for sc in config.scenarios
    ]

    summaries: dict[str, dict[str, RiskScoreResult]] = {}
    for zone in zones:
        summaries[zone.id] = {}
        for sc in config.scenarios:
            result = evaluate_candidate_zone(zone, config, scenario_id=sc.id)
            summaries[zone.id][sc.id] = result

    now_iso = datetime.now(timezone.utc).isoformat()
    return ZoneExportBundle(
        export_version="0.1.0",
        generated_at=now_iso,
        disclaimer="Experimental estimate. Not an official warning.",
        candidate_zones=zones,
        scenarios=scenarios,
        zone_risk_summaries=summaries,
        limitations=STANDARD_LIMITATIONS,
        contract_documentation=EXPORT_CONTRACT_DOCS,
    )


def build_synthetic_benchmark_results(
    config: FloodlensConfig,
) -> dict[str, dict[str, RiskScoreResult]]:
    """Build illustrative risk calculations on synthetic test fixtures.

    Provided for developers to test frontend UI rendering with realistic
    score values without pretending they are real Indian observations.
    """
    benchmarks = {
        "synthetic-lowland": create_synthetic_test_features("lowland_depression"),
        "synthetic-urban": create_synthetic_test_features("moderate_urban"),
        "synthetic-ridge": create_synthetic_test_features("elevated_ridge"),
    }
    provenance = [get_synthetic_provenance()]

    benchmark_summaries: dict[str, dict[str, RiskScoreResult]] = {}
    for b_id, features in benchmarks.items():
        benchmark_summaries[b_id] = {}
        for sc in config.scenarios:
            result = predict_risk(
                features=features,
                scenario_id=sc.id,
                config=config,
                zone_id=b_id,
                locality=f"Synthetic Benchmark ({b_id})",
                coordinates=(77.0, 28.0),
                data_status="illustrative",
                sources=provenance,
            )
            benchmark_summaries[b_id][sc.id] = result

    return benchmark_summaries


def candidate_zones_to_geojson(zones: list[CandidateZone]) -> dict[str, Any]:
    """Convert candidate zones to RFC 7946 GeoJSON FeatureCollection.

    Guarantees [longitude, latitude] point coordinate order.
    """
    features = []
    for zone in zones:
        lon, lat = zone.coordinates
        feat = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat],
            },
            "properties": {
                "id": zone.id,
                "name": zone.name,
                "state": zone.state,
                "data_status": zone.data_status,
                "notes": zone.notes,
            },
        }
        features.append(feat)

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def write_export_artifacts(
    config: FloodlensConfig, output_dir: Path | None = None
) -> dict[str, Path]:
    """Export validated bundle JSON and GeoJSON files to the output directory."""
    target_dir = output_dir or Path(config.paths.output)
    target_dir.mkdir(parents=True, exist_ok=True)

    bundle = build_candidate_zones_export_bundle(config)
    bundle_path = target_dir / "zones_export.json"
    with bundle_path.open("w", encoding="utf-8") as f:
        f.write(json.dumps(bundle.model_dump(), indent=2, ensure_ascii=False))

    geojson_path = target_dir / "candidate_zones.geojson"
    geojson_data = candidate_zones_to_geojson(bundle.candidate_zones)
    with geojson_path.open("w", encoding="utf-8") as f:
        f.write(json.dumps(geojson_data, indent=2, ensure_ascii=False))

    benchmarks_path = target_dir / "synthetic_benchmarks.json"
    benchmarks_data = build_synthetic_benchmark_results(config)
    serializable_benchmarks = {
        b_id: {s_id: res.model_dump() for s_id, res in sc_dict.items()}
        for b_id, sc_dict in benchmarks_data.items()
    }
    with benchmarks_path.open("w", encoding="utf-8") as f:
        f.write(
            json.dumps(serializable_benchmarks, indent=2, ensure_ascii=False)
        )

    return {
        "bundle": bundle_path,
        "geojson": geojson_path,
        "benchmarks": benchmarks_path,
    }
