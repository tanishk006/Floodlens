import { useEffect, useState } from "react";
import type { CandidateZone, RiskScoreResult } from "../api/types";
import {
  fetchHydrologyIntelligence,
  type HydrologyIntelligence,
  HydrologyServiceError,
} from "../api/hydrology";
import AssessmentCard from "./AssessmentCard";

interface HydrologyCardProps {
  selectedZone: CandidateZone | null;
  riskResult: RiskScoreResult | null;
}

export default function HydrologyCard({
  selectedZone,
  riskResult,
}: HydrologyCardProps) {
  const [data, setData] = useState<HydrologyIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedZone) {
      setData(null);
      setError(null);
      return;
    }

    const [lon, lat] = selectedZone.coordinates;
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    fetchHydrologyIntelligence(lat, lon, controller.signal)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        if (err instanceof HydrologyServiceError && err.code === "ABORTED") return;
        setError(
          err instanceof Error ? err.message : "Failed to load live hydrology feed"
        );
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [selectedZone]);

  // Derive Topographic Wetness Index (TWI) ONLY if real backend features exist
  // Formula: ln(a / tan β). NEVER hardcode fallback values like 6.42 or 19.0!
  const slopeFactor = riskResult?.factors?.find((f) => f.factor_name === "slope");
  const flowAccFactor = riskResult?.factors?.find((f) => f.factor_name === "flow_accumulation");

  const hasTwiData =
    slopeFactor?.available &&
    slopeFactor.raw_value !== null &&
    flowAccFactor?.available &&
    flowAccFactor.raw_value !== null;

  const twiValue = hasTwiData
    ? Number(
        Math.log(
          (Math.max(1.0, flowAccFactor.raw_value!) * 30.87) /
            Math.tan(Math.max(0.05, slopeFactor.raw_value!) * (Math.PI / 180))
        ).toFixed(2)
      )
    : null;

  if (!selectedZone) return null;

  return (
    <div className="p-4 border-b border-border-subtle bg-surface-primary space-y-3">
      {/* 1. Basin Discharge Assessment Card */}
      <AssessmentCard
        title="Basin Drainage & River Discharge"
        context="Copernicus GloFAS upstream fluvial runoff telemetry."
        status={
          isLoading
            ? { label: "Querying GloFAS", tone: "muted" }
            : error
            ? { label: "Unavailable", tone: "warning" }
            : data
            ? {
                label: data.riverDischarge.status.replace("_", " ").toUpperCase(),
                tone:
                  data.riverDischarge.status === "high_flow"
                    ? "warning"
                    : data.riverDischarge.status === "elevated"
                    ? "accent"
                    : "neutral",
              }
            : undefined
        }
        result={
          isLoading ? (
            <div className="space-y-1 py-1">
              <div className="skeleton h-6 w-28" />
              <div className="skeleton h-3 w-40" />
            </div>
          ) : error ? (
            <p className="text-2xs text-text-muted font-mono">{error}</p>
          ) : data ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-text-primary">
                  {data.riverDischarge.currentM3s.toLocaleString()}
                </span>
                <span className="text-2xs text-text-muted font-mono">m³/s</span>
                <span className="text-2xs text-text-muted ml-auto font-mono">
                  7d Peak: {data.riverDischarge.peak7DayM3s.toLocaleString()} m³/s (
                  {data.riverDischarge.trend})
                </span>
              </div>

              {/* 7-Day Discharge Mini Bar Chart */}
              <div className="mt-2.5 pt-2 border-t border-border-subtle/60">
                <div className="text-[10px] text-text-muted mb-1 flex justify-between font-mono">
                  <span>7-Day Discharge Forecast</span>
                  <span>LISFLOOD Model</span>
                </div>
                <div className="grid grid-cols-7 gap-1 h-8 items-end bg-surface-secondary p-1 rounded border border-border-subtle">
                  {data.riverDischarge.daily.map((d) => {
                    const maxDaily = Math.max(
                      1,
                      ...data.riverDischarge.daily.map((x) => x.riverDischargeM3s)
                    );
                    const heightPercent = Math.max(
                      15,
                      Math.round((d.riverDischargeM3s / maxDaily) * 100)
                    );
                    return (
                      <div
                        key={d.date}
                        className="flex flex-col items-center gap-0.5 group relative"
                        title={`${d.date}: ${d.riverDischargeM3s} m³/s`}
                      >
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-charcoal-brown-600 group-hover:bg-accent rounded-t transition-colors"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null
        }
        supportingInfo="LISFLOOD GloFAS 0.1° gridded river network. Represents major catchment discharge."
      />

      {/* 2. Topsoil Saturation & TWI Checks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Antecedent Soil Moisture Check */}
        <AssessmentCard
          compact
          title="Antecedent Soil Moisture"
          context="ECMWF ERA5-Land topsoil saturation."
          status={
            data
              ? {
                  label: data.soilMoisture.antecedentCondition.toUpperCase(),
                  tone:
                    data.soilMoisture.antecedentCondition === "saturated"
                      ? "warning"
                      : "neutral",
                }
              : undefined
          }
          result={
            data ? (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold font-mono text-text-primary">
                    {data.soilMoisture.saturationPercent}%
                  </span>
                  <span className="text-2xs text-text-muted font-mono">
                    ({data.soilMoisture.topsoilM3m3} m³/m³)
                  </span>
                </div>
                <div className="w-full bg-surface-secondary h-1 rounded-full overflow-hidden mt-1.5 border border-border-subtle">
                  <div
                    style={{ width: `${data.soilMoisture.saturationPercent}%` }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
              </div>
            ) : (
              <span className="text-2xs text-text-muted font-mono">
                {isLoading ? "Querying..." : "Unavailable"}
              </span>
            )
          }
          supportingInfo={
            data ? `Runoff Coeff (C): ${data.soilMoisture.runoffCoefficient.toFixed(2)}` : undefined
          }
        />

        {/* Topographic Wetness Index (TWI) Check */}
        <AssessmentCard
          compact
          title="Topographic Wetness (TWI)"
          context="Ponding tendency index: ln(a/tan β)"
          status={
            hasTwiData
              ? { label: "Derived", tone: "neutral" }
              : { label: "DEM Pending", tone: "muted" }
          }
          result={
            hasTwiData && twiValue !== null ? (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold font-mono text-text-primary">
                    {twiValue}
                  </span>
                  <span className="text-2xs text-accent font-mono">ln(a/tan β)</span>
                </div>
                <div className="w-full bg-surface-secondary h-1 rounded-full overflow-hidden mt-1.5 border border-border-subtle">
                  <div
                    style={{ width: `${Math.min(100, (twiValue / 15) * 100)}%` }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
              </div>
            ) : (
              <span className="text-2xs text-text-muted font-mono leading-relaxed block">
                Unavailable for this zone. DEM features not validated.
              </span>
            )
          }
          supportingInfo={
            hasTwiData ? "Source: Copernicus DEM GLO-30 derivatives" : "Requires validated slope & flow accumulation"
          }
        />
      </div>
    </div>
  );
}
