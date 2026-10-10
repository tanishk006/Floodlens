# FloodLens Backend API

FastAPI backend serving candidate monitoring zones and deterministic flood-susceptibility scoring to the FloodLens React frontend.

**Status:** Phase 2 Complete. `GET /api/health`, `GET /api/zones`, and `POST /api/risk/estimate` endpoints implemented, fully typed, tested, and integrated with the `floodlens_ml` baseline risk model.

---

## 1. Endpoints & API Contract

### `GET /api/health`
Checks service health and runtime environment.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "FloodLens API",
  "environment": "development"
}
```

---

### `GET /api/zones`
Returns catalog of candidate monitoring zones in India (Uttar Pradesh, Bihar, Punjab, Rajasthan, Assam, West Bengal, Haryana, Odisha, Andhra Pradesh, Gujarat).

**Response (200 OK):**
```json
{
  "zones": [
    {
      "id": "zone-uttar-pradesh",
      "name": "Uttar Pradesh Monitoring Zone",
      "state": "Uttar Pradesh",
      "coordinates": [80.9462, 26.8467],
      "aoi_bbox": null,
      "data_status": "insufficient_data",
      "sources": [],
      "notes": "Candidate monitoring zone. The supplied million-hectare figure is unverified and not treated as a flood score. Local DEM and ground observations are currently absent."
    }
  ],
  "total": 10,
  "disclaimer": "Candidate monitoring zones for experimental evaluation. Not an official warning or verified flood-risk ranking."
}
```

*Coordinates are strictly ordered as `[longitude, latitude]` in EPSG:4326 for direct MapLibre GL JS compatibility.*

---

### `POST /api/risk/estimate`
Calculates or retrieves the relative flood-susceptibility assessment for a candidate zone under an exploratory rainfall scenario.

**Request Body:**
```json
{
  "zone_id": "zone-uttar-pradesh",
  "scenario_id": "moderate",
  "rainfall_mm_per_hour": 35.0
}
```

**Response (200 OK):**
```json
{
  "zone_id": "zone-uttar-pradesh",
  "locality": "Uttar Pradesh Monitoring Zone",
  "coordinates": [80.9462, 26.8467],
  "scenario": {
    "id": "moderate",
    "label": "Moderate rainfall",
    "rainfall_mm_per_hour": 35.0,
    "assumption": "ASSUMPTION: fixed exploratory rainfall rate; not a forecast."
  },
  "risk_index": null,
  "risk_category": "insufficient_data",
  "is_probability": false,
  "factors": [
    {
      "factor_name": "low_elevation",
      "raw_value": null,
      "normalized_value": null,
      "weight": 0.25,
      "weighted_score": null,
      "available": false,
      "interpretation": "Elevation data absent. Cannot compute elevation contribution."
    },
    {
      "factor_name": "local_relief",
      "raw_value": null,
      "normalized_value": null,
      "weight": 0.15,
      "weighted_score": null,
      "available": false,
      "interpretation": "Local relief absent. Neighborhood terrain data required."
    },
    {
      "factor_name": "slope",
      "raw_value": null,
      "normalized_value": null,
      "weight": 0.1,
      "weighted_score": null,
      "available": false,
      "interpretation": "Slope absent. Terrain gradient calculation required."
    },
    {
      "factor_name": "flow_accumulation",
      "raw_value": null,
      "normalized_value": null,
      "weight": 0.2,
      "weighted_score": null,
      "available": false,
      "interpretation": "Flow accumulation absent. Hydrological catchment data required."
    },
    {
      "factor_name": "rainfall",
      "raw_value": 35.0,
      "normalized_value": 0.3043,
      "weight": 0.3,
      "weighted_score": null,
      "available": true,
      "interpretation": "Exploratory rainfall rate: 35.0 mm/hr."
    }
  ],
  "data_quality": {
    "status": "insufficient_data",
    "missing_inputs": [
      "Missing feature: elevation_m",
      "Missing feature: local_relief_m",
      "Missing feature: slope_deg",
      "Missing feature: flow_accumulation"
    ],
    "warnings": [
      "Score cannot be calculated because required terrain features are not available."
    ]
  },
  "model_version": "0.1.0-baseline",
  "generated_at": "2026-10-10T20:02:37.770830+00:00",
  "limitations": [
    "Experimental estimate. Not an official warning or emergency instruction.",
    "The 0–100 score is a relative susceptibility index and does NOT represent a flood probability, water depth, or safety guarantee.",
    "Factor weights and normalization bounds are exploratory configuration assumptions, not scientifically calibrated or validated parameters.",
    "Terrain indicators do not account for municipal stormwater drainage, pump capacity, soil infiltration, or tidal/riverine flood barriers.",
    "Rainfall values represent user-selected scenario rates (mm/hr), not real-time observations or meteorological forecasts."
  ],
  "data_provenance": []
}
```

---

## 2. Error States & Handling

The API emits standardized, typed error responses:

```json
{
  "status": "invalid_input",
  "message": "Scenario 'monsoon_super_deluge' is not supported. Supported scenarios: ['light', 'moderate', 'heavy', 'extreme']."
}
```

| State | HTTP Status | Trigger |
|---|---|---|
| `invalid_input` | 422 / 400 | Malformed JSON, unsupported scenario, negative rainfall rate |
| `outside_coverage` | 422 | Requested `zone_id` does not exist in candidate catalog |
| `insufficient_data` | 422 / 200 (payload state) | Feature prerequisites missing |
| `data_unavailable` | 503 | Configuration file or data service cannot be loaded |
| `internal_error` | 500 | Unhandled server error (generic message, no stack trace leakage) |

---

## 3. Architecture & Model Integration

```text
FastAPI Routes (/api/zones, /api/risk/estimate)
                    │
                    ▼
           Backend Services (app.services)
                    │
                    ▼
     floodlens_ml Package (ml-model/)
       ├── io.py (Candidate Zones Catalog)
       ├── predict.py (Scenario Evaluation)
       ├── schemas.py (Pydantic Contract)
       └── scoring.py (0-100 Relative Index)
```

- **Zero Logic Duplication:** The backend does not implement mathematical scoring or factor formulas; all calculations are delegated directly to `floodlens_ml`.
- **Package Connectivity:** `floodlens-ml` is installed in editable mode (`pip install -e ml-model`) with `pythonpath` fallbacks for development.
- **CORS:** Configured for Vite development origin `http://localhost:5173` and `http://127.0.0.1:5173`.

---

## 4. Running and Testing

```bash
# Run pytest test suite
python -m pytest

# Run linter
ruff check .

# Start development server
uvicorn app.main:app --reload --port 8000
```
