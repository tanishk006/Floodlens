# 🌧️ FloodLens

### Street-Level Flood Risk Intelligence & Decision Support

**Environmental Hacks 2026 | Track: Heat and Water**

FloodLens is an AI-assisted flood-risk intelligence platform designed to help people identify potentially flood-prone streets during heavy rainfall. By combining rainfall data, terrain characteristics, historical waterlogging information, and geospatial analysis, FloodLens aims to transform environmental data into actionable insights.

Rather than simply displaying flood-prone regions, FloodLens focuses on **where flooding may occur, why a location is at risk, and which alternative routes may be safer.**

> **Project status:** Hackathon prototype in development.

---

## 🌍 Problem Statement

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

## ✨ Key Features

### 1. Interactive Flood-Risk Map

Visualize locations using color-coded risk categories to understand how flood risk varies geographically.

### 2. Explainable Risk Assessment

Show the factors contributing to each risk estimate, such as rainfall intensity, elevation, terrain and historical waterlogging records where available.

### 3. Rainfall Scenario Simulator

Explore how risk scores change under different rainfall assumptions.

### 4. Safer-Route Comparison

Compare alternative routes using estimated flood exposure alongside route distance. Route suggestions are experimental and must not be treated as verified safe routes.

### 5. Location-Based Insights

Select a locality or street segment to inspect its estimated risk and contributing factors.

### 6. AI/ML-Assisted Risk Modelling

Begin with a transparent baseline risk-scoring method. Where suitable labelled historical data is available, evaluate a machine-learning model to estimate flood risk.

## 🧠 How It Works

1. **Data collection:** Gather available rainfall, elevation, geographic and historical waterlogging data.
2. **Data processing:** Clean and standardize the datasets and associate relevant features with geographic locations.
3. **Risk estimation:** Calculate an initial risk score using available environmental indicators.
4. **Model development:** Train and evaluate an ML model if sufficient reliable labelled data is available.
5. **Visualization:** Display estimated risk levels and their contributing factors on an interactive map.
6. **Decision support:** Compare locations and potential routes to help users make more informed decisions.

The quality of risk estimates depends on data coverage, resolution, freshness and model validation. FloodLens does not claim to provide authoritative emergency warnings.

## 🏗️ System Architecture

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

## 🛠️ Technology Stack

| Component             | Technology                                             |
| --------------------- | ------------------------------------------------------ |
| Frontend              | React.js                                               |
| Styling               | Tailwind CSS                                           |
| Interactive maps      | Leaflet + OpenStreetMap                                |
| Backend               | Python + FastAPI                                       |
| Machine learning      | scikit-learn                                           |
| Geospatial processing | GeoPandas                                              |
| Data storage          | JSON/GeoJSON initially; PostgreSQL/PostGIS if required |
| Cloud storage         | Amazon S3                                              |
| Serverless processing | AWS Lambda                                             |
| API management        | Amazon API Gateway                                     |
| Frontend deployment   | AWS Amplify, if used                                   |

The final stack may be adjusted to fit the hackathon timeline and available data.

## ☁️ AWS Integration

AWS is intended to support the application's data-processing and API infrastructure.

* **Amazon S3:** Store environmental datasets, processed geographic data and generated risk layers.
* **AWS Lambda:** Execute lightweight risk-analysis or data-processing functions.
* **Amazon API Gateway:** Expose risk-analysis functionality through HTTP API endpoints.
* **AWS Amplify:** Optionally host and deploy the React frontend.

Only the services actually integrated into the final implementation will be listed as completed components.

## 📊 Data Sources

Potential data sources include:

* **Rainfall:** India Meteorological Department (IMD) and other accessible meteorological datasets.
* **Elevation:** NASA SRTM or other suitable digital elevation models.
* **Geographic data:** OpenStreetMap.
* **Historical flooding:** Publicly available municipal reports, open datasets and documented waterlogging records.

Dataset availability, licensing, spatial resolution and suitability must be verified before use. FloodLens will distinguish measured observations from simulated scenarios and model-generated estimates.

## 🚀 Getting Started

The following instructions describe the intended development setup. They assume the repository contains separate `frontend` and `backend` directories; adjust the commands if the actual project structure differs.

### Prerequisites

* Node.js and npm
* Python 3.11 or another supported Python version
* Git
* AWS account and credentials if deploying the AWS components

### 1. Clone the repository

```bash
git clone <YOUR_PUBLIC_REPOSITORY_URL>
cd FloodLens
```

### 2. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Set up the backend

Open a separate terminal:

```bash
cd backend
python -m venv .venv
```

Activate the environment.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux:**

```bash
source .venv/bin/activate
```

Install dependencies and start the API:

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

These commands require the corresponding project files and dependencies to exist. The actual entry point and installation instructions should be updated to match the implemented application.

### 4. Configure AWS

Configure the AWS services used by your implementation, including the required IAM permissions, S3 bucket and Lambda/API Gateway resources.

Keep credentials in environment variables or an appropriate secrets manager. **Never commit AWS access keys, secret keys or other credentials to GitHub.**

## 🗺️ Development Roadmap

* [ ] Select a target locality and validate data availability.
* [ ] Collect and preprocess rainfall and geographic datasets.
* [ ] Build the initial geospatial risk-scoring engine.
* [ ] Develop the interactive flood-risk map.
* [ ] Add location-based risk explanations.
* [ ] Implement rainfall scenario simulation.
* [ ] Evaluate an ML model if suitable historical labels are available.
* [ ] Add route comparison using a routing engine and risk estimates.
* [ ] Integrate AWS storage and API services.
* [ ] Test the application and document limitations.
* [ ] Record the hackathon demo and complete submission requirements.

## 🔬 Evaluation Strategy

FloodLens will be evaluated on both technical quality and practical usefulness.

* **Model performance:** Precision, recall, F1-score and appropriate calibration metrics, where labelled data supports evaluation.
* **Geospatial quality:** Coverage and consistency of geographic data.
* **Explainability:** Whether users can understand the main factors behind a risk estimate.
* **Usability:** Whether users can quickly identify locations of concern and compare alternatives.
* **Reliability:** Handling of missing data, API failures and unsupported locations.

Evaluation results will be reported only after testing. Simulated data will not be presented as real-world validation.

## ⚠️ Limitations and Safety

FloodLens is an experimental decision-support prototype, not a certified flood forecasting or emergency-response system.

* Estimates may be inaccurate when source data is incomplete or outdated.
* A risk score does not guarantee that flooding will or will not occur.
* Route comparisons cannot guarantee that a road is safe or accessible.
* Users should follow official weather alerts, local authority instructions and emergency guidance.

## 🌱 Potential Impact

FloodLens aims to make environmental information more understandable and actionable for urban residents, commuters and local communities. Its approach could also support exploratory flood-risk assessments by civic groups and urban planners.

## 👨‍💻 Built For

**Environmental Hacks 2026 — Heat and Water Track**

Developed as a solo hackathon project exploring the use of AI/ML, geospatial analysis and AWS to address urban flooding challenges.

## 📄 License

A license has not yet been selected. Add an appropriate open-source license before distributing the project for reuse.

---

**Disclaimer:** FloodLens is a prototype. Its outputs are estimates for exploration and must not replace official flood warnings or emergency instructions.
