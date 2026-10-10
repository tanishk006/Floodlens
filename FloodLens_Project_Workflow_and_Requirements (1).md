# FloodLens — Project Workflow, Phases, Features & Requirements

**Event:** Environmental Hacks 2026  
**Track:** Heat and Water  
**Project type:** Solo, AI/ML + full-stack  
**Planning date:** 11 October 2026  
**Submission target:** 8:00 AM IST  
**Status at planning:** Existing frontend, backend and ML directories are scaffolds. No real risk model, connected data source, frontend/backend integration, or AWS integration has been implemented yet.

---

## 1. Product definition

### One-line description
FloodLens is an experimental flood-risk intelligence prototype that combines geospatial terrain indicators and rainfall scenarios to visualize relative flood susceptibility across selected areas of India.

### Product vision
The home screen shows an interactive map of India with 10 flagged candidate monitoring zones. Hovering over a flag reveals a compact zone summary. Clicking a flag zooms into the selected area and opens a 3D terrain/risk demonstration. Users can change rainfall scenarios and inspect how the model's estimated relative risk changes.

### Problem
City-wide weather information often does not tell people which locations may be more exposed to waterlogging or why. FloodLens aims to make available geographic and environmental information easier to inspect and compare.

### Primary users
- Residents and commuters exploring possible flood exposure.
- Civic groups and students inspecting geographic risk indicators.
- Hackathon judges evaluating a working, explainable environmental prototype.

### Important product boundary
FloodLens is an experimental decision-support prototype, not an official warning system. A relative risk score is not a probability of flooding, a measured water depth, or proof that a road is safe. Do not claim measured model accuracy without evaluation on suitable labelled data.

---

## 2. Existing implementation baseline

### Frontend (`frontend/`)
- Vite, React 18, strict TypeScript, Tailwind CSS and direct MapLibre GL JS integration.
- Existing visual scaffold, scenario controls, map component and placeholder route rows.
- Current geometry is illustrative and centred near `[0, 0]`.
- No data contract, API client, real locality, route calculation or connected backend.
- Production build succeeds; JavaScript bundle is larger than Vite's advisory threshold.

### Backend (`backend/`)
- FastAPI scaffold, environment-backed settings, typed error schemas and `GET /api/health`.
- Existing tests and Ruff checks pass.
- No model, risk endpoint, data store or AWS integration.

### ML (`ml-model/`)
- YAML configuration and CLI scaffold only.
- No locality, bounding box, projected CRS, DEM, labels, scoring pipeline, trained model or export.
- Existing configuration includes unvalidated assumptions for weights, thresholds and rainfall scenarios. These are not model results.

### Implication
Implement one small end-to-end path first. Do not expand all three folders independently. The model export schema must be agreed before backend and frontend integration.

---

## 3. Scope decision for the deadline

A scientifically validated, street-level flood forecast and physically accurate 3D inundation simulation are not feasible to build and validate in a few overnight hours without prepared data.

### Minimum viable submission (must finish)
1. A working, clearly labelled India map with 10 selectable candidate zones.
2. Hover cards showing zone name, data status and available model output.
3. Clicking a zone zooms into a specific geographic area.
4. A working baseline risk-scoring pipeline that runs deterministically on documented input features.
5. A rainfall-scenario control that actually recalculates the score.
6. A FastAPI risk endpoint consumed by the frontend.
7. A 3D terrain-style visualization or extruded risk layer that is explicitly labelled as a scenario visualization, not a physically validated flood-depth simulation.
8. Clear provenance, limitations, setup instructions, tests, and a demo video.
9. At least one genuine AWS integration if required for prize eligibility; verify that it works and describe only what is implemented.

### Stretch features (only after MVP passes)
- Trained ML model using appropriate, documented historical flood labels.
- Real-time rainfall feed.
- Street-level road-network risk scoring.
- Routing engine and alternate-route exposure comparison.
- Physically based inundation modelling and water-depth estimates.
- User accounts, alerts, dashboards, and multi-user functionality.

---

## 4. Candidate monitoring zones

The supplied image lists these states with values under a “Million Hect.” heading:
1. Uttar Pradesh — 7.34
2. Bihar — 4.26
3. Punjab — 3.70
4. Rajasthan — 3.26
5. Assam — 3.15
6. West Bengal — 2.65
7. Haryana — 2.35
8. Odisha — 1.40
9. Andhra Pradesh — 1.39
10. Gujarat — 0.87

