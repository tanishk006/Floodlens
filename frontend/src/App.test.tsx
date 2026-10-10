import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";
import * as client from "./api/client";
import type { RiskScoreResult, ZonesResponse } from "./api/types";

// Mock MapLibre GL JS since WebGL is not available in JSDOM
vi.mock("maplibre-gl", () => {
  function MockMap() {
    return {
      on: vi.fn(),
      off: vi.fn(),
      remove: vi.fn(),
      easeTo: vi.fn(),
      getZoom: vi.fn().mockReturnValue(4.2),
    };
  }
  function MockMarker() {
    return {
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    };
  }
  return {
    Map: MockMap,
    Marker: MockMarker,
  };
});


const mockZonesData: ZonesResponse = {
  zones: [
    {
      id: "zone-uttar-pradesh",
      name: "Uttar Pradesh Monitoring Zone",
      state: "Uttar Pradesh",
      coordinates: [80.9462, 26.8467],
      aoi_bbox: null,
      data_status: "insufficient_data",
      sources: [],
      notes: "High historical flooded area",
    },
    {
      id: "zone-bihar",
      name: "Bihar Monitoring Zone",
      state: "Bihar",
      coordinates: [85.1376, 25.5941],
      aoi_bbox: null,
      data_status: "insufficient_data",
      sources: [],
      notes: "Kosi and Gandak floodplains",
    },
    {
      id: "zone-assam",
      name: "Assam Monitoring Zone",
      state: "Assam",
      coordinates: [92.9376, 26.2006],
      aoi_bbox: null,
      data_status: "insufficient_data",
      sources: [],
      notes: "Brahmaputra river corridor",
    },
  ],
  total: 3,
  disclaimer: "Experimental candidate monitoring zones. Not an official hazard map.",
};

const mockEstimateModerate: RiskScoreResult = {
  zone_id: "zone-uttar-pradesh",
  locality: "Uttar Pradesh Monitoring Zone",
  coordinates: [80.9462, 26.8467],
  scenario: {
    id: "moderate",
    label: "Moderate rainfall",
    rainfall_mm_per_hour: 35.0,
    assumption: "ASSUMPTION: fixed exploratory rate across study window",
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

const mockEstimateExtreme: RiskScoreResult = {
  ...mockEstimateModerate,
  scenario: {
    id: "extreme",
    label: "Extreme rainfall",
    rainfall_mm_per_hour: 115.0,
    assumption: "ASSUMPTION: extreme cloudburst rate across study window",
  },
};

describe("FloodLens App Component", () => {
  beforeEach(() => {
    vi.spyOn(client, "getHealth").mockResolvedValue({
      status: "ok",
      service: "FloodLens API",
      environment: "development",
    });
    vi.spyOn(client, "getZones").mockResolvedValue(mockZonesData);
    vi.spyOn(client, "estimateRisk").mockResolvedValue(mockEstimateModerate);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the header and persistent disclaimer", async () => {
    render(<App />);

    expect(screen.getByText("FloodLens")).toBeDefined();
    expect(screen.getByText("Street-Level Flood Risk Intelligence")).toBeDefined();
    expect(
      screen.getAllByText("Experimental estimate. Not an official warning.").length
    ).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText("API Online")).toBeDefined();
    });
  });

  it("loads candidate zones and populates the monitoring zone directory", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("3 candidate zones loaded")).toBeDefined();
    });

    expect(screen.getByText("Uttar Pradesh")).toBeDefined();
    expect(screen.getByText("Bihar")).toBeDefined();
    expect(screen.getByText("Assam")).toBeDefined();
  });

  it("displays 'Insufficient Data' transparently when risk_index is null", async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/No real DEM or documented terrain observations are connected/i)
      ).toBeDefined();
    });

    expect(screen.getByText("Prerequisites Needed:")).toBeDefined();
    expect(screen.getByText("Missing feature: elevation_m")).toBeDefined();
    expect(screen.getByText("Missing feature: local_relief_m")).toBeDefined();
  });

  it("allows selecting a different candidate zone from the directory", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Bihar")).toBeDefined();
    });

    const biharRow = screen.getByRole("button", { name: /Bihar/i });
    fireEvent.click(biharRow);

    await waitFor(() => {
      expect(client.estimateRisk).toHaveBeenCalledWith(
        expect.objectContaining({ zone_id: "zone-bihar" })
      );
    });

    expect(screen.getByRole("heading", { name: "Bihar Monitoring Zone" })).toBeDefined();
  });

  it("allows toggling rainfall scenarios and updates risk estimation request", async () => {
    vi.spyOn(client, "estimateRisk").mockResolvedValueOnce(mockEstimateModerate);
    vi.spyOn(client, "estimateRisk").mockResolvedValueOnce(mockEstimateExtreme);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Moderate")).toBeDefined();
    });

    const extremeBtn = screen.getByRole("button", { name: /Extreme/i });
    fireEvent.click(extremeBtn);

    await waitFor(() => {
      expect(client.estimateRisk).toHaveBeenCalledWith(
        expect.objectContaining({ scenario_id: "extreme" })
      );
    });
  });

  it("displays backend connection error when API fails", async () => {
    vi.spyOn(client, "getZones").mockRejectedValueOnce(
      new client.ApiClientError("Cannot connect to API server", "network_error", 0)
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Backend Notice")).toBeDefined();
    });

    expect(screen.getByText("Cannot connect to API server")).toBeDefined();
    expect(screen.getByRole("button", { name: "Reconnect" })).toBeDefined();
  });
});
