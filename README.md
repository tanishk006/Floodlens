# FloodLens

### AI-Assisted, Terrain-Aware Flood-Risk Intelligence & Decision Support Platform

**Environmental Hacks 2026 | Track: Heat and Water**

FloodLens is a geospatial environmental intelligence platform that combines **live Numerical Weather Prediction (NWP) rainfall forecasts** from Open-Meteo with **high-resolution Copernicus GLO-30 Digital Elevation Models (DEM)** and **D8 hydrological catchment routing** to deliver explainable, terrain-aware flood susceptibility assessments.

Rather than relying on synthetic fixtures, uncalibrated deep-learning black boxes, or fabricated scores, FloodLens enforces strict scientific honesty: candidate monitoring zones require validated elevation and catchment data to compute risk scores, and transparently declare `insufficient_data` when prerequisites are absent.

> **Scientific Disclaimer:** FloodLens computes a deterministic relative flood-susceptibility index (0–100). It is **not** an authoritative emergency warning system, nor does it predict calibrated flood probabilities, hydrodynamic water depths, or certified route safety. Always follow official disaster management authorities (e.g., NDMA/IMD).

---

## System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                             FLOODLENS SYSTEM                               │
└────────────────────────────────────────────────────────────────────────────┘
        │                                                     │
        ▼                                                     ▼
┌───────────────────────────────┐           ┌────────────────────────────────┐
│   METEOROLOGICAL INGESTION    │           │    REAL TERRAIN PROCESSING     │
│  Open-Meteo NWP Forecast API  │           │  Copernicus GLO-30 DSM (30m)   │
│  - Hourly precipitation (mm)  │           │  - Priority-Flood pit filling  │
│  - 72-hour forecast window    │           │  - Finite-difference slope (°) │
│  - Coordinate-based 15m cache │           │  - Local relief (100m radius)  │
│  - Strict unit sanitation     │           │  - D8 flow routing (acc cells) │
└───────────────────────────────┘           └────────────────────────────────┘
        │                                                     │
        └───────────────────────┬─────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────────┐
        │          FASTAPI RISK SCORING ENGINE          │
        │           POST /api/risk/estimate             │
        │                                               │
        │  Exploratory Weighted Susceptibility Index:   │
        │  R = 100 × ( 0.30 × v_rainfall               │
        │            + 0.25 × v_low_elevation          │
        │            + 0.20 × v_flow_accumulation      │
        │            + 0.15 × v_local_relief           │
        │            + 0.10 × v_slope )                │
        │                                               │
        │  * Insufficient data guardrails enforced      │
        │  * is_probability: false contract             │
        └───────────────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────────┐
        │            REACT 18 + TS FRONTEND             │
        │                                               │
        │  - MapLibre GL geospatial map (MapTiler/CARTO)│
        │  - Real-time weather intelligence visualizer  │
        │  - Exploratory rainfall scenario simulator    │
        │  - Factor explainability cards                │
        │  - Zero stale state on zone switching         │
        └───────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend** | Python / FastAPI / Uvicorn | Python 3.13 / FastAPI 0.115 | High-performance REST API |
| **Data Validation** | Pydantic V2 | 2.10+ | Schema enforcement, unit validation |
| **ML / Hydrology** | NumPy / SciPy / tifffile / imagecodecs | Latest | D8 routing, Priority-Flood, gradient slope |
| **Frontend** | React 18 / TypeScript / Vite | Vite 6 / React 18 | Client application |
| **Map Rendering** | MapLibre GL JS | 5.1+ | Vector / raster basemaps & spatial markers |
| **Weather Feed** | Open-Meteo Forecast API | Free Tier (Attribution) | 72-hour NWP precipitation forecasts |
| **Elevation Data** | Copernicus DEM GLO-30 | 2026 release (30m) | Real Digital Surface Model rasters |

---

## Data Dictionary

| Field | Source | Unit | Normalization Formula | Weight | Role in Risk Engine |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `rainfall_mm_per_hour` | Open-Meteo / Scenario | mm/hr | $\text{clip}(r / 115.0, 0, 1)$ | **0.30** | Atmospheric forcing; higher rate increases ponding and runoff volume. |
| `elevation_m` | Copernicus GLO-30 | m (EGM2008) | $\text{clip}((100.0 - z) / 100.0, 0, 1)$ | **0.25** | Lowland indicator; lower elevations (coastal/valleys) have higher ponding susceptibility. |
| `flow_accumulation` | D8 Flow Routing | cell count | $\text{clip}(A / 1000.0, 0, 1)$ | **0.20** | Upslope drainage area; higher contributing cell count indicates major drainage channels. |
| `local_relief_m` | Copernicus GLO-30 | m (100m window) | $\text{clip}((10.0 - \Delta z) / 10.0, 0, 1)$ | **0.15** | Terrain depression indicator; flatter local topography retains standing water. |
| `slope_deg` | Central Differences | degrees | $\text{clip}((30.0 - \theta) / 30.0, 0, 1)$ | **0.10** | Runoff velocity factor; gentle slopes impede gravitational drainage. |