**Do not treat these values as flood-risk scores or the states as the ten most flood-prone states until the original source and meaning of the values are verified.** For the prototype, these can be shown as *candidate monitoring zones* if the team cannot validate the ranking before submission. Do not put the million-hectare figures in a flood-risk field.

Each zone record should contain:
- Stable zone ID.
- State name.
- Display label.
- Latitude/longitude for the initial map marker.
- Geographic area of interest (AOI), if selected.
- Data provenance and data date.
- Status: `verified`, `illustrative`, or `insufficient_data`.
- Relative risk score and category only when the scoring inputs exist.
- Contributing factors and missing-data notes.

Avoid inventing exact city locations or claiming a zone-level result if the AOI and input data have not been configured. If reliable data for all ten zones is unavailable, keep the 10 markers as candidate zones and clearly mark their risk as unavailable rather than fabricating results.

---

## 5. End-to-end workflow

```text
Documented geographic and environmental inputs
        |
        v
Input validation + provenance checks
        |
        v
Geospatial feature preparation
        |
        v
Baseline relative-risk scoring
        |
        +---- Optional: train/evaluate ML model if labelled data exists
        |
        v
Deterministic model output JSON/GeoJSON
        |
        v
FastAPI risk/scenario endpoint
        |
        v
React + MapLibre India map
        |
        +---- Hover flag: zone summary
        |
        +---- Click flag: zoom to AOI
        |
        +---- Scenario selector: request recalculated score
        |
        +---- 3D-style terrain/risk visualization
        |
        v
Tests, limitations, AWS integration, documentation and submission
```

### Core request flow
1. Frontend loads the list of zones and their status.
2. User hovers over a flag to see a summary.
3. User clicks a flag and the map zooms to that zone's configured AOI.
4. Frontend requests the selected zone and rainfall scenario from the API.
5. Backend validates the request and calls the scoring service.
6. The scoring service returns a relative index, category, factors, scenario and data-quality warnings.
7. Frontend updates the selected-zone panel and visualization.
8. Missing or failed data is shown explicitly; no silent fallback to fake observations.

---

## 6. Phased implementation plan

The phases are ordered as requested: model first, backend second, frontend third. Because the deadline is extremely short, use strict time boxes and stop adding features when the minimum end-to-end path is working.

### Phase 0 — Freeze scope and define the contract
**Time box: 15 minutes**

Tasks:
- Keep the current repository structure.
- Decide the prototype's target AOI(s) and whether each zone is verified or illustrative.
- Verify the meaning/source of the supplied state table if possible.
- Define one canonical JSON schema for zones, risk results, scenarios and warnings.
- Make the model output deterministic for identical inputs.
- Keep all assumptions in config and attach provenance to outputs.

Exit criteria:
- One agreed contract used by ML, backend and frontend.
- No claim that placeholder information is observed data.

### Phase 1 — Build the baseline risk model
**Time box: 60–90 minutes**

Priority: first real computation.

Tasks:
1. Implement input loading and strict validation.
2. Require a configured AOI and coordinate reference system before geospatial processing.
3. Load a real, documented DEM only if one is already available and suitable.
4. Derive available terrain features such as elevation, slope, local relief or flow accumulation only when the input resolution supports them.
5. Accept a rainfall scenario as an explicit input.
6. Normalize available features using documented, defensible bounds.
7. Calculate a transparent 0–100 **relative susceptibility index**, not a flood probability.
8. Return factor contributions, missing inputs, data source/date and warnings.
9. If no suitable real DEM or reliable data is available, implement and test the scoring function with clearly labelled synthetic fixtures. Do not present those fixtures as real geographic outputs.
10. Do not train an ML model unless there are suitable labelled historical examples and enough time to evaluate leakage and performance.

Suggested module boundaries:
- `io.py`: load and validate inputs.
- `terrain.py`: terrain features when a DEM is available.
- `scoring.py`: deterministic baseline index.
- `schemas.py`: shared model input/output schema.
- `export.py`: export validated JSON/GeoJSON.
- `predict.py`: command-line entry point.

Exit criteria:
- One command runs the implemented pipeline or fails with a precise missing-input explanation.
- Tests cover valid input, invalid input, missing data, score bounds, scenario sensitivity and repeatability.
- No unsupported accuracy or probability claims.

### Phase 2 — Implement the backend
**Time box: 45–60 minutes**

