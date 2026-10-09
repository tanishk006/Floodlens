# FloodLens

### Street-Level Flood Risk Intelligence & Decision Support

**Environmental Hacks 2026 | Track: Heat and Water**

FloodLens is an experimental prototype for exploring estimated street-level flood exposure. The project aims to use rainfall, terrain, historical waterlogging information where available, and geospatial analysis to help people understand local conditions. The presence of a data type in this description does not mean a live or verified source is connected.

Rather than simply displaying flood-prone regions, FloodLens focuses on **where flooding may occur, why a location may be at risk, and how route options compare by estimated exposure.**

> **Project status:** Hackathon prototype in development.

---

## Problem Statement

Urban flooding and waterlogging can disrupt transportation, damage property, and put people's safety at risk. Existing weather applications may communicate rainfall intensity or general flood warnings without providing sufficiently granular, street-level information.

People need accessible tools that help them understand local flood risks and make better decisions before and during heavy rainfall.

### Our Solution

FloodLens aims to provide an interactive platform that:

* Identifies potentially flood-prone street segments.
* Visualizes flood-risk levels on an interactive map.
* Explains the environmental factors contributing to a location's risk.
* Simulates how different rainfall scenarios may affect risk levels.
* Compares alternative routes using estimated flood exposure.
* Uses AWS services to support data storage and risk-analysis APIs.

## Key Features

### 1. Interactive Flood-Risk Map

Visualize locations using color-coded risk categories to understand how flood risk varies geographically.

### 2. Explainable Risk Assessment

Show the factors contributing to each risk estimate, such as rainfall intensity, elevation, terrain and historical waterlogging records where available.

### 3. Rainfall Scenario Simulator

Explore how risk scores change under different rainfall assumptions.

### 4. Route Comparison

Compare alternative routes using estimated flood exposure alongside route distance. Describe options only as having **lower estimated exposure** or **higher estimated exposure**; these comparisons are experimental and do not establish that a route is safe or accessible.

### 5. Location-Based Insights

Select a locality or street segment to inspect its estimated risk and contributing factors.

### 6. AI/ML-Assisted Risk Modelling

Begin with a transparent baseline risk-scoring method. Where suitable labelled historical data is available, evaluate a machine-learning model to estimate flood risk.

## How It Works

1. **Data collection:** Gather available rainfall, elevation, geographic and historical waterlogging data.
2. **Data processing:** Clean and standardize the datasets and associate relevant features with geographic locations.
3. **Risk estimation:** Calculate an initial risk score using available environmental indicators.
4. **Model development:** Train and evaluate an ML model if sufficient reliable labelled data is available.
5. **Visualization:** Display estimated risk levels and their contributing factors on an interactive map.
6. **Decision support:** Compare locations and potential routes to help users make more informed decisions.

The quality of risk estimates depends on data coverage, resolution, freshness and model validation. FloodLens does not claim to provide authoritative emergency warnings.

## System Architecture

```text
Environmental Data Sources
          |
          v
Data Processing & Geospatial Analysis
          |
          v
Flood-Risk Scoring / ML Model
          |
          v
AWS API Layer
(API Gateway + Lambda)
          |
          v
React Web Application
          |
          v
Interactive Risk Map
Risk Explanations
Rainfall Scenarios
Route Comparison
```

Amazon S3 can be used to store input datasets and generated risk-analysis outputs.

## Technology Stack

| Component             | Technology                                             |
| --------------------- | ------------------------------------------------------ |
| Frontend              | Vite, React 18, TypeScript (strict)                    |
| Styling               | Tailwind CSS                                           |
| Interactive maps      | MapLibre GL JS (direct use)                            |
| Backend               | Not implemented                                        |
| Risk data and model   | Placeholder data; no model or source connected        |
| Cloud services        | Not connected                                          |
| Frontend deployment   | Not configured                                         |

The architecture below describes potential future work, not connected services.

## Frontend Design and Interaction

The frontend follows a restrained survey-map visual style. Use the following design tokens through Tailwind configuration rather than hardcoding colors in components.

| Token | Value |
| ----- | ----- |
| paper | `#F4F1EA` |
| ink | `#1B1F23` |
| muted | `#55595E` |
| rule | `#C9C3B6` |
| accent | `#0F5C63` |
| risk low / moderate / high / severe | `#7A9E7E` / `#D9B44A` / `#D9772B` / `#A3262A` |
| water depth steps | `#A9CBC7`, `#6FA5A3`, `#3C7F82`, `#0F5C63` |

Use Source Serif 4 for headings and the wordmark, IBM Plex Sans for interface text, and IBM Plex Mono with tabular numerals for every number. Load these fonts from `index.html`; use the Tailwind names `font-display`, `font-ui`, and `font-data` without overriding `font-sans`, `font-serif`, or `font-mono`.

