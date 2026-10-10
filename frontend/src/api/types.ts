/**
 * TypeScript type definitions matching the FloodLens FastAPI backend
 * and ML model contracts.
 *
 * Coordinates are strictly ordered as [longitude, latitude] in EPSG:4326.
 * is_probability is strictly false.
 */

export type DataQualityStatus = "available" | "illustrative" | "insufficient_data";

export type ZoneDataStatus = "verified" | "illustrative" | "insufficient_data";

export type RiskCategory =
  | "low"
  | "moderate"
  | "high"
  | "severe"
  | "insufficient_data";

export type BaselineFactorName =
  | "low_elevation"
  | "local_relief"
  | "slope"
  | "flow_accumulation"
  | "rainfall";

export type ScenarioId = "light" | "moderate" | "heavy" | "extreme";

export interface DataSourceProvenance {
  name: string;
  url: string | null;
  accessed_at: string | null;
  licence: string;
  role: string;
  spatial_resolution: string | null;
  temporal_coverage: string | null;
  notes: string | null;
}

export interface CandidateZone {
  id: string;
  name: string;
  state: string;
  /** [longitude, latitude] in EPSG:4326 */
  coordinates: [number, number];
  /** [west, south, east, north] in EPSG:4326 */
  aoi_bbox: [number, number, number, number] | null;
  data_status: ZoneDataStatus;
  sources: DataSourceProvenance[];
  notes: string | null;
}

export interface ZonesResponse {
  zones: CandidateZone[];
  total: number;
  disclaimer: string;
}

export interface ScenarioInfo {
  id: string;
  label: string;
  rainfall_mm_per_hour: number;
  assumption: string;
}

export interface FactorContribution {
  factor_name: BaselineFactorName;
  raw_value: number | null;
  normalized_value: number | null;
  weight: number;
  weighted_score: number | null;
  available: boolean;
  interpretation: string;
}

export interface DataQualityReport {
  status: DataQualityStatus;
  missing_inputs: string[];
  warnings: string[];
}

export interface RiskScoreResult {
  zone_id: string | null;
  locality: string | null;
  /** [longitude, latitude] in EPSG:4326 */
  coordinates: [number, number] | null;
  scenario: ScenarioInfo;
  risk_index: number | null;
  risk_category: RiskCategory;
  is_probability: false;
  factors: FactorContribution[];
  data_quality: DataQualityReport;
  model_version: string;
  generated_at: string;
  limitations: string[];
  data_provenance: DataSourceProvenance[];
}

export interface RiskEstimateRequest {
  zone_id: string;
  scenario_id: ScenarioId | string;
  rainfall_mm_per_hour?: number;
}

export type ApiState =
  | "invalid_input"
  | "outside_coverage"
  | "insufficient_data"
  | "data_unavailable"
  | "internal_error";

export interface ApiErrorPayload {
  status: ApiState;
  message: string;
}

export interface HealthResponse {
  status: "ok";
  service: string;
  environment: string;
}
