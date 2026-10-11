import { useEffect, useState, useCallback } from "react";
import {
  fetchWeatherForecast,
  type ProcessedWeatherForecast,
  WeatherServiceError,
} from "../api/weather";
import type { CandidateZone } from "../api/types";

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
    // selectedZone.coordinates is [lon, lat]
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
    <div className="border-b border-surface-border p-4 bg-surface-raised/40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
          </span>
          <span className="text-2xs font-data uppercase tracking-wider text-slate-300 font-semibold">
            Open-Meteo Weather Forcing
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
          72h Forecast
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2 py-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-12 w-full rounded" />
        </div>
      ) : error ? (
        <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Weather Ingestion Notice</span>
            <button
              onClick={() => {
                const [lon, lat] = selectedZone.coordinates;
                loadWeather(lat, lon);
              }}
              className="text-accent underline text-2xs"
            >
              Retry
            </button>
          </div>
          <p className="text-[11px] text-rose-200/80">{error}</p>
        </div>
      ) : weather ? (
        <div className="space-y-3">
          {/* Summary Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-surface/60 border border-surface-border p-2 rounded">
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                24h Accum.
              </div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {weather.totalPrecipitation24h}{" "}
                <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-surface/60 border border-surface-border p-2 rounded">
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                72h Total
              </div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {weather.totalPrecipitation72h}{" "}
                <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-surface/60 border border-surface-border p-2 rounded">
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Peak Rate
              </div>
              <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                {weather.peakPrecipitationRate}{" "}
                <span className="text-[10px] font-normal text-slate-400">mm/h</span>
              </div>
            </div>
          </div>

          {/* Mini Chart: 24h Hourly Precipitation */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>Next 24 Hours Precipitation Curve</span>
              <span>Max: {weather.peakPrecipitationRate} mm/h</span>
            </div>
            <div className="h-10 flex items-end gap-[2px] bg-surface/80 p-1 rounded border border-surface-border">
              {weather.hourly.slice(0, 24).map((h) => {
                const maxVal = Math.max(1, weather.peakPrecipitationRate);
                const heightPct = Math.min(100, (h.precipitationMm / maxVal) * 100);
                return (
                  <div
                    key={h.time}
                    className="flex-1 bg-sky-500/30 hover:bg-cyan-400 transition-colors rounded-t-[1px] relative group"
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                    title={`${h.time.slice(11, 16)}: ${h.precipitationMm} mm`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>Now</span>
              <span>+12h</span>
              <span>+24h</span>
            </div>
          </div>

          {/* Action: Inject into Scenario Lab */}
          {onApplyForecastRate && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() =>
                  onApplyForecastRate(
                    weather.peakPrecipitationRate > 0 ? weather.peakPrecipitationRate : 1.0
                  )
                }
                className={`w-full py-2 px-3 rounded text-xs font-medium font-mono flex items-center justify-center gap-2 border transition-all ${
                  isForecastRateApplied
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                    : "bg-surface hover:bg-surface-overlay text-slate-200 border-surface-border hover:border-cyan-500/30"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {isForecastRateApplied
                  ? `Forcing Applied (${weather.peakPrecipitationRate} mm/h)`
                  : `Apply Forecast Peak Rate (${weather.peakPrecipitationRate} mm/h)`}
              </button>
            </div>
          )}

          {/* Scientific Disclaimer */}
          <div className="text-[10px] text-slate-400/80 leading-relaxed font-mono">
            * Operational forecast via Open-Meteo NWP model. Values represent atmospheric
            forecasts, not in-situ ground gauge observations or calibrated flood extent.
          </div>
        </div>
      ) : null}
    </div>
  );
}
