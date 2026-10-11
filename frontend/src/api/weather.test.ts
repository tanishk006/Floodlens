import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchWeatherForecast,
  validateCoordinates,
  clearWeatherCache,
  WeatherServiceError,
} from "./weather";

describe("Open-Meteo Weather Service", () => {
  beforeEach(() => {
    clearWeatherCache();
    vi.restoreAllMocks();
  });

  it("validates coordinates correctly", () => {
    expect(validateCoordinates(26.8467, 80.9462)).toBe(true);
    expect(validateCoordinates(-90, 180)).toBe(true);
    expect(validateCoordinates(91, 50)).toBe(false);
    expect(validateCoordinates(20, -181)).toBe(false);
    expect(validateCoordinates(NaN, 50)).toBe(false);
  });

  it("throws INVALID_COORDINATES error when coordinates are out of bounds", async () => {
    await expect(fetchWeatherForecast(95, 80)).rejects.toThrow(WeatherServiceError);
    await expect(fetchWeatherForecast(95, 80)).rejects.toMatchObject({
      code: "INVALID_COORDINATES",
    });
  });

  it("fetches and parses Open-Meteo hourly precipitation correctly", async () => {
    const mockResponse = {
      latitude: 26.85,
      longitude: 80.95,
      generationtime_ms: 0.1,
      utc_offset_seconds: 19800,
      timezone: "Asia/Kolkata",
      elevation: 125,
      hourly_units: {
        time: "iso8601",
        precipitation: "mm",
        rain: "mm",
      },
      hourly: {
        time: [
          "2026-10-11T00:00",
          "2026-10-11T01:00",
          "2026-10-11T02:00",
          "2026-10-11T03:00",
        ],
        precipitation: [0.0, 5.2, 12.8, 1.0],
        rain: [0.0, 5.2, 12.8, 1.0],
      },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await fetchWeatherForecast(26.8467, 80.9462);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.latitude).toBe(26.85);
    expect(result.timezone).toBe("Asia/Kolkata");
    expect(result.totalPrecipitation24h).toBe(19.0);
    expect(result.peakPrecipitationRate).toBe(12.8);
    expect(result.peakPrecipitationTime).toBe("2026-10-11T02:00");
    expect(result.hasUpcomingPrecipitation).toBe(true);
    expect(result.hourly.length).toBe(4);
    expect(result.isForecast).toBe(true);
  });

  it("uses cache for identical coordinates within TTL", async () => {
    const mockResponse = {
      latitude: 26.85,
      longitude: 80.95,
      hourly_units: { time: "iso8601", precipitation: "mm", rain: "mm" },
      hourly: {
        time: ["2026-10-11T00:00"],
        precipitation: [2.5],
        rain: [2.5],
      },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const res1 = await fetchWeatherForecast(26.8467, 80.9462);
    const res2 = await fetchWeatherForecast(26.8467, 80.9462);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res1.peakPrecipitationRate).toBe(res2.peakPrecipitationRate);
  });

  it("handles rate limiting (HTTP 429)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    } as Response);

    await expect(fetchWeatherForecast(26.8467, 80.9462)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
  });

  it("handles network failure gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network connection dropped"));

    await expect(fetchWeatherForecast(26.8467, 80.9462)).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });

  it("throws PARSE_ERROR when hourly arrays have mismatched lengths", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        latitude: 26.85,
        longitude: 80.95,
        hourly_units: { time: "iso8601", precipitation: "mm" },
        hourly: {
          time: ["2026-10-11T00:00", "2026-10-11T01:00"],
          precipitation: [2.5], // Length 1 vs 2
        },
      }),
    } as Response);

    await expect(fetchWeatherForecast(26.8467, 80.9462)).rejects.toMatchObject({
      code: "PARSE_ERROR",
    });
  });

  it("throws PARSE_ERROR when hourly array is empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        latitude: 26.85,
        longitude: 80.95,
        hourly_units: { time: "iso8601", precipitation: "mm" },
        hourly: {
          time: [],
          precipitation: [],
        },
      }),
    } as Response);

    await expect(fetchWeatherForecast(26.8467, 80.9462)).rejects.toMatchObject({
      code: "PARSE_ERROR",
    });
  });

  it("rejects negative or NaN precipitation values with PARSE_ERROR", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        latitude: 26.85,
        longitude: 80.95,
        hourly_units: { time: "iso8601", precipitation: "mm" },
        hourly: {
          time: ["2026-10-11T00:00", "2026-10-11T01:00"],
          precipitation: [-5.0, 10.0],
        },
      }),
    } as Response);

    await expect(fetchWeatherForecast(26.8467, 80.9462)).rejects.toMatchObject({
      code: "PARSE_ERROR",
    });
  });

  it("correctly handles valid zero-precipitation forecast (dry weather)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        latitude: 26.85,
        longitude: 80.95,
        hourly_units: { time: "iso8601", precipitation: "mm" },
        hourly: {
          time: ["2026-10-11T00:00", "2026-10-11T01:00"],
          precipitation: [0.0, 0.0],
        },
      }),
    } as Response);

    const result = await fetchWeatherForecast(26.8467, 80.9462);
    expect(result.peakPrecipitationRate).toBe(0.0);
    expect(result.totalPrecipitation24h).toBe(0.0);
    expect(result.hasUpcomingPrecipitation).toBe(false);
  });
});