Tasks:
1. Preserve the existing FastAPI app factory, settings, typed errors and health endpoint.
2. Add a zones endpoint, for example `GET /api/zones`.
3. Add a risk endpoint, for example `POST /api/risk/estimate`.
4. Validate zone ID and supported rainfall scenario.
5. Call the scoring service rather than duplicating model logic in the route handler.
6. Return the same schema used by the model export.
7. Return typed states for invalid input, outside coverage, insufficient data and unavailable data.
8. Add CORS for the local frontend origin.
9. Add tests for success, invalid scenario, missing zone, insufficient data and service failure.

Example API contract:

`GET /api/health`
```json
{
  "status": "ok",
  "service": "floodlens-api",
  "environment": "development"
}
```

`GET /api/zones`
```json
{
  "zones": [
    {
      "id": "zone-example",
      "name": "Example zone",
      "state": "Example state",
      "coordinates": [77.0, 28.0],
      "data_status": "illustrative"
    }
  ]
}
```

`POST /api/risk/estimate`
```json
{
  "zone_id": "zone-example",
  "rainfall_mm_per_hour": 35
}
```

Illustrative response shape only:
```json
{
  "zone_id": "zone-example",
  "scenario": {
    "rainfall_mm_per_hour": 35
  },
  "risk": {
    "index": null,
    "category": "insufficient_data",
    "is_probability": false
  },
  "factors": [],
  "data_quality": {
    "status": "insufficient_data",
    "missing_inputs": ["documented AOI and valid input features"]
  },
  "limitations": [
    "Experimental estimate. Not an official warning."
  ]
}
```

Replace example values with actual validated data. Do not return an invented score merely to make the UI look populated.

Exit criteria:
- API starts locally.
- Health, zones and risk endpoints have tests.
- Frontend can call the API and handles errors.

### Phase 3 — Implement the frontend
**Time box: 90 minutes**

Tasks:
1. Replace the `[0, 0]` placeholder map with an India-centred view.
2. Render 10 flag-style markers from the zone data contract.
3. On hover/focus, show a compact zone card with state, status, available score and data date.
4. On click/keyboard activation, select the zone and animate or ease the map to its configured AOI.
5. Add a selected-zone inspector with risk category, index, contributing factors and limitations.
6. Add rainfall scenario controls wired to the API.
7. Update the visualization only from returned outputs; show loading, empty and error states.
8. Implement a 3D-style view using an available terrain/3D-capable map layer or a simple extruded terrain/risk visualization. Do not attempt to build a complete fluid simulation overnight.
9. Clearly label scenario visuals as simulated/illustrative when they are not computed from a validated inundation model.
10. Preserve keyboard accessibility, visible focus, `aria-live` updates and reduced-motion support.
11. Keep the persistent message: **“Experimental estimate. Not an official warning.”**
12. Remove or visibly label all placeholder route rows and sample geometry.

Exit criteria:
- India map loads and shows 10 selectable candidate markers.
- Hover and click behavior works.
- Selecting a zone and changing rainfall triggers a real API request.
- The selected-zone details match the API response.
- No fabricated risk output is shown as verified data.

### Phase 4 — AWS integration
**Time box: 30–45 minutes**

The official event rules must be checked for the exact AWS eligibility requirement. A dependency in `requirements.txt` is not an integration.

Recommended smallest genuine integration:
- Use Amazon S3 to store a documented, non-sensitive zone dataset or generated output.
- Add a small script or service that uploads and reads the artifact from S3 using environment-based AWS configuration.
- Test the storage path with a real AWS account if credentials and permissions are already available.
- Never commit access keys or secrets.
- If Lambda + API Gateway is already configured, use it; otherwise do not waste the deadline inventing infrastructure.
- Document exactly which service is connected and what it does.

Exit criteria:
- The integrated service can be demonstrated or its actual deployed configuration can be verified.
- If not connected, document it as planned, not completed.

### Phase 5 — Integration, testing and submission
**Time box: final 60–90 minutes; protect this time**

Tasks:
- Run model tests and lint.
- Run backend tests and lint.
- Run frontend production build.
- Start backend and frontend and test the complete user flow.
- Check that map initialization does not create duplicate layers under React StrictMode.
- Test unavailable-data, API error and unsupported-zone states.
- Confirm zone markers are geographically sensible and no source attribution is missing.
- Verify all external datasets' licences and provenance.
- Update README and add a model card/limitations section.
- Record a demo video of up to three minutes.
- Submit the public GitHub repository, YouTube demo and write-up before the deadline.

