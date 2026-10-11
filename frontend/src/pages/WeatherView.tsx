import { useState, useEffect } from "react";
import type { CandidateZone } from "../api/types";
import {
  fetchWeatherForecast,
  type ProcessedWeatherForecast,
  WeatherServiceError,
} from "../api/weather";
import AssessmentCard from "../components/AssessmentCard";

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
    <div className="h-full overflow-y-auto bg-[#131211] p-6 md:p-10 text-text-primary">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-border-subtle pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-mono bg-floral-white-950 text-accent-text border border-floral-white-800 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span>NWP ATMOSPHERIC FORCING INTELLIGENCE</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Real-Time Weather & Precipitation Forecast
            </h1>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">
              Numerical Weather Prediction (NWP) precipitation forcing via Open-Meteo across Indian candidate zones.
            </p>
          </div>

          {/* Zone Selector dropdown */}
          <div className="flex items-center gap-2.5">
            <label htmlFor="zone-select" className="text-xs font-mono text-text-muted uppercase">
              Zone:
            </label>
            <select
              id="zone-select"
              value={selectedZone?.id ?? ""}
              onChange={(e) => onSelectZone(e.target.value)}
              className="bg-surface-primary border border-border-subtle rounded px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Zone Geo-header Card */}
        {selectedZone && (
          <div className="p-4 rounded bg-surface-primary border border-border-subtle flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-text-muted">Locality: </span>
                <strong className="text-text-primary">{selectedZone.name}</strong>
              </div>
              <div className="border-l border-border-subtle pl-4">
                <span className="text-text-muted">Coordinates: </span>
                <span className="text-accent font-mono">
                  [{selectedZone.coordinates[0].toFixed(4)}, {selectedZone.coordinates[1].toFixed(4)}]
                </span>
              </div>
            </div>

            {weather && (
              <div className="flex items-center gap-4 text-text-muted">
                <div>Timezone: <span className="text-text-secondary">{weather.timezone}</span></div>
                <div>Elevation: <span className="text-text-secondary">{weather.elevationM}m</span></div>
                <div>Updated: <span className="text-text-secondary">{new Date(weather.retrievedAt).toLocaleTimeString()}</span></div>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center space-y-3 bg-surface-primary rounded border border-border-subtle">
            <div className="w-2 h-2 rounded-full bg-accent mx-auto" />
            <p className="text-xs font-mono text-text-muted">
              Fetching Open-Meteo precipitation forecasts…
            </p>
          </div>
        ) : error ? (
          <div className="p-5 rounded bg-surface-primary border border-warning-primary text-text-primary space-y-2">
            <div className="flex items-center gap-2 text-warning-primary text-xs font-semibold">
              <span>⚠</span>
              <span>Weather Telemetry Failed</span>
            </div>
            <p className="text-xs text-text-secondary">{error}</p>
          </div>
        ) : weather ? (
          <div className="space-y-6">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AssessmentCard
                title="24h Total Rain"
                context="Cumulative precipitation next 24 hours."
                result={
                  <div className="text-2xl font-bold font-mono text-text-primary">
                    {weather.totalPrecipitation24h}{" "}
                    <span className="text-xs font-normal text-text-muted">mm</span>
                  </div>
                }
                supportingInfo="Open-Meteo High-Resolution NWP"
              />

              <AssessmentCard
                title="72h Total Rain"
                context="Full 3-day projection horizon."
                result={
                  <div className="text-2xl font-bold font-mono text-text-primary">
                    {weather.totalPrecipitation72h}{" "}
                    <span className="text-xs font-normal text-text-muted">mm</span>
                  </div>
                }
                supportingInfo="Accumulated across 72 hourly steps"
              />

              <AssessmentCard
                title="Peak Intensity"
                context="Maximum 1-hour rate in horizon."
                status={
                  weather.peakPrecipitationRate > 50
                    ? { label: "Severe", tone: "warning" }
                    : { label: "Normal", tone: "neutral" }
                }
                result={
                  <div className="text-2xl font-bold font-mono text-accent">
                    {weather.peakPrecipitationRate}{" "}
                    <span className="text-xs font-normal text-text-muted">mm/h</span>
                  </div>
                }
                supportingInfo={
                  weather.peakPrecipitationTime
                    ? `Occurring ${new Date(weather.peakPrecipitationTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                    : "No storm peak detected"
                }
              />

              <AssessmentCard
                title="Risk Integration"
                context="Apply forecast peak in scenario lab."
                action={{
                  label: "Apply in Scenario Lab →",
                  onClick: () =>
                    onApplyForecastToRisk(
                      weather.peakPrecipitationRate > 0
                        ? weather.peakPrecipitationRate
                        : 1.0
                    ),
                }}
                result={
                  <p className="text-2xs text-text-secondary font-mono leading-relaxed">
                    Injects operational {weather.peakPrecipitationRate} mm/h peak rate directly into the exploratory susceptibility engine.
                  </p>
                }
                supportingInfo="Links NWP forcing to terrain heuristics"
              />
            </div>

            {/* 72-Hour Precipitation Chart Card */}
            <AssessmentCard
              title="72-Hour Hourly Precipitation Distribution"
              context="Temporal distribution in mm/hr from Open-Meteo Numerical Weather Prediction."
              status={{ label: `Peak: ${weather.peakPrecipitationRate} mm/h`, tone: "accent" }}
              supportingInfo="Hourly rainfall forcing steps. Bar height represents relative intensity."
            >
              <div className="mt-3">
                <div className="h-44 flex items-end gap-[2px] bg-surface-secondary p-3 rounded border border-border-subtle overflow-x-auto">
                  {weather.hourly.map((item, idx) => {
                    const maxRate = Math.max(1, weather.peakPrecipitationRate);
                    const heightPercent = Math.min(100, (item.precipitationMm / maxRate) * 100);
                    const isDayStart = idx % 24 === 0;

                    return (
                      <div
                        key={item.time}
                        className="flex-1 min-w-[10px] h-full flex flex-col justify-end group relative"
                        title={`${item.time}: ${item.precipitationMm} mm`}
                      >
                        <div
                          className={`w-full rounded-t transition-colors ${
                            item.precipitationMm > 0
                              ? "bg-charcoal-brown-600 group-hover:bg-accent"
                              : "bg-surface-primary"
                          }`}
                          style={{ height: `${Math.max(4, heightPercent)}%` }}
                        />
                        {isDayStart && (
                          <div className="absolute -bottom-5 left-0 text-[9px] font-mono text-text-muted whitespace-nowrap">
                            Day {Math.floor(idx / 24) + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="pt-6 text-2xs font-mono text-text-muted flex justify-between">
                  <span>0h (Forecast start)</span>
                  <span>24h</span>
                  <span>48h</span>
                  <span>72h (Forecast horizon)</span>
                </div>
              </div>
            </AssessmentCard>

            {/* Scenario Benchmark Comparison Matrix Card */}
            <AssessmentCard
              title="Forecast Forcing vs. FloodLens Standard Scenarios"
              context="Benchmark comparison against established scenario thresholds."
              supportingInfo="Values compare operational meteorological rates with model testing scenarios."
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-mono mt-3">
                <div className={`p-3 rounded border ${weather.peakPrecipitationRate <= 7.5 ? "bg-floral-white-950 border-accent text-accent-text" : "bg-surface-secondary border-border-subtle"}`}>
                  <div className="text-text-muted uppercase text-[10px]">Forecast Peak</div>
                  <div className="text-base font-bold text-accent my-1">{weather.peakPrecipitationRate} mm/h</div>
                  <div className="text-[10px] text-text-muted">Live Forecast</div>
                </div>

                <div className="p-3 rounded bg-surface-secondary border border-border-subtle">
                  <div className="text-text-muted uppercase text-[10px]">Light Scenario</div>
                  <div className="text-base font-bold text-text-primary my-1">7.5 mm/h</div>
                  <div className="text-[10px] text-text-muted">Mild seasonal rain</div>
                </div>

                <div className="p-3 rounded bg-surface-secondary border border-border-subtle">
                  <div className="text-text-muted uppercase text-[10px]">Moderate Scenario</div>
                  <div className="text-base font-bold text-text-primary my-1">35.0 mm/h</div>
                  <div className="text-[10px] text-text-muted">Active monsoon burst</div>
                </div>

                <div className="p-3 rounded bg-surface-secondary border border-border-subtle">
                  <div className="text-text-muted uppercase text-[10px]">Heavy Scenario</div>
                  <div className="text-base font-bold text-text-primary my-1">65.0 mm/h</div>
                  <div className="text-[10px] text-text-muted">Severe thunderstorm</div>
                </div>

                <div className="p-3 rounded bg-surface-secondary border border-border-subtle">
                  <div className="text-text-muted uppercase text-[10px]">Extreme Scenario</div>
                  <div className="text-base font-bold text-text-primary my-1">115.0 mm/h</div>
                  <div className="text-[10px] text-text-muted">Cloudburst benchmark</div>
                </div>
              </div>
            </AssessmentCard>

            {/* Scientific Notice */}
            <div className="p-4 rounded bg-surface-primary border border-border-subtle text-xs text-text-muted space-y-1 font-mono">
              <div>• Weather data provided by <a href="https://open-meteo.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">Open-Meteo</a> under CC BY 4.0 license.</div>
              <div>• Atmospheric model output reflects numerical forecast precipitation, not local urban street runoff or river stage gauges.</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
