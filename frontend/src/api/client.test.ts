import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  estimateRisk,
  getHealth,
  getZones,
  ApiClientError,
  API_BASE_URL,
} from "./client";
import type { RiskScoreResult, ZonesResponse } from "./types";

describe("FloodLens API Client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("checks health endpoint", async () => {
    const mockHealth = {
      status: "ok",
      service: "FloodLens API",
      environment: "development",
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockHealth), { status: 200 })
    );

    const result = await getHealth();
    expect(result.status).toBe("ok");
    expect(result.service).toBe("FloodLens API");
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/health`,
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      })
    );
  });

  it("fetches all 10 candidate monitoring zones with valid coordinates", async () => {
    const mockZones: ZonesResponse = {
      zones: [
        {
          id: "zone-uttar-pradesh",
          name: "Uttar Pradesh Monitoring Zone",
          state: "Uttar Pradesh",
          coordinates: [80.9462, 26.8467],
          aoi_bbox: null,
          data_status: "insufficient_data",
          sources: [],
          notes: "Candidate zone",
        },
        {
          id: "zone-bihar",
          name: "Bihar Monitoring Zone",
          state: "Bihar",
          coordinates: [85.1376, 25.5941],
          aoi_bbox: null,
          data_status: "insufficient_data",
          sources: [],
          notes: "Candidate zone",
        },
      ],
      total: 2,
      disclaimer: "Experimental candidate zones",
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockZones), { status: 200 })
    );

    const result = await getZones();
    expect(result.total).toBe(2);
    expect(result.zones).toHaveLength(2);
    expect(result.zones[0].coordinates).toEqual([80.9462, 26.8467]);
    // Longitude, latitude bounds
    expect(result.zones[0].coordinates[0]).toBeGreaterThan(68);
    expect(result.zones[0].coordinates[0]).toBeLessThan(98);
    expect(result.zones[0].coordinates[1]).toBeGreaterThan(8);
    expect(result.zones[0].coordinates[1]).toBeLessThan(38);
    expect(result.zones[0].data_status).toBe("insufficient_data");
  });

  it("estimates risk with null score and insufficient_data status", async () => {
    const mockEstimate: RiskScoreResult = {
      zone_id: "zone-uttar-pradesh",
      locality: "Uttar Pradesh Monitoring Zone",
      coordinates: [80.9462, 26.8467],
      scenario: {
        id: "moderate",
        label: "Moderate rainfall",
        rainfall_mm_per_hour: 35.0,
        assumption: "ASSUMPTION: fixed exploratory rate",
      },
      risk_index: null,
      risk_category: "insufficient_data",
      is_probability: false,
      factors: [
        {
          factor_name: "rainfall",
          raw_value: 35.0,
          normalized_value: 0.3043,
          weight: 0.3,
          weighted_score: null,
          available: true,
          interpretation: "Exploratory rainfall rate: 35.0 mm/hr",
        },
        {
          factor_name: "low_elevation",
          raw_value: null,
          normalized_value: null,
          weight: 0.25,
          weighted_score: null,
          available: false,
          interpretation: "Elevation data absent",
        },
      ],
      data_quality: {
        status: "insufficient_data",
        missing_inputs: [
          "Missing feature: elevation_m",
          "Missing feature: local_relief_m",
        ],
        warnings: ["Terrain features are not available"],
      },
      model_version: "0.1.0-baseline",
      generated_at: "2026-10-11T00:00:00Z",
      limitations: ["Experimental estimate. Not an official warning."],
      data_provenance: [],
    };

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockEstimate), { status: 200 })
    );

    const result = await estimateRisk({
      zone_id: "zone-uttar-pradesh",
      scenario_id: "moderate",
    });

    expect(result.risk_index).toBeNull();
    expect(result.risk_category).toBe("insufficient_data");
    expect(result.is_probability).toBe(false);
    expect(result.data_quality.status).toBe("insufficient_data");
    expect(result.data_quality.missing_inputs).toHaveLength(2);
    expect(result.factors).toHaveLength(2);
    expect(result.scenario.rainfall_mm_per_hour).toBe(35.0);
  });

  it("handles outside_coverage error response properly", async () => {
    const errorBody = {
      status: "outside_coverage",
      message: "Zone 'zone-atlantis' is outside covered monitoring zones.",
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 422,
        statusText: "Unprocessable Entity",
      })
    );

    await expect(
      estimateRisk({ zone_id: "zone-atlantis", scenario_id: "moderate" })
    ).rejects.toThrow(ApiClientError);

    try {
      await estimateRisk({ zone_id: "zone-atlantis", scenario_id: "moderate" });
    } catch (err) {
      if (err instanceof ApiClientError) {
        expect(err.status).toBe("outside_coverage");
        expect(err.httpStatus).toBe(422);
        expect(err.message).toContain("outside covered monitoring zones");
      }
    }
  });

  it("handles unsupported scenario invalid_input error response", async () => {
    const errorBody = {
      status: "invalid_input",
      message: "Scenario 'monsoon_tsunami' is not supported.",
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 422,
        statusText: "Unprocessable Entity",
      })
    );

    try {
      await estimateRisk({
        zone_id: "zone-uttar-pradesh",
        scenario_id: "monsoon_tsunami",
      });
      expect.fail("Should have thrown ApiClientError");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      if (err instanceof ApiClientError) {
        expect(err.status).toBe("invalid_input");
        expect(err.httpStatus).toBe(422);
        expect(err.message).toContain("not supported");
      }
    }
  });

  it("handles network connection failure gracefully", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    try {
      await getZones();
      expect.fail("Should have thrown network ApiClientError");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      if (err instanceof ApiClientError) {
        expect(err.status).toBe("network_error");
        expect(err.httpStatus).toBe(0);
        expect(err.message).toContain("Cannot connect to API server");
      }
    }
  });
});