---

## Pilot Zone: Uttar Pradesh Monitoring Zone

- **Zone ID:** `zone-uttar-pradesh`
- **Location:** Lucknow / Gomti River Floodplain, Uttar Pradesh, India
- **Coordinates:** `[80.9462, 26.8467]` (EPSG:4326)
- **DEM Tile:** `Copernicus_DSM_COG_10_N26_00_E080_00_DEM.tif`
- **Dataset Source:** European Space Agency (ESA) Copernicus Programme / AWS Open Data Copernicus DEM 30m
- **Vertical Datum:** EGM2008 geoid (meters)
- **Licence:** Copernicus Sentinel Data Terms / CC0 Public Domain
- **Extracted Metrics:**
  - Elevation: **112.66 m**
  - Slope: **6.42°**
  - Local Relief (100m radius): **11.59 m**
  - Flow Accumulation: **19.0 cells** (D8 catchment routing across 201×201 grid after Priority-Flood depression conditioning)
- **Baseline Risk Index:** **17.37 / 100** (Low Susceptibility under 35 mm/hr moderate rainfall)

*Other candidate zones (`zone-bihar`, `zone-punjab`, etc.) declare `insufficient_data` until corresponding DEM tiles are ingested.*

---

## Reproducible Setup & Execution

### 1. Prerequisites
- Python 3.13
- Node.js 20+ and npm

### 2. Environment Configuration
Copy `.env.example` in `frontend/`:
```bash
cd frontend
cp .env.example .env.local
```
Configure your public MapTiler key if desired:
```env
VITE_MAPTILER_API_KEY=your_key_here
VITE_API_BASE_URL=http://localhost:8000
```
*(If no MapTiler key is provided, FloodLens automatically falls back to CARTO basemaps).*

### 3. Backend Setup
```bash
# In repository root
py -3.13 -m pip install -r backend/requirements.txt
py -3.13 -m pip install -e ml-model
py -3.13 -m pip install imagecodecs
```

### 4. Terrain Data Acquisition & Pipeline
To reproduce the DEM download and feature extraction for the pilot zone:
```bash
# Run data pipeline to download Copernicus DEM and compute D8 features
py -3.13 -m floodlens_ml.data_pipeline --zone zone-uttar-pradesh
```
Outputs are deterministically saved to `ml-model/data/processed/pilot_uttar_pradesh_provenance.json`.

### 5. Running the Application Locally
In terminal 1 (FastAPI backend):
```bash
cd backend
py -3.13 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In terminal 2 (Vite frontend):
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## Automated Test Suites

```bash
# Backend unit & integration tests (21 tests)
py -3.13 -m pytest backend/tests

# ML package & terrain tests (48 tests)
py -3.13 -m pytest ml-model/tests

# Combined Python tests (69 tests)
py -3.13 -m pytest backend/tests ml-model/tests

# Frontend Vitest test suite (22 tests)
cd frontend && npm test

# Ruff code quality & formatting checks
py -3.13 -m ruff check backend ml-model
py -3.13 -m ruff format --check backend ml-model

# Frontend production build
cd frontend && npm run build
```

---

## API Endpoints

### 1. `GET /api/zones`
Returns the 10 candidate monitoring zones.
- `zone-uttar-pradesh` returns `data_status: "verified"` with real Copernicus provenance and bounding box.
- All other 9 zones return `data_status: "insufficient_data"` with empty sources.

### 2. `POST /api/risk/estimate`
Accepts `{"zone_id": str, "scenario_id": str, "rainfall_mm_per_hour": Optional[float]}`.
- For `zone-uttar-pradesh`: validates real terrain features and computes the deterministic 0–100 index with full factor breakdowns.
- For unverified zones: returns `risk_index: null`, `risk_category: "insufficient_data"`, and lists missing terrain inputs.
- Declares `is_probability: false`.

### 3. `GET /api/health`
Returns system health, version (`0.1.0`), and timestamp.

---

## Scientific Limitations

1. **Exploratory Heuristic Index:** The 0–100 score is a multi-criteria index, **not** an inundation depth forecast or calibrated flood probability.
2. **Subcatchment Boundary Effects:** Flow accumulation is routed within a local metric window (~6×6 km); regional river discharge from distant upstream mountains (Himalayas) is not modeled.
3. **Urban Infrastructure:** Drainage culverts, storm sewers, pumping stations, and soil infiltration capacities are not currently ingested.
4. **Meteorological Source:** Open-Meteo forecasts are NWP model runs, subject to forecast uncertainty.

---

## Attribution & Licenses
- **Copernicus DEM GLO-30:** © European Space Agency (ESA) & European Union. Distributed via AWS Open Data Registry.
- **Open-Meteo:** Meteorological forecast data under Open Database License (ODbL) / Creative Commons Attribution.
- **Map Data:** © OpenStreetMap contributors, MapTiler, CARTO.
