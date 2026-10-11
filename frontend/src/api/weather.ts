/**
 * Open-Meteo Weather Service
 *
 * Requests dynamic hourly precipitation forecasts for real coordinates.
 * Implements strict input validation, caching (15-min TTL), error handling,
 * and cancellation support.
 */

export interface OpenMeteoRawResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  elevation: number;
  hourly_units: {
    time: string;
    precipitation: string;
    rain: string;
  };
  hourly: {
    time: string[];
    precipitation: number[];
    rain: number[];
  };
}

export interface HourlyForecastItem {
  time: string;
  timestamp: number;
  precipitationMm: number;
  rainMm: number;
}

export interface ProcessedWeatherForecast {
  latitude: number;
  longitude: number;
  elevationM: number;
  timezone: string;
  units: {
    precipitation: string;
  };
  retrievedAt: string;
  forecastHorizonHours: number;
  totalPrecipitation24h: number;
  totalPrecipitation72h: number;
  peakPrecipitationRate: number;
  peakPrecipitationTime: string | null;
  hasUpcomingPrecipitation: boolean;
  hourly: HourlyForecastItem[];
  isForecast: true;
}

export class WeatherServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_COORDINATES" | "NETWORK_ERROR" | "RATE_LIMITED" | "PARSE_ERROR" | "ABORTED",
    public readonly status?: number
  ) {
    super(message);
    this.name = "WeatherServiceError";
  }
}

interface CacheEntry {
  data: ProcessedWeatherForecast;
  expiresAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const forecastCache = new Map<string, CacheEntry>();

function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

/**
 * Validate latitude and longitude bounds.
 */
export function validateCoordinates(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Fetch 3-day hourly precipitation forecast from Open-Meteo.
 */
export async function fetchWeatherForecast(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<ProcessedWeatherForecast> {
  if (!validateCoordinates(lat, lon)) {
    throw new WeatherServiceError(
      `Invalid coordinates: latitude must be in [-90, 90] and longitude in [-180, 180]. Received (${lat}, ${lon})`,
      "INVALID_COORDINATES"
    );
  }

  const cacheKey = getCacheKey(lat, lon);
  const now = Date.now();
  const cached = forecastCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: "precipitation,rain",
    forecast_days: "3",
    timezone: "auto",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new WeatherServiceError("Weather request was cancelled.", "ABORTED");
    }
    throw new WeatherServiceError(
      err instanceof Error ? err.message : "Failed to connect to Open-Meteo weather service.",
      "NETWORK_ERROR"
    );
  }

  if (response.status === 429) {
    throw new WeatherServiceError(
      "Open-Meteo rate limit exceeded. Please wait a moment before retrying.",
      "RATE_LIMITED",
      429
    );
  }

  if (!response.ok) {
    throw new WeatherServiceError(
      `Open-Meteo service returned HTTP ${response.status}: ${response.statusText}`,
      "NETWORK_ERROR",
      response.status
    );
  }

  let raw: OpenMeteoRawResponse;
  try {
    raw = await response.json();
  } catch {
    throw new WeatherServiceError(
      "Failed to parse weather forecast JSON payload from Open-Meteo.",
      "PARSE_ERROR"
    );
  }

  if (!raw.hourly || !Array.isArray(raw.hourly.time) || !Array.isArray(raw.hourly.precipitation)) {
    throw new WeatherServiceError(
      "Open-Meteo response missing hourly precipitation arrays.",
      "PARSE_ERROR"
    );
  }

  const times = raw.hourly.time;
  const precipitations = raw.hourly.precipitation;
  const rains = raw.hourly.rain || [];

  if (times.length === 0) {
    throw new WeatherServiceError(
      "Open-Meteo response returned empty hourly forecast array.",
      "PARSE_ERROR"
    );
  }

  if (times.length !== precipitations.length) {
    throw new WeatherServiceError(
      `Open-Meteo response array length mismatch: ${times.length} timestamps vs ${precipitations.length} precipitation points.`,
      "PARSE_ERROR"
    );
  }

  const items: HourlyForecastItem[] = [];
  let sum24 = 0;
  let sum72 = 0;
  let peakRate = 0;
  let peakTime: string | null = null;

  for (let i = 0; i < times.length; i++) {
    const rawP = precipitations[i];
    const rawR = rains[i];
    // Sanitize: ensure non-negative, finite numbers (mm)
    const p = typeof rawP === "number" && Number.isFinite(rawP) && rawP >= 0 ? rawP : 0;
    const r = typeof rawR === "number" && Number.isFinite(rawR) && rawR >= 0 ? rawR : p;
    const timeIso = times[i];

    if (i < 24) {
      sum24 += p;
    }
    sum72 += p;

    if (p > peakRate) {
      peakRate = p;
      peakTime = timeIso;
    }

    items.push({
      time: timeIso,
      timestamp: new Date(timeIso).getTime(),
      precipitationMm: Math.round(p * 10) / 10,
      rainMm: Math.round(r * 10) / 10,
    });
  }

  const processed: ProcessedWeatherForecast = {
    latitude: raw.latitude,
    longitude: raw.longitude,
    elevationM: raw.elevation ?? 0,
    timezone: raw.timezone || "UTC",
    units: {
      precipitation: raw.hourly_units?.precipitation || "mm",
    },
    retrievedAt: new Date().toISOString(),
    forecastHorizonHours: items.length,
    totalPrecipitation24h: Math.round(sum24 * 10) / 10,
    totalPrecipitation72h: Math.round(sum72 * 10) / 10,
    peakPrecipitationRate: Math.round(peakRate * 10) / 10,
    peakPrecipitationTime: peakTime,
    hasUpcomingPrecipitation: sum72 > 0.1,
    hourly: items,
    isForecast: true,
  };

  forecastCache.set(cacheKey, {
    data: processed,
    expiresAt: now + CACHE_TTL_MS,
  });

  return processed;
}

/**
 * Clear the cache (primarily for tests).
 */
export function clearWeatherCache(): void {
  forecastCache.clear();
}
