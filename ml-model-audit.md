# ML model audit

**Checked:** 2026-10-09  
**Status:** Phase 1 configuration/CLI scaffold only. No terrain model, risk
scoring engine, inundation engine, export, label processing, or trained model
exists yet.

## Current state

The ML project is in `ml-model/`. Its config loader validates a YAML
configuration with strict Pydantic models. The CLI loads the config and stops
when locality setup is incomplete. The intended locality is still
`[LOCALITY]`; the bounding box and metric CRS are null.

No DEM, documented label dataset, roads file, processed raster, model artifact,
or exported frontend data is present. The provenance table records no supplied
data. Nothing in the folder reports measured model accuracy or other model
performance.

## File and directory inventory

| Path | Current contents and purpose |
| --- | --- |
| `ml-model/requirements.txt` | Pinned numpy, scipy, pandas, geopandas, shapely, rasterio, scikit-learn, Pydantic v2, PyYAML, pytest, and Ruff dependencies. |
| `ml-model/config.yaml` | Placeholder locality; unset AOI bbox and metric CRS; input/output paths; score thresholds; baseline weights and normalization; terrain parameters; four rainfall scenarios; inundation options; training thresholds, seed, spatial block size, and baseline-fallback flag. Assumptions are explicitly marked. |
| `ml-model/pyproject.toml` | Pytest test path and source import path; Ruff Python 3.11 target, 88-character line length, and E/F/I lint rules. |
| `ml-model/README.md` | Phase 1 status, required locality and DEM setup, environment commands, and limitation statement. |
| `ml-model/data/README.md` | Empty provenance table plus instructions for documenting each future dataset's source, license, resolution, date, and use. |
| `ml-model/data/raw/.gitkeep` | Keeps the raw-data directory in version control; raw data files are ignored. |
| `ml-model/data/processed/.gitkeep` | Keeps the processed-data directory in version control; generated processed files are ignored. |
| `ml-model/artifacts/.gitkeep` | Keeps the artifacts directory in version control; generated model/export artifacts are ignored. |
| `ml-model/src/floodlens_ml/__init__.py` | Package marker. |
| `ml-model/src/floodlens_ml/config.py` | Strict Pydantic config models, AOI bbox validation, required factor/scenario validation, thresholds/weights validation, YAML loader, and setup-gap reporting. |
| `ml-model/scripts/run_pipeline.py` | CLI entry point; loads and validates config, reports missing locality/AOI/CRS, and notes that pipeline stages are not implemented. |
| `ml-model/tests/test_config.py` | Eight checks for config load/setup gaps, valid synthetic test AOI, invalid bounds, ordered thresholds, weights summing to one, and rejection of extra fields. Synthetic values exist only in tests. |

### Requested but not present

The following requested files/modules have not been implemented:

- `src/floodlens_ml/io.py`
- `src/floodlens_ml/terrain.py`
- `src/floodlens_ml/scoring.py`
- `src/floodlens_ml/inundation.py`
- `src/floodlens_ml/export.py`
- `src/floodlens_ml/labels.py`
- `src/floodlens_ml/features.py`
- `src/floodlens_ml/train.py`
- `src/floodlens_ml/evaluate.py`
- `src/floodlens_ml/predict.py`
- `src/floodlens_ml/schemas.py`
- `MODEL_CARD.md`
- `INTEGRATION.md`
- Frontend export validator

The pipeline command is not end-to-end yet. It does not open a DEM, calculate
terrain features, score, inundate, or export files.

## Configuration assumptions

The current YAML contains the following explicitly marked assumptions:

- Baseline weights: low elevation `0.25`, local relief `0.15`, slope `0.10`,
  flow accumulation `0.20`, rainfall `0.30`.
- Factor normalization bounds for those five inputs.
- Score thresholds at 25, 50, and 75 on a 0–100 relative index; these are not
  probabilities.
- Terrain local-relief radius `100 m`, sink depth `0.5 m`, and simplification
  tolerance `2 m`.
- Scenario rates of `7.5`, `35`, `65`, and `115 mm/hr`; these are fixed
  exploratory values, not observations or forecasts.
- Inundation mode `fixed_levels`, with no fixed levels configured; optional
  runoff coefficient `0.5` and maximum depth `2 m`.
- Training minimums of 100 positives and 100 negatives, random seed `42`,
  spatial block size `500 m`, and baseline fallback disabled.

These assumptions are configuration only. No outputs have been generated from
them.

## Data and run prerequisites

Before terrain processing, the AOI locality, EPSG:4326 bbox, and suitable
projected metric CRS must be supplied. A real, documented GeoTIFF DEM must be
placed at the configured path `ml-model/data/raw/dem.tif`. No DEM is currently
present. Road and documented label inputs are also absent.

Do not treat placeholder/test data as observations. Do not claim a forecast,
official warning, calibrated score, or measured accuracy.

## Validation observed

Commands run from `ml-model/`:

```text
python -m pytest -q
8 passed in 0.50s

ruff check .
All checks passed!
```

Validation ran with Python 3.14 because Python 3.11 was not available in the
environment. The pinned project requirements target Python 3.11.

## Acceptance status

| Check | Current status |
| --- | --- |
| Pipeline runs end to end with a real DEM and stops clearly without it | Not implemented; CLI currently stops earlier because locality, bbox, and CRS are unset. |
| Export validator and frontend compatibility | Not implemented; no contract or export files exist. |
| Deterministic repeated exports | Not applicable; no export stages exist. |
| No unsupported measured-accuracy claims | Satisfied by current files: no accuracy values/results are stated. |
| Assumptions in config and output metadata | Assumptions are in config; no output metadata exists yet. |