**Hard stop:** Stop feature development early enough to test, record and submit. A working small prototype is better than a broken collection of ambitious features.

---

## 7. Feature list and priorities

Priority definitions:
- **P0 — required for a coherent submission**
- **P1 — add if the core flow is stable**
- **P2 — future/stretch work**

| Feature | Priority | Acceptance criteria |
|---|---|---|
| India map view | P0 | Map opens at a useful India-wide extent |
| Ten flag markers | P0 | Ten candidate zones are visible and selectable; no unsupported flood ranking |
| Hover/focus zone card | P0 | Shows zone name, data status, available output and provenance |
| Click-to-zoom | P0 | Selecting a marker moves to its configured AOI |
| Baseline risk scoring | P0 | Deterministic, bounded, documented index using explicit inputs |
| Rainfall scenarios | P0 | Scenario change changes the API request and recalculates the index |
| FastAPI integration | P0 | Frontend reads zones and risk outputs from backend |
| Risk explanation | P0 | Shows factors used and clearly notes missing inputs |
| 3D-style selected-zone view | P0 | Shows terrain/risk representation; clearly distinguishes estimate from actual flood depth |
| Data provenance | P0 | Source, date, licence and limitations are documented |
| Loading/error states | P0 | Missing data and failed API requests are visible |
| Public GitHub README | P0 | Install/run/test steps and limitations are accurate |
| Demo video | P0 | Up to three minutes; demonstrates the working path |
| Real AWS service | P0 for AWS eligibility | One service is genuinely integrated and documented |
| Trained ML classifier | P1 | Only if reliable labels and a defensible evaluation split exist |
| Route comparison | P1 | Requires road graph/routing engine and risk estimates along routes |
| Real-time rainfall | P2 | Requires a verified feed, freshness handling and provider terms |
| Physical water-depth simulation | P2 | Requires hydrologic/hydraulic inputs and validation |
| Accounts and notifications | P2 | Not needed for this solo prototype |

---

## 8. Technical stack

### Keep the existing stack
- **Frontend:** Vite, React 18, strict TypeScript.
- **Styling:** Tailwind CSS and existing survey-map tokens.
- **Map:** Direct MapLibre GL JS integration.
- **Backend:** FastAPI, Pydantic v2, Uvicorn.
- **ML/data:** Python, NumPy, pandas, GeoPandas, Shapely, Rasterio and scikit-learn where needed.
- **Tests/lint:** pytest and Ruff for Python; TypeScript build and targeted UI checks.
- **AWS:** Amazon S3 as the smallest storage integration; Lambda/API Gateway only if time and deployment access permit.

Do not add a database unless the prototype actually needs one. Static, documented GeoJSON plus a small API is sufficient for a single-user hackathon demo.

### 3D visualization recommendation
Prioritize a convincing, truthful visualization over a physics engine:
1. India-wide 2D MapLibre view with markers.
2. Click marker to zoom to the AOI.
3. A selected-zone terrain view with relative risk colors or extruded polygons.
4. Rainfall scenario selector requests a new score.
5. A small legend explicitly says “relative risk index” and “scenario visualization—not predicted flood depth” unless depth has been computed and validated by a proper inundation model.

MapLibre's terrain/3D capabilities depend on having suitable elevation tiles or a prepared DEM. If none is available, use a clearly labelled 3D-style representation rather than pretending terrain data exists.

---

## 9. Shared data contract

Keep the model, API and frontend consistent. Suggested zone record:

```json
{
  "id": "stable-zone-id",
  "name": "Display name",
  "state": "State name",
  "coordinates": [longitude, latitude],
  "aoi_bbox": [west, south, east, north],
  "data_status": "verified",
  "sources": [
    {
      "name": "Dataset name",
      "url": "https://example.org/dataset",
      "accessed_at": "2026-10-11",
      "licence": "Dataset licence",
      "role": "elevation"
    }
  ]
}
```

Suggested risk response:
- `zone_id`
- `scenario` including rainfall assumption and units
- `risk.index` (0–100 only when computed from valid inputs)
- `risk.category`
- `risk.is_probability: false`
- `factors`: feature name, normalized value, contribution and availability
- `data_quality.status`
- `data_quality.missing_inputs`
- `model_version`
- `generated_at`
- `limitations`

