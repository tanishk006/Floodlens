# FloodLens ML pipeline

Status: Phase 1 scaffold. Terrain processing, scoring, inundation, export, and
training are not implemented yet.

## Configuration and inputs

Set the locality, its `[west, south, east, north]` bounding box in EPSG:4326,
and an appropriate projected metric CRS in `config.yaml` before running the
pipeline. These locality values are intentionally unset because the target is
still `[LOCALITY]`. The config's documented assumptions are exploratory and
uncalibrated.

No DEM, road file, or documented labels are included. Do not use generated
placeholder data as an observation or model input. Phase 2 will require a real,
documented GeoTIFF DEM at the configured `data/raw/dem.tif` path.

## Environment and commands

Use Python 3.11. From this directory:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pytest
ruff check .
python scripts/run_pipeline.py
```

The pipeline command currently validates configuration and stops until a real
locality, bounding box, and metric CRS are configured. It does not generate
terrain, risk, or flood outputs.

## Limitations

There are no measured model results, validated hazard observations, or
performance metrics. The future baseline score is an estimate, not a
probability or an official warning. Training will remain disabled unless the
documented-label thresholds in `config.yaml` are met.
