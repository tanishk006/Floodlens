/**
 * Real Environmental Hydrology Service
 *
 * Ingests live Copernicus GloFAS River Discharge (m³/s) from Open-Meteo Flood API
 * and ECMWF / ERA5-Land Volumetric Soil Moisture (m³/m³) to assess Antecedent
 * Moisture Conditions (AMC) and fluvial drainage forcing.
 */

import { validateCoordinates } from "./weather";

export interface DailyDischargeItem {
  date: string;
  riverDischargeM3s: number;
}

export interface HydrologyIntelligence {
  latitude: number;
  longitude: number;
  retrievedAt: string;
  riverDischarge: {
    currentM3s: number;
    peak7DayM3s: number;
    trend: "rising" | "falling" | "steady";
    status: "normal" | "elevated" | "high_flow";
    daily: DailyDischargeItem[];
  };
  soilMoisture: {
    topsoilM3m3: number;
    rootzoneM3m3: number;
    saturationPercent: number;
    antecedentCondition: "dry" | "moderate" | "saturated";
    runoffCoefficient: number;
  };
}

export class HydrologyServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_COORDINATES" | "NETWORK_ERROR" | "PARSE_ERROR" | "ABORTED"
  ) {
    super(message);
    this.name = "HydrologyServiceError";
  }
}

interface CacheEntry {
  data: HydrologyIntelligence;
  expiresAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15-minute TTL
const hydrologyCache = new Map<string, CacheEntry>();

function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export function clearHydrologyCache(): void {
  hydrologyCache.clear();
}

/**
 * Fetch and aggregate Copernicus GloFAS river discharge and ECMWF soil moisture.
 */
export async function fetchHydrologyIntelligence(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<HydrologyIntelligence> {
  if (!validateCoordinates(lat, lon)) {
    throw new HydrologyServiceError(
      `Invalid coordinates: (${lat}, ${lon})`,
      "INVALID_COORDINATES"
    );
  }

  const cacheKey = getCacheKey(lat, lon);
  const now = Date.now();
  const cached = hydrologyCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  // 1. Fetch Copernicus GloFAS River Discharge
  const floodParams = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    daily: "river_discharge",
    forecast_days: "7",
  });
  const floodUrl = `https://flood-api.open-meteo.com/v1/flood?${floodParams.toString()}`;

  // 2. Fetch ECMWF Soil Moisture (0-1cm and 1-3cm depth)
  const soilParams = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: "soil_moisture_0_to_1cm,soil_moisture_1_to_3cm",
    forecast_days: "1",
    timezone: "auto",
  });
  const soilUrl = `https://api.open-meteo.com/v1/forecast?${soilParams.toString()}`;

  let floodRes: Response;
  let soilRes: Response;

  try {
    [floodRes, soilRes] = await Promise.all([
      fetch(floodUrl, { signal }),
      fetch(soilUrl, { signal }),
    ]);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new HydrologyServiceError("Hydrology request cancelled", "ABORTED");
    }
    throw new HydrologyServiceError(
      err instanceof Error ? err.message : "Failed to connect to environmental hydrology API",
      "NETWORK_ERROR"
    );
  }

  if (!floodRes.ok || !soilRes.ok) {
    throw new HydrologyServiceError(
      `Hydrology API response error: Flood (${floodRes.status}), Soil (${soilRes.status})`,
      "NETWORK_ERROR"
    );
  }

  let floodJson: any;
  let soilJson: any;

  try {
    [floodJson, soilJson] = await Promise.all([floodRes.json(), soilRes.json()]);
  } catch {
    throw new HydrologyServiceError("Malformed JSON response from hydrology API", "PARSE_ERROR");
  }

  // Process River Discharge
  const dailyDates: string[] = floodJson?.daily?.time ?? [];
  const rawDischarge: (number | null)[] = floodJson?.daily?.river_discharge ?? [];
  const dailyDischarge: DailyDischargeItem[] = [];

  for (let i = 0; i < dailyDates.length; i++) {
    const val = rawDischarge[i];
    if (val !== null && val !== undefined && Number.isFinite(val)) {
      dailyDischarge.push({
        date: dailyDates[i],
        riverDischargeM3s: Math.max(0, Math.round(val * 100) / 100),
      });
    }
  }

  const currentM3s = dailyDischarge.length > 0 ? dailyDischarge[0].riverDischargeM3s : 0;
  const peak7DayM3s = dailyDischarge.reduce(
    (max, item) => Math.max(max, item.riverDischargeM3s),
    currentM3s
  );

  let trend: "rising" | "falling" | "steady" = "steady";
  if (dailyDischarge.length >= 2) {
    const diff = dailyDischarge[1].riverDischargeM3s - dailyDischarge[0].riverDischargeM3s;
    if (diff > 5) trend = "rising";
    else if (diff < -5) trend = "falling";
  }

  let dischargeStatus: "normal" | "elevated" | "high_flow" = "normal";
  if (currentM3s > 500) dischargeStatus = "high_flow";
  else if (currentM3s > 250) dischargeStatus = "elevated";

  // Process Soil Moisture
  const topsoilArr: (number | null)[] = soilJson?.hourly?.soil_moisture_0_to_1cm ?? [];
  const rootzoneArr: (number | null)[] = soilJson?.hourly?.soil_moisture_1_to_3cm ?? [];

  const topsoilVal =
    topsoilArr.length > 0 && topsoilArr[0] !== null && Number.isFinite(topsoilArr[0])
      ? topsoilArr[0]
      : 0.25;

  const rootzoneVal =
    rootzoneArr.length > 0 && rootzoneArr[0] !== null && Number.isFinite(rootzoneArr[0])
      ? rootzoneArr[0]
      : 0.28;

  // Typical mineral soil saturation capacity is ~0.45 m³/m³
  const saturationPercent = Math.min(100, Math.max(0, Math.round((topsoilVal / 0.45) * 100)));

  let antecedentCondition: "dry" | "moderate" | "saturated" = "moderate";
  let runoffCoefficient = 0.75;

  if (saturationPercent >= 75) {
    antecedentCondition = "saturated";
    runoffCoefficient = 0.95; // High runoff, low infiltration
  } else if (saturationPercent <= 35) {
    antecedentCondition = "dry";
    runoffCoefficient = 0.45; // High initial soil infiltration
  }

  const intelligence: HydrologyIntelligence = {
    latitude: lat,
    longitude: lon,
    retrievedAt: new Date().toISOString(),
    riverDischarge: {
      currentM3s,
      peak7DayM3s,
      trend,
      status: dischargeStatus,
      daily: dailyDischarge,
    },
    soilMoisture: {
      topsoilM3m3: Math.round(topsoilVal * 1000) / 1000,
      rootzoneM3m3: Math.round(rootzoneVal * 1000) / 1000,
      saturationPercent,
      antecedentCondition,
      runoffCoefficient,
    },
  };

  hydrologyCache.set(cacheKey, {
    data: intelligence,
    expiresAt: now + CACHE_TTL_MS,
  });

  return intelligence;
}
