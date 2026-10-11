import { useEffect, useState, useCallback } from "react";
import {
  fetchWeatherForecast,
  type ProcessedWeatherForecast,
  WeatherServiceError,
} from "../api/weather";
import type { CandidateZone } from "../api/types";
import AssessmentCard from "./AssessmentCard";

interface WeatherCardProps {
  selectedZone: CandidateZone | null;
  onApplyForecastRate?: (rateMmHr: number) => void;
  activeCustomRate?: number | null;
}

export default function WeatherCard({
  selectedZone,
  onApplyForecastRate,
  activeCustomRate,
}: WeatherCardProps) {
  const [weather, setWeather] = useState<ProcessedWeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = useCallback(
    async (lat: number, lon: number, signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchWeatherForecast(lat, lon, signal);
        setWeather(data);
      } catch (err: unknown) {
        if (err instanceof WeatherServiceError && err.code === "ABORTED") {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Failed to retrieve Open-Meteo weather forecast."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedZone) {
      setWeather(null);
      return;
    }
    setWeather(null);
    const controller = new AbortController();
    const [lon, lat] = selectedZone.coordinates;
    loadWeather(lat, lon, controller.signal);

    return () => {
      controller.abort();
    };
  }, [selectedZone, loadWeather]);

  if (!selectedZone) {
    return null;
  }

  const isForecastRateApplied =
    weather &&
    activeCustomRate !== null &&
    Math.abs((activeCustomRate ?? 0) - weather.peakPrecipitationRate) < 0.05;

  return (
    <div className="p-4 border-b border-border-subtle bg-surface-primary space-y-3">
      {/* Primary Weather Check Card */}
      <AssessmentCard
        title="Open-Meteo Weather Forcing"
        context="Operational Numerical Weather Prediction (NWP) 72-hour precipitation forecast."
        status={
          isLoading
            ? { label: "Querying NWP", tone: "muted" }
            : error
            ? { label: "Ingestion Gap", tone: "warning" }
            : weather
            ? { label: "72h Forecast", tone: "accent" }
            : undefined
        }
        result={
          isLoading ? (
            <div className="space-y-2 py-1">
              <div className="skeleton h-4 w-36" />
              <div className="skeleton h-8 w-full" />
            </div>
          ) : error ? (
            <div className="space-y-2">
              <p className="text-xs text-warning-primary font-mono">{error}</p>
              <button
                type="button"
                onClick={() => {
                  const [lon, lat] = selectedZone.coordinates;
                  loadWeather(lat, lon);
                }}
                className="text-2xs text-accent hover:text-accent-emphasis underline font-mono"
              >
                Retry ingestion
              </button>
            </div>
          ) : weather ? (
            <div className="space-y-3">
              {/* Key Readings Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-surface-secondary border border-border-subtle p-2 rounded">
                  <div className="text-[10px] text-text-muted uppercase font-mono">
                    24h Accum.
                  </div>
                  <div className="text-sm font-semibold text-text-primary font-mono mt-0.5">
                    {weather.totalPrecipitation24h}{" "}
                    <span className="text-[10px] text-text-muted font-normal">mm</span>
                  </div>
                </div>

                <div className="bg-surface-secondary border border-border-subtle p-2 rounded">
                  <div className="text-[10px] text-text-muted uppercase font-mono">
                    72h Total
                  </div>
                  <div className="text-sm font-semibold text-text-primary font-mono mt-0.5">
                    {weather.totalPrecipitation72h}{" "}
                    <span className="text-[10px] text-text-muted font-normal">mm</span>
                  </div>
                </div>

                <div className="bg-surface-secondary border border-border-subtle p-2 rounded">
                  <div className="text-[10px] text-text-muted uppercase font-mono">
                    Peak Rate
                  </div>
                  <div className="text-sm font-semibold text-accent font-mono mt-0.5">
                    {weather.peakPrecipitationRate}{" "}
                    <span className="text-[10px] text-text-muted font-normal">mm/h</span>
                  </div>
                </div>
              </div>

              {/* 24h Hourly Precipitation Mini Chart */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mb-1">
                  <span>24-Hour Precipitation Curve</span>
                  <span>Max: {weather.peakPrecipitationRate} mm/h</span>
                </div>
                <div className="h-10 flex items-end gap-[2px] bg-surface-secondary p-1 rounded border border-border-subtle">
                  {weather.hourly.slice(0, 24).map((h) => {
                    const maxVal = Math.max(1, weather.peakPrecipitationRate);
                    const heightPct = Math.min(100, (h.precipitationMm / maxVal) * 100);
                    return (
                      <div
                        key={h.time}
                        className="flex-1 bg-charcoal-brown-600 hover:bg-accent transition-colors rounded-t-[1px]"
                        style={{ height: `${Math.max(4, heightPct)}%` }}
                        title={`${h.time.slice(11, 16)}: ${h.precipitationMm} mm`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] font-mono text-text-muted mt-0.5">
                  <span>Now</span>
                  <span>+12h</span>
                  <span>+24h</span>
                </div>
              </div>

              {/* Action: Apply Forecast Peak Rate */}
              {onApplyForecastRate && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onApplyForecastRate(
                        weather.peakPrecipitationRate > 0
                          ? weather.peakPrecipitationRate
                          : 1.0
                      )
                    }
                    className={`w-full py-2 px-3 rounded text-xs font-medium font-mono flex items-center justify-center gap-2 border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                      isForecastRateApplied
                        ? "bg-floral-white-950 text-accent-text border-accent"
                        : "bg-surface-secondary hover:bg-surface-elevated text-text-primary border-border-subtle hover:border-border-strong"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {isForecastRateApplied
                      ? `Forcing Applied (${weather.peakPrecipitationRate} mm/h)`
                      : `Apply Forecast Peak Rate (${weather.peakPrecipitationRate} mm/h)`}
                  </button>
                </div>
              )}
            </div>
          ) : null
        }
        supportingInfo="Operational NWP via Open-Meteo. Atmospheric forecast, not in-situ ground gauge observation."
      />
    </div>
  );
}
