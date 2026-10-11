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

## Verified Monitoring Zones & Terrain Coverage

All 10 candidate monitoring zones across India are backed by genuine **Copernicus DEM GLO-30** Digital Surface Model tiles downloaded from AWS Open Data, conditioned with **Priority-Flood depression filling** ([Barnes et al., 2014](https://doi.org/10.1016/j.cageo.2013.04.024)), and routed via **D8 steepest-descent flow direction**:

| Zone ID | Locality / Basin | Coordinates | DEM Tile | Elevation | Slope | Local Relief | D8 Flow Acc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `zone-uttar-pradesh` | Lucknow / Gomti Floodplain | 26.8467°N, 80.9462°E | `N26_00_E080_00` | 112.66 m | 6.42° | 11.59 m | 19 cells |
| `zone-bihar` | Patna / Ganga Basin | 25.5941°N, 85.1376°E | `N25_00_E085_00` | 55.85 m | 1.42° | 7.28 m | 1 cell |
| `zone-punjab` | Ludhiana / Sutlej Basin | 30.9010°N, 75.8573°E | `N30_00_E075_00` | 221.23 m | 0.75° | 2.94 m | 2 cells |
| `zone-rajasthan` | Jaipur / Dravyavati Catchment | 26.9124°N, 75.7873°E | `N26_00_E075_00` | 430.51 m | 4.69° | 8.55 m | 2 cells |
| `zone-assam` | Guwahati / Brahmaputra Basin | 26.1445°N, 91.7362°E | `N26_00_E091_00` | 96.40 m | 8.42° | 22.57 m | 1 cell |
| `zone-west-bengal` | Kolkata / Hooghly Tidal Floodplain | 22.5726°N, 88.3639°E | `N22_00_E088_00` | 12.33 m | 3.54° | 5.56 m | 1 cell |
| `zone-haryana` | Gurugram / Najafgarh Drain Basin | 28.4595°N, 77.0266°E | `N28_00_E077_00` | 217.62 m | 0.66° | 2.13 m | 2 cells |
| `zone-odisha` | Bhubaneswar / Mahanadi Delta | 20.2961°N, 85.8245°E | `N20_00_E085_00` | 43.95 m | 5.55° | 7.76 m | 2 cells |
| `zone-andhra-pradesh` | Vijayawada / Krishna Floodplain | 16.5062°N, 80.6480°E | `N16_00_E080_00` | 21.12 m | 1.43° | 64.91 m | 8 cells |
| `zone-gujarat` | Ahmedabad / Sabarmati Basin | 23.0225°N, 72.5714°E | `N23_00_E072_00` | 50.24 m | 0.71° | 11.48 m | 3 cells |

Each zone's complete provenance record is stored in `ml-model/data/processed/zone-<id>_provenance.json` with tile source URLs, horizontal bounds, CRS (`EPSG:4326`), vertical datum (`EGM2008`), and SHA-256 verification. If a new or unverified zone is queried without terrain data, the system transparently reports `data_status: "insufficient_data"` and withholds risk scores.

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
To reproduce DEM acquisition and feature extraction:
```bash
# Process a single zone
py -3.13 -m floodlens_ml.data_pipeline --zone zone-uttar-pradesh

# Or download and process all 10 candidate zones idempotently
py -3.13 -m floodlens_ml.data_pipeline --all
```
Outputs are deterministically saved to `ml-model/data/processed/zone-<id>_provenance.json` (and `pilot_uttar_pradesh_provenance.json`).

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
# Combined Python test suite (71 passing tests)
py -3.13 -m pytest backend/tests ml-model/tests

# Ruff code quality and format validation
py -3.13 -m ruff check backend ml-model
py -3.13 -m ruff format --check backend ml-model

# Frontend Vitest test suite (23 passing tests)
cd frontend && npm test

# Frontend production build
cd frontend && npm run build
```

---

## API Endpoints

### 1. `GET /api/zones`
Returns the 10 candidate monitoring zones.
- All 10 zones return `data_status: "verified"` with real Copernicus provenance, coordinates, and bounding boxes.
- Any unconfigured candidate zones declare `data_status: "insufficient_data"`.

### 2. `POST /api/risk/estimate`
Accepts `{"zone_id": str, "scenario_id": str, "rainfall_mm_per_hour": Optional[float]}`.
- For verified zones: evaluates real terrain features and computes the deterministic 0–100 index with full factor breakdowns.
- For unverified zones or missing inputs: returns `risk_index: null`, `risk_category: "insufficient_data"`, and lists missing terrain inputs.
- Always declares `is_probability: false`.

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
