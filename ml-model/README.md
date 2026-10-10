# FloodLens ML Pipeline

**Status:** Phase 1 Complete. Deterministic baseline flood-susceptibility scoring engine, strict Pydantic schemas, prerequisite validation, terrain analysis helpers, export pipeline, CLI entry points, and test suite implemented.

---

## Overview

The `floodlens_ml` package provides a transparent, deterministic baseline scoring model for relative flood susceptibility. It computes a 0–100 index from environmental indicators and explicitly defined rainfall scenarios (in mm/hour).

Key architectural principles:
- **No Fabricated Accuracy:** Rule-based Multi-Criteria Evaluation (MCE) index; explicitly not a trained ML classifier or hydrodynamic simulation.
- **Strict Coordinate Convention:** Coordinates use `[longitude, latitude]` ordering in EPSG:4326 for GeoJSON and MapLibre GL JS consistency.
- **Deterministic & Bounded:** Identical inputs produce identical outputs; outputs are strictly bounded in $[0.0, 100.0]$.
- **Non-Probability Guarantee:** Every output carries `is_probability: false`; scores represent relative susceptibility, not event probability or water depth.
- **Transparent Missing Data:** Missing prerequisites or feature inputs result in `insufficient_data` states with actionable diagnostics rather than fabricated scores.

---

## Module Architecture

```text
ml-model/
├── config.yaml               # Strictly validated pipeline parameters and assumptions
├── MODEL_CARD.md             # Model card documenting methodology and safety boundaries
├── INTEGRATION.md            # Machine-readable data contract for FastAPI and React
├── artifacts/
│   └── export/               # Exported data bundles (GeoJSON, JSON)
├── data/
│   ├── raw/                  # Input rasters and GeoJSON vectors (unpopulated)
│   └── processed/            # Derived geospatial features
├── scripts/
│   └── run_pipeline.py       # CLI entry point with prerequisite checks and export flags
├── src/
│   └── floodlens_ml/
│       ├── __init__.py       # Public package API
│       ├── config.py         # Strict Pydantic configuration loader
│       ├── schemas.py        # Machine-readable data contracts and Pydantic models
│       ├── scoring.py        # Deterministic 0-100 susceptibility scoring engine
│       ├── terrain.py        # DEM verification, slope, and local relief routines
│       ├── io.py             # Prerequisite checks and candidate monitoring zones
│       ├── predict.py        # High-level scenario evaluation routines
│       └── export.py         # JSON and RFC 7946 GeoJSON export pipeline
└── tests/
    ├── test_config.py        # Config parsing and boundary tests
    ├── test_schemas.py       # Pydantic schema validation tests
    ├── test_scoring.py       # Scoring determinism, bounds, and monotonicity tests
    ├── test_terrain.py       # Slope, relief, and DEM availability tests
    ├── test_io.py            # Prerequisite reporting and candidate zone tests
    ├── test_predict.py       # Scenario evaluation and zone prediction tests
    ├── test_export.py        # Export bundle and GeoJSON serialization tests
    └── test_pipeline_cli.py  # CLI execution and exit code tests
```

---

## Environment & Commands

### Prerequisites
- Python 3.11 or higher
- Dependencies: `pydantic`, `pyyaml`, `numpy`, `pytest`, `ruff`

### Running the Test Suite
```bash
python -m pytest
```
*Current test suite: 43 passing tests across 8 test suites.*

### Linting and Formatting
```bash
ruff check .
```

### Running the Pipeline CLI

1. **Prerequisite Check (Default Config):**
   ```bash
   python scripts/run_pipeline.py
   ```
   Reports missing prerequisites (AOI locality, bounding box, CRS, DEM file) and exits cleanly with exit code 2.

2. **Export Candidate Zones Contract:**
   ```bash
   python scripts/run_pipeline.py --export
   ```
   Generates `artifacts/export/candidate_zones.geojson`, `zones_export.json`, and `synthetic_benchmarks.json`.

3. **Run Synthetic Benchmark Demo:**
   ```bash
   python scripts/run_pipeline.py --synthetic-demo
   ```
   Evaluates illustrative synthetic test fixtures across all four rainfall scenarios for frontend visualization testing.

---

## Candidate Monitoring Zones & Scientific Boundaries

The prototype identifies ten candidate monitoring zones in India:
- Uttar Pradesh, Bihar, Punjab, Rajasthan, Assam, West Bengal, Haryana, Odisha, Andhra Pradesh, Gujarat.

**Scientific Integrity Statement:**
- The million-hectare values associated with these states are **unverified** and are **NOT** used as flood-risk scores or model labels.
- Because no local DEM or ground truth observations are currently connected, candidate zones evaluate to `data_status: "insufficient_data"` and `risk_index: null`.
- Synthetic fixtures are strictly marked `status: "illustrative"` for developer testing only.

---

## Limitations

- **Experimental estimate. Not an official warning.**
- Factor weights and normalization bounds are exploratory configuration assumptions, not calibrated parameters.
- Drainage infrastructure, sewer pumps, soil permeability, and riverbank dynamics are not modeled.
- Rainfall rates are exploratory user-selected scenarios, not weather forecasts.
