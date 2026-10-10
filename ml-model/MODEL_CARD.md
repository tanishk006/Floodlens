# FloodLens Baseline Model Card

## Model Details

- **Model Name:** FloodLens Relative Flood-Susceptibility Scoring Model
- **Model Version:** `0.1.0-baseline`
- **Release Date:** October 2026
- **Model Type:** Multi-Criteria Evaluation (MCE) / Rule-based geospatial index.
- **Scientific Clarification:** This is **NOT** a trained machine-learning model, and it is **NOT** a hydrodynamic flood simulation. It produces a deterministic 0–100 relative susceptibility index based on environmental indicators and user-defined rainfall scenarios.

---

## Intended Use & Boundaries

### Primary Intended Use
- Educational, exploratory, and decision-support prototype for visualizing relative flood susceptibility across monitored areas.
- Transparent exploration of how environmental factors (elevation, slope, flow accumulation) and exploratory rainfall scenarios interact to influence surface waterlogging potential.

### Out-of-Scope and Prohibited Uses
- **Official Emergency Warnings:** FloodLens is an experimental prototype and must **NOT** be used as an authoritative flood warning or evacuation alert system.
- **Life Safety & Structural Decisions:** Must not be used for emergency dispatch, flood-proof construction engineering, or municipal flood-plain zoning.
- **Financial Underwriting:** Must not be used for property valuation or insurance pricing.
- **Probability Claims:** The 0–100 score is **NOT** an event probability (e.g., a score of 70 does **NOT** mean a 70% chance of a flood occurring).
- **Water Depth Simulation:** The score is **NOT** a flood depth measurement.

---

## Model Architecture & Scoring Engine

The baseline pipeline computes a relative index in $[0.0, 100.0]$ as a weighted sum of normalized environmental factors:

$$\text{Index} = \min\left(100.0, \max\left(0.0, \sum_{i} w_i \times \text{norm}(x_i) \times 100.0\right)\right)$$

### Factor Weights and Normalization Bounds (Baseline Assumptions)

The baseline model implements the parameters defined in `config.yaml`. These parameters are explicitly marked as exploratory configuration assumptions, not scientifically calibrated or empirically validated parameters:

| Factor | Feature | Weight ($w_i$) | Normalization Range | Direction | Environmental Rationale |
|---|---|---|---|---|---|
| `low_elevation` | `elevation_m` | 0.25 | $[0.0, 100.0]\text{ m}$ | Inverted | Lower elevations (closer to base level) accumulate runoff. |
| `local_relief` | `local_relief_m` | 0.15 | $[0.0, 10.0]\text{ m}$ | Inverted | Flatter areas or depressions within a $100\text{ m}$ radius hinder natural drainage. |
| `slope` | `slope_deg` | 0.10 | $[0.0, 30.0]^\circ$ | Inverted | Gentle slopes ($< 2^\circ$) slow runoff velocity and increase ponding. |
| `flow_accumulation`| `flow_accumulation` | 0.20 | $[0.0, 1000.0]\text{ cells}$ | Direct | Higher upstream contributing area directs greater runoff volume. |
| `rainfall` | `rainfall_mm_per_hour` | 0.30 | $[0.0, 115.0]\text{ mm/hr}$ | Direct | Higher rainfall intensity increases surface runoff rates. |

*Weights sum strictly to $1.00$.*

### Threshold Categorization

- **Low:** $\le 25.0$
- **Moderate:** $25.0 < \text{score} \le 50.0$
- **High:** $50.0 < \text{score} \le 75.0$
- **Severe:** $> 75.0$
- **Insufficient Data:** Score is `null` when any required terrain indicator is unavailable.

---

## Data Provenance & Integrity

### Status of Candidate Monitoring Zones
The prototype identifies ten candidate monitoring zones in India:
1. Uttar Pradesh
2. Bihar
3. Punjab
4. Rajasthan
5. Assam
6. West Bengal
7. Haryana
8. Odisha
9. Andhra Pradesh
10. Gujarat

**Scientific Integrity Statement:**
- The million-hectare figures historically associated with these states have **not been verified** against an official government record and are **NOT** used as flood-risk scores, rankings, or labels.
- Because no validated digital elevation model (DEM), road network GeoJSON, or verified ground observations are currently connected, all ten candidate zones are strictly set to `data_status: "insufficient_data"`.
- When evaluated, candidate zones output `risk_index: null` and `risk_category: "insufficient_data"`, with full transparency regarding missing input features.

### Synthetic Fixtures
- Synthetic test fixtures are strictly used for test automation (`test_scoring.py`, `test_terrain.py`, etc.) and developer benchmark demonstration (`synthetic_benchmarks.json`).
- Synthetic outputs are marked `status: "illustrative"` and carry explicit warnings that they do not represent real-world Indian observations.

---

## Known Limitations

1. **Absence of Drainage Infrastructure:** The model does not incorporate urban drainage networks, stormwater canals, pumping stations, retention basins, or sewage capacity.
2. **No Soil / Infiltration Modeling:** Hydrologic soil group, infiltration capacity (Horton / Green-Ampt), and surface imperviousness are not modeled.
3. **No Fluvial / Riverine Dynamics:** Riverbank overtopping, levee breaches, and tidal backwater surges are not simulated.
4. **Scenario Assumptions:** Rainfall inputs represent static, exploratory intensity rates in mm/hour, not spatial radar observations or meteorological forecast ensembles.
5. **No Empirical Validation:** No confusion matrix, precision, recall, or calibration curves are reported because no documented flood observations are present in the repository.

---

## Data Sourcing Policy & Google Maps Platform Restrictions

To ensure strict legal, ethical, and scientific compliance:

1. **Google Maps Platform Prohibition:**
   - **Do not** use Google Maps, Google Maps Platform APIs, Google Maps imagery, Places results, Directions results, Elevation API outputs, or other Google Maps content as training, testing, validation, or feature-generation data for FloodLens.
   - **Do not** scrape or bulk-download Google Maps content, trace geographic features from Google Maps satellite imagery, or derive terrain models from Google Maps elevation values.
2. **Approved Independent Data Sources:**
   - **Terrain & Elevation:** NASA SRTM (Shuttle Radar Topography Mission) 30m DEM or other documented, openly licensed digital elevation models.
   - **Base Geography & Roads:** OpenStreetMap (OSM) under ODbL license.
   - **Meteorological Data:** Open meteorological observations from the India Meteorological Department (IMD) or accessible atmospheric datasets.
   - **Historical Waterlogging:** Verified municipal open datasets and civic engineering reports.
3. **Mapping Technology:**
   - MapLibre GL JS is used directly for client-side map rendering. Google Maps Platform content must not be mixed into the MapLibre map without verifying that the specific use is permitted by applicable terms.
4. **No Fabricated Training Labels:**
   - Reliable historical flood event labels are not currently connected; therefore, FloodLens maintains a transparent baseline rule-based susceptibility model. No artificial or hallucinated labels are used to train an ML model.