Keep corner radii at 2px or less. Do not use shadows, gradients, blur, icons, pill badges, or hover animations other than a color change. Use sentence-case labels, at least 12px for labels and 13px for body text, whitespace and single hairline dividers. Reserve full borders for the inspector and route table. Keep contrast at least 4.5:1 for muted text on paper.

Use plain, short English and hedge explanations with words such as “likely” and “estimated.” The interface must persistently display **“Experimental estimate. Not an official warning.”** Identify any placeholder content visibly as **“Placeholder data”** and never describe it as measured, real-time, or official. Clearly distinguish estimates and simulations from observations, and do not invent agency names, sensor feeds, or IDs.

Use direct MapLibre GL JS integration, not a React map wrapper. Clean up map effects fully so React StrictMode does not create duplicate map sources or layers, and report errors from every fetch and MapLibre `error` event. Use real buttons, visible keyboard focus, `aria-label` where needed, and `aria-live` for scenario changes. Respect `prefers-reduced-motion`.

## Planned AWS Integration

AWS may support future data-processing and API infrastructure. No AWS service is currently connected.

* **Amazon S3:** Store environmental datasets, processed geographic data and generated risk layers.
* **AWS Lambda:** Execute lightweight risk-analysis or data-processing functions.
* **Amazon API Gateway:** Expose risk-analysis functionality through HTTP API endpoints.
* **AWS Amplify:** Optionally host and deploy the React frontend.

Only the services actually integrated into the final implementation will be listed as completed components.

## Data Sources

Potential sources to investigate include:

* **Rainfall:** India Meteorological Department (IMD) and other accessible meteorological datasets.
* **Elevation:** NASA SRTM or other suitable digital elevation models.
* **Geographic data:** OpenStreetMap.
* **Historical flooding:** Publicly available municipal reports, open datasets and documented waterlogging records.

Dataset availability, licensing, spatial resolution and suitability must be verified before use. Listing a potential source does not mean FloodLens is connected to it. Distinguish measured observations from simulated scenarios and model-generated estimates in the interface.

## Getting Started

The frontend scaffold is in the `frontend/` directory. It uses placeholder map geometry and route labels; it has no backend, live data source, or risk model.

### Prerequisites

* Node.js and npm

### Run the frontend

```bash
git clone <YOUR_PUBLIC_REPOSITORY_URL>
cd FloodLens
cd frontend
npm install
npm run dev
```

The development server prints the local URL after it starts. Backend and AWS setup instructions will be added if those services are implemented.

## Development Roadmap

* [ ] Select a target locality and validate data availability.
* [ ] Collect and preprocess rainfall and geographic datasets.
* [ ] Build the initial geospatial risk-scoring engine.
* [ ] Develop the interactive flood-risk map.
* [ ] Add location-based risk explanations.
* [ ] Implement rainfall scenario simulation.
* [ ] Evaluate an ML model if suitable historical labels are available.
* [ ] Add route comparison using a routing engine and estimated exposure.
* [ ] Integrate AWS storage and API services.
* [ ] Test the application and document limitations.
* [ ] Record the hackathon demo and complete submission requirements.

## Evaluation Strategy

FloodLens will be evaluated on both technical quality and practical usefulness.

* **Model performance:** Precision, recall, F1-score and appropriate calibration metrics, where labelled data supports evaluation.
* **Geospatial quality:** Coverage and consistency of geographic data.
* **Explainability:** Whether users can understand the main factors behind a risk estimate.
* **Usability:** Whether users can quickly identify locations of concern and compare alternatives.
* **Reliability:** Handling of missing data, API failures and unsupported locations.

Evaluation results will be reported only after testing. Simulated data will not be presented as real-world validation.

## Limitations and Safety

FloodLens is an experimental decision-support prototype, not a certified flood forecasting or emergency-response system.

* Estimates may be inaccurate when source data is incomplete or outdated.
* A risk score does not guarantee that flooding will or will not occur.
* Route exposure estimates cannot establish that a road is safe or accessible.
* Users should follow official weather alerts, local authority instructions and emergency guidance.

## Potential Impact

FloodLens aims to make environmental information more understandable and actionable for urban residents, commuters and local communities. Its approach could also support exploratory flood-risk assessments by civic groups and urban planners.

## Built For

**Environmental Hacks 2026 — Heat and Water Track**

Developed as a solo hackathon project exploring the use of AI/ML, geospatial analysis and AWS to address urban flooding challenges.

## License

A license has not yet been selected. Add an appropriate open-source license before distributing the project for reuse.

---

**Experimental estimate. Not an official warning.** FloodLens is a prototype. Its outputs are estimates for exploration and must not replace official flood warnings or emergency instructions.
