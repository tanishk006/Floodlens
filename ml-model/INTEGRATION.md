# FloodLens Integration Contract & API Specification

This document defines the machine-readable contracts connecting the ML model layer (`ml-model/`) to the FastAPI backend (`backend/`) and React/MapLibre frontend (`frontend/`).

---

## 1. Core Contract Invariants

1. **Coordinate Ordering:**
   - **All coordinates are strictly `[longitude, latitude]`** in EPSG:4326.
   - Conforms to RFC 7946 GeoJSON and MapLibre GL JS standard ordering.
2. **Non-Probability Declaration:**
   - Risk indices are relative susceptibility indices in $[0.0, 100.0]$.
   - Every response contains `is_probability: false`.
   - Never display percentage flood probabilities or flood depth predictions to end users.
3. **Data Quality & Fallback:**
   - Missing input prerequisites are explicitly exposed, not fabricated or silently imputed.
   - When inputs are missing, `risk_index` is `null` and `data_quality.status` is `"insufficient_data"`.
4. **Rainfall Units:**
   - Rainfall intensity is expressed strictly in `mm/hour`.

---

## 2. Export Artifacts (`ml-model/artifacts/export/`)

The ML pipeline generates three export artifacts consumed by downstream services:

### A. `candidate_zones.geojson`
Standard RFC 7946 GeoJSON FeatureCollection rendered by MapLibre as interactive map markers:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [80.9462, 26.8467]
      },
      "properties": {
        "id": "zone-uttar-pradesh",
        "name": "Uttar Pradesh Monitoring Zone",
        "state": "Uttar Pradesh",
        "data_status": "insufficient_data",
        "notes": "Candidate monitoring zone. The supplied million-hectare figure is unverified..."
      }
    }
  ]
}
```

### B. `zones_export.json`
Complete schema bundle containing candidate zones, supported scenario definitions, full factor breakdowns, and data quality diagnostics:

- Top-level fields:
  - `export_version`: `"0.1.0"`
  - `generated_at`: ISO 8601 UTC timestamp
  - `disclaimer`: `"Experimental estimate. Not an official warning."`
  - `candidate_zones`: Array of `CandidateZone`
  - `scenarios`: Array of `ScenarioInfo`
  - `zone_risk_summaries`: Map of `zone_id` $\to$ `scenario_id` $\to$ `RiskScoreResult`
  - `limitations`: Array of documented operational caveats
  - `contract_documentation`: Machine-readable specification

### C. `synthetic_benchmarks.json`
Illustrative calculations on synthetic test fixtures (`synthetic-lowland`, `synthetic-urban`, `synthetic-ridge`) across all four scenarios. Enables frontend developers to test interactive gauge and factor visualizers with populated values without falsely presenting them as real observations.

---

## 3. Backend Endpoints (FastAPI Integration)

The FastAPI backend will expose the following routes based on this contract:

### `GET /api/zones`
Returns the catalog of candidate monitoring zones.

**Response Schema:**
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
      "notes": "Candidate monitoring zone. The supplied million-hectare figure is unverified..."
    }
  ]
}
```

### `POST /api/risk/estimate`
Calculates or retrieves the flood susceptibility assessment for a given zone and rainfall intensity.

**Request Schema:**
```json
{
  "zone_id": "zone-uttar-pradesh",
  "scenario_id": "moderate",
  "rainfall_mm_per_hour": 35.0
}
```

**Response Schema (`RiskScoreResult`):**
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
    "The 0–100 score is a relative susceptibility index and does NOT represent a flood probability, water depth, or safety guarantee."
  ],
  "data_provenance": []
}
```

---

## 4. Design Tokens & Styling Integration

The frontend maps response categories to the existing Tailwind design tokens:

| Category | Index Range | Tailwind Token | Hex Color | Description |
|---|---|---|---|---|
| `low` | $0.0 - 25.0$ | `bg-risk-low` / `text-risk-low` | `#7A9E7E` | Low relative susceptibility |
| `moderate` | $25.0 - 50.0$ | `bg-risk-moderate` / `text-risk-moderate` | `#D9B44A` | Moderate relative susceptibility |
| `high` | $50.0 - 75.0$ | `bg-risk-high` / `text-risk-high` | `#D9772B` | High relative susceptibility |
| `severe` | $> 75.0$ | `bg-risk-severe` / `text-risk-severe` | `#A3262A` | Severe relative susceptibility |
| `insufficient_data`| `null` | `bg-muted` / `text-muted` | `#55595E` | Insufficient data / Not available |