Coordinates are `[longitude, latitude]` for GeoJSON/MapLibre. Use a documented schema validator and reject malformed records.

---

## 10. Model methodology

### Baseline first
A transparent baseline is the correct starting point because no labelled dataset or DEM is currently present in the repository.

Potential indicators, only when valid data exists:
- Rainfall scenario intensity.
- Relative elevation.
- Slope.
- Local relief.
- Flow accumulation or drainage proximity.
- Historical waterlogging observations, if documented.

Do not use a factor simply because it appears in the configuration. It must be calculated from a real input or explicitly marked unavailable.

### Score semantics
- A 0–100 score is a **relative index**, not a probability.
- Risk bands are presentation thresholds, not calibrated event probabilities.
- Missing inputs should lower confidence/data completeness or return `insufficient_data`; they should not be silently replaced by invented values.
- A rainfall scenario is a user-specified scenario, not a weather forecast.
- Scenario sensitivity should be tested. Do not guarantee that every rainfall change has a physically correct effect unless the model supports that conclusion.

### ML model gate
Only train a classifier if suitable labelled historical examples exist. Use spatially separated evaluation where possible; random splits can overstate generalization across nearby locations. Report metrics only after running evaluation. If there are no reliable labels, describe the baseline as rule-based/geospatial scoring, not machine learning.

---

## 11. Testing and acceptance checklist

### Model
- [ ] Config rejects unset or invalid AOI settings.
- [ ] Input loader rejects missing/corrupt data with a useful error.
- [ ] Score stays within its defined range.
- [ ] Identical inputs produce identical outputs.
- [ ] Scenario changes are handled deterministically.
- [ ] Missing factors are exposed rather than hidden.
- [ ] Synthetic fixtures are never labelled as observations.

### Backend
- [ ] Health endpoint works.
- [ ] Zones endpoint returns schema-valid records.
- [ ] Risk endpoint calls the model service.
- [ ] Invalid zone/scenario produces typed errors.
- [ ] Insufficient data is returned as a clear state.
- [ ] Internal stack traces/secrets are not sent to clients.
- [ ] CORS is configured for the frontend.

### Frontend
- [ ] India map loads.
- [ ] Ten markers are visible and keyboard accessible.
- [ ] Hover and focus reveal zone details.
- [ ] Click selects and zooms to the zone.
- [ ] Scenario control calls the API.
- [ ] Displayed score/factors match the API response.
- [ ] Loading, empty, network-error and insufficient-data states work.
- [ ] Persistent warning is visible.
- [ ] Placeholder and simulated content are labelled.
- [ ] React StrictMode does not duplicate map resources.

### Submission
- [ ] Public GitHub repository.
- [ ] README has setup, run and test instructions.
- [ ] Model methodology, data provenance and limitations documented.
- [ ] AWS integration described truthfully.
- [ ] Third-party assets/data are credited.
- [ ] AI coding tools used are disclosed if required by the event.
- [ ] YouTube demo is no longer than three minutes.
- [ ] Submission form completed before 8:00 AM IST.

---

## 12. Demo storyline (up to three minutes)

1. **0:00–0:20 — Problem:** Explain why broad rainfall information is not enough for local decisions.
2. **0:20–0:45 — India map:** Show ten candidate zones and hover for a zone summary.
3. **0:45–1:10 — Zoom:** Select one configured zone and open its local terrain/risk view.
4. **1:10–1:40 — Model:** Change the rainfall scenario and show the API-returned relative index and contributing factors.
5. **1:40–2:10 — Explainability:** Show data provenance, missing inputs and what the index does/does not mean.
6. **2:10–2:35 — AWS:** Demonstrate the real integrated AWS service.
7. **2:35–3:00 — Impact and limitations:** Explain the intended use and state clearly that this is an experimental prototype, not an official warning.

Only demonstrate features that work in the submitted build. If a stage is illustrative, say so during the demo.

---

## 13. Final implementation order

1. Freeze the schema and target zones.
2. Implement and test the baseline model.
3. Export validated outputs.
4. Implement FastAPI endpoints and tests.
5. Connect the frontend to the API.
6. Add the India map, hover flags, click-to-zoom and selected-zone visualization.
7. Add one genuine AWS integration.
8. Test the full flow, update documentation, record video and submit.

**Do not begin route optimization, a trained ML model, real-time ingestion, or physical flood simulation until the end-to-end MVP works.**

**Persistent UI disclaimer:** “Experimental estimate. Not an official warning.”
