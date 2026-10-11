import { useState, useEffect } from "react";
import type { CandidateZone } from "../api/types";
import {
  fetchWeatherForecast,
  type ProcessedWeatherForecast,
  WeatherServiceError,
} from "../api/weather";

interface WeatherViewProps {
  zones: CandidateZone[];
  selectedZone: CandidateZone | null;
  onSelectZone: (zoneId: string) => void;
  onApplyForecastToRisk: (rateMmHr: number) => void;
}

export default function WeatherView({
  zones,
  selectedZone,
  onSelectZone,
  onApplyForecastToRisk,
}: WeatherViewProps) {
  const [weather, setWeather] = useState<ProcessedWeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedZone) return;
    const controller = new AbortController();
    const [lon, lat] = selectedZone.coordinates;

    setIsLoading(true);
    setWeather(null);
    setError(null);

    fetchWeatherForecast(lat, lon, controller.signal)
      .then((data) => setWeather(data))
      .catch((err: unknown) => {
        if (err instanceof WeatherServiceError && err.code === "ABORTED") return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to connect to Open-Meteo API."
        );
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [selectedZone]);

  return (
    <div className="h-full overflow-y-auto bg-surface p-6 md:p-10 text-slate-200">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-surface-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-3">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              NWP ATMOSPHERIC FORCING INTELLIGENCE
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Real-Time Weather & Precipitation Forecast
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live numerical weather prediction (NWP) precipitation forcing via Open-Meteo across Indian candidate zones.
            </p>
          </div>

          {/* Zone Selector dropdown */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-mono text-slate-400 uppercase">
              Zone:
            </label>
            <select
              value={selectedZone?.id ?? ""}
              onChange={(e) => onSelectZone(e.target.value)}
              className="bg-surface-raised border border-surface-border rounded-md px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Zone Geo-header */}
        {selectedZone && (
          <div className="p-4 rounded-xl bg-surface-raised border border-surface-border flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400">Locality: </span>
                <strong className="text-white">{selectedZone.name}</strong>
              </div>
              <div className="border-l border-surface-border pl-4">
                <span className="text-slate-400">Coordinates: </span>
                <span className="text-cyan-400">
                  [{selectedZone.coordinates[0].toFixed(4)}, {selectedZone.coordinates[1].toFixed(4)}]
                </span>
              </div>
            </div>

            {weather && (
              <div className="flex items-center gap-4 text-slate-400">
                <div>Timezone: <span className="text-slate-200">{weather.timezone}</span></div>
                <div>Elevation: <span className="text-slate-200">{weather.elevationM}m</span></div>
                <div>Updated: <span className="text-slate-200">{new Date(weather.retrievedAt).toLocaleTimeString()}</span></div>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
            <p className="text-sm font-mono text-slate-400">
              Fetching Open-Meteo precipitation forecasts…
            </p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-2">
            <h3 className="font-semibold text-sm">Weather Telemetry Failed</h3>
            <p className="text-xs">{error}</p>
          </div>
        ) : weather ? (
          <div className="space-y-8">
            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl bg-surface-raised border border-surface-border">
                <span className="text-xs font-mono text-slate-400 uppercase">
                  24h Total Rain
                </span>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {weather.totalPrecipitation24h} <span className="text-xs text-slate-400">mm</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Next 24 hours cumulative
                </div>
              </div>

              <div className="p-5 rounded-xl bg-surface-raised border border-surface-border">
                <span className="text-xs font-mono text-slate-400 uppercase">
                  72h Total Rain
                </span>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {weather.totalPrecipitation72h} <span className="text-xs text-slate-400">mm</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Full 3-day projection
                </div>
              </div>

              <div className="p-5 rounded-xl bg-surface-raised border border-surface-border">
                <span className="text-xs font-mono text-slate-400 uppercase">
                  Peak Intensity
                </span>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                  {weather.peakPrecipitationRate} <span className="text-xs text-slate-400">mm/h</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {weather.peakPrecipitationTime
                    ? `Occurring ${new Date(weather.peakPrecipitationTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                    : "No storm peak detected"}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-surface-raised border border-surface-border flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase">
                    Risk Integration
                  </span>
                  <div className="text-xs text-slate-300 mt-1">
                    Apply peak rate as hydrological forcing factor
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onApplyForecastToRisk(
                      weather.peakPrecipitationRate > 0 ? weather.peakPrecipitationRate : 1.0
                    )
                  }
                  className="w-full mt-3 py-1.5 px-3 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium transition-colors"
                >
                  Apply in Scenario Lab →
                </button>
              </div>
            </div>

            {/* 72-Hour Precipitation Bar Chart */}
            <div className="p-6 rounded-xl bg-surface-raised border border-surface-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-base">
                    72-Hour Hourly Precipitation Distribution
                  </h3>
                  <p className="text-xs text-slate-400">
                    Temporal distribution in mm/hr from Open-Meteo High-Resolution NWP
                  </p>
                </div>
                <div className="text-xs font-mono text-cyan-400">
                  Peak: {weather.peakPrecipitationRate} mm/h
                </div>
              </div>

              <div className="h-40 flex items-end gap-[3px] bg-surface p-3 rounded-lg border border-surface-border overflow-x-auto">
                {weather.hourly.map((item, idx) => {
                  const maxRate = Math.max(1, weather.peakPrecipitationRate);
                  const heightPercent = Math.min(100, (item.precipitationMm / maxRate) * 100);
                  const isDayStart = idx % 24 === 0;

                  return (
                    <div
                      key={item.time}
                      className="flex-1 min-w-[10px] h-full flex flex-col justify-end group relative"
                    >
                      <div
                        className={`w-full rounded-t transition-all ${
                          item.precipitationMm > 0
                            ? "bg-sky-500/40 group-hover:bg-cyan-400"
                            : "bg-surface-border/30"
                        }`}
                        style={{ height: `${Math.max(4, heightPercent)}%` }}
                      />
                      {isDayStart && (
                        <div className="absolute -bottom-6 left-0 text-[9px] font-mono text-slate-500 whitespace-nowrap">
                          Day {Math.floor(idx / 24) + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 text-xs font-mono text-slate-400 flex justify-between">
                <span>0h (Forecast start)</span>
                <span>24h</span>
                <span>48h</span>
                <span>72h (Forecast horizon)</span>
              </div>
            </div>

            {/* Scenario Benchmark Comparison Matrix */}
            <div className="p-6 rounded-xl bg-surface-raised border border-surface-border space-y-4">
              <h3 className="font-semibold text-white text-base">
                Forecast Forcing vs. FloodLens Standard Scenarios
              </h3>
              <p className="text-xs text-slate-400">
                How the current meteorological peak rate compares to established prototype scenarios:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-mono">
                <div className={`p-3 rounded-lg border ${weather.peakPrecipitationRate <= 7.5 ? "bg-cyan-500/10 border-cyan-500/40" : "bg-surface border-surface-border"}`}>
                  <div className="text-slate-400 uppercase text-[10px]">Forecast Peak</div>
                  <div className="text-base font-bold text-cyan-400 my-1">{weather.peakPrecipitationRate} mm/h</div>
                  <div className="text-[10px] text-slate-400">Live Forecast</div>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-surface-border">
                  <div className="text-slate-400 uppercase text-[10px]">Light Scenario</div>
                  <div className="text-base font-bold text-white my-1">7.5 mm/h</div>
                  <div className="text-[10px] text-slate-400">Mild seasonal rain</div>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-surface-border">
                  <div className="text-slate-400 uppercase text-[10px]">Moderate Scenario</div>
                  <div className="text-base font-bold text-white my-1">35.0 mm/h</div>
                  <div className="text-[10px] text-slate-400">Active monsoon burst</div>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-surface-border">
                  <div className="text-slate-400 uppercase text-[10px]">Heavy Scenario</div>
                  <div className="text-base font-bold text-white my-1">65.0 mm/h</div>
                  <div className="text-[10px] text-slate-400">Severe thunderstorm</div>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-surface-border">
                  <div className="text-slate-400 uppercase text-[10px]">Extreme Scenario</div>
                  <div className="text-base font-bold text-white my-1">115.0 mm/h</div>
                  <div className="text-[10px] text-slate-400">Cloudburst benchmark</div>
                </div>
              </div>
            </div>

            {/* Scientific and Attribution Notice */}
            <div className="p-4 rounded-xl bg-surface border border-surface-border text-xs text-slate-400 space-y-1 font-mono">
              <div>• Weather data provided by <a href="https://open-meteo.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Open-Meteo</a> under CC BY 4.0 license.</div>
              <div>• Atmospheric model output reflects forecast precipitation, not local urban street runoff or river stage gauges.</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
