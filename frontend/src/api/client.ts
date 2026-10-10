/**
 * Typed API client for FloodLens backend.
 *
 * Configurable via Vite environment variable VITE_API_BASE_URL
 * (defaults to http://localhost:8000 for local development).
 */

import type {
  ApiErrorPayload,
  ApiState,
  HealthResponse,
  RiskEstimateRequest,
  RiskScoreResult,
  ZonesResponse,
} from "./types";

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:8000";

export class ApiClientError extends Error {
  public readonly status: ApiState | "network_error";
  public readonly httpStatus: number;

  constructor(
    message: string,
    status: ApiState | "network_error" = "network_error",
    httpStatus: number = 0
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.httpStatus = httpStatus;
  }
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ApiClientError(
      `Cannot connect to API server at ${API_BASE_URL}. Ensure the backend is running. (${detail})`,
      "network_error",
      0
    );
  }

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // Body was not JSON
    }

    const message =
      payload?.message ||
      `Request to ${path} failed with HTTP ${response.status} (${response.statusText})`;
    const status: ApiState = payload?.status || "internal_error";

    throw new ApiClientError(message, status, response.status);
  }

  return (await response.json()) as T;
}

/** Check backend health status */
export async function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/api/health");
}

/** Retrieve catalog of 10 candidate monitoring zones */
export async function getZones(): Promise<ZonesResponse> {
  return requestJson<ZonesResponse>("/api/zones");
}

/** Request flood susceptibility estimation for a zone and scenario */
export async function estimateRisk(
  request: RiskEstimateRequest
): Promise<RiskScoreResult> {
  return requestJson<RiskScoreResult>("/api/risk/estimate", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
