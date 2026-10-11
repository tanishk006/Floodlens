import { useState } from "react";
import type { CandidateZone, RiskScoreResult, FactorContribution } from "../api/types";
import AssessmentCard from "./AssessmentCard";

interface RiskIntelligenceProps {
  zone: CandidateZone | null;
  riskResult: RiskScoreResult | null;
  isEstimating: boolean;
}

export default function RiskIntelligence({
  zone,
  riskResult,
  isEstimating,
}: RiskIntelligenceProps) {
  const [showTechnical, setShowTechnical] = useState(false);

  if (!zone) {
    return (
      <section className="px-4 py-8 text-center bg-surface-primary">
        <div className="w-10 h-10 rounded bg-surface-secondary border border-border-subtle flex items-center justify-center mx-auto mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-text-disabled">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
          </svg>
        </div>
        <p className="text-xs font-medium text-text-primary">Select a monitoring zone</p>
        <p className="text-2xs text-text-muted mt-1">
          Click a marker on the map or select a candidate zone from the list above.
        </p>
      </section>
    );
  }

  const isInsufficient =
    riskResult?.data_quality.status === "insufficient_data" ||
    riskResult?.risk_index === null;

  return (
    <section className="flex-1 bg-surface-primary p-4 space-y-4">
      {/* 1. Primary Risk Overview Assessment Card */}
      <AssessmentCard
        title="Relative Susceptibility Index"
        context="Exploratory heuristic aggregation of physical factors for comparative zone ranking."
        status={
          isInsufficient
            ? { label: "Insufficient Data", tone: "muted" }
            : riskResult
            ? {
                label: riskResult.risk_category.replace("_", " ").toUpperCase(),
                tone:
                  riskResult.risk_category === "high" || riskResult.risk_category === "severe"
                    ? "warning"
                    : "accent",
              }
            : undefined
        }
        result={
          isEstimating ? (
            <div className="space-y-1.5 py-1">
              <div className="skeleton h-8 w-24" />
              <div className="skeleton h-3 w-44" />
            </div>
          ) : isInsufficient ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-display font-semibold text-text-disabled">
                  —
                </span>
                <span className="risk-badge-insufficient text-2xs px-2 py-0.5 rounded font-mono">
                  Insufficient Data
                </span>
              </div>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                No real DEM or documented terrain observations are connected for this
                zone. A score cannot be computed without real environmental data.
              </p>
            </div>
          ) : riskResult ? (
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-display font-bold text-text-primary tabular-nums">
                  {riskResult.risk_index?.toFixed(1)}
                </span>
                <span className="text-xs text-text-muted font-mono">/ 100</span>
              </div>

              {/* Score bar */}
              <div className="mt-2.5 h-1.5 bg-surface-secondary border border-border-subtle rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, riskResult.risk_index ?? 0)}%`,
                    backgroundColor: getRiskColor(riskResult.risk_category),
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] font-mono text-text-muted">
                <span>Low</span>
                <span>Moderate</span>
                <span>High</span>
                <span>Severe</span>
              </div>
            </div>
          ) : null
        }
        supportingInfo={
          <div className="space-y-1">
            <div>• Deterministic relative index · is_probability = false</div>
            <div>• Exploratory heuristic: Not a hydraulic wave simulation or official warning guarantee.</div>
          </div>
        }
      />

      {/* 2. Prerequisites Needed Card (if missing inputs exist) */}
      {riskResult?.data_quality.missing_inputs &&
        riskResult.data_quality.missing_inputs.length > 0 && (
          <AssessmentCard
            title="Prerequisites Needed:"
            context="Required environmental raster inputs not yet ingested for this zone."
            status={{ label: "Data Gap", tone: "warning" }}
            result={
              <ul className="space-y-1.5">
                {riskResult.data_quality.missing_inputs.map((input) => (
                  <li
                    key={input}
                    className="flex items-start gap-2 text-xs text-text-secondary"
                  >
                    <span className="text-warning-primary flex-shrink-0">⚠</span>
                    <span className="font-mono text-2xs">{input}</span>
                  </li>
                ))}
              </ul>
            }
            supportingInfo="Ingestion of 1 arc-sec Copernicus DEM GLO-30 tile required to synthesize missing topographic layers."
          />
        )}

      {/* 3. Individual Factor Assessment Cards (Every check gets its own card) */}
      {riskResult && riskResult.factors.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono text-text-muted uppercase tracking-wider">
              Terrain & Atmospheric Factor Assessments
            </span>
            <span className="text-2xs font-mono text-text-muted">
              {riskResult.factors.filter((f) => f.available).length} / {riskResult.factors.length} available
            </span>
          </div>

          {riskResult.factors.map((factor) => (
            <FactorAssessmentCard key={factor.factor_name} factor={factor} />
          ))}
        </div>
      )}

      {/* 4. Active Scenario Details Card */}
      {riskResult?.scenario && (
        <AssessmentCard
          title="Active Rainfall Scenario"
          context={riskResult.scenario.label}
          status={{ label: `${riskResult.scenario.rainfall_mm_per_hour} mm/h`, tone: "accent" }}
          result={
            <p className="text-2xs text-text-secondary leading-relaxed font-mono">
              {riskResult.scenario.assumption}
            </p>
          }
          supportingInfo="Rate applied uniformly across localized subcatchment calculation."
        />
      )}

      {/* 5. Technical Details & Data Provenance */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowTechnical(!showTechnical)}
          className="text-2xs font-medium text-accent hover:text-accent-emphasis transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded px-1"
        >
          {showTechnical ? "Hide" : "Show"} Technical Details
        </button>

        {showTechnical && riskResult && (
          <div className="mt-3 p-3 bg-surface-secondary border border-border-subtle rounded space-y-2 text-2xs font-mono text-text-muted">
            <div className="flex justify-between">
              <span>Model Version</span>
              <span className="text-text-primary">{riskResult.model_version}</span>
            </div>
            <div className="flex justify-between">
              <span>Generated At</span>
              <span className="text-text-primary">
                {new Date(riskResult.generated_at).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Data Quality</span>
              <span className="text-text-primary">{riskResult.data_quality.status}</span>
            </div>

            {riskResult.data_quality.warnings.length > 0 && (
              <div className="pt-2 border-t border-border-subtle/60">
                <span className="text-text-muted block mb-1 font-semibold">Warnings:</span>
                {riskResult.data_quality.warnings.map((w, i) => (
                  <p key={i} className="text-text-secondary leading-relaxed">
                    {w}
                  </p>
                ))}
              </div>
            )}

            {riskResult.limitations.length > 0 && (
              <div className="pt-2 border-t border-border-subtle/60">
                <span className="text-text-muted block mb-1 font-semibold">
                  Operational Limitations:
                </span>
                {riskResult.limitations.map((l, i) => (
                  <p key={i} className="text-text-secondary leading-relaxed mb-0.5">
                    {l}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Individual Factor Assessment Card Component
// -----------------------------------------------------------------------------

function FactorAssessmentCard({ factor }: { factor: FactorContribution }) {
  const metadata = getFactorMetadata(factor.factor_name);

  // Formatting result: Never show 0 for missing data
  let resultText = "Unavailable for this zone.";
  if (factor.available && factor.raw_value !== null) {
    resultText = `${factor.raw_value.toFixed(2)} ${metadata.unit}`;
  } else if (!factor.available) {
    resultText = metadata.unavailableExplanation;
  }

  return (
    <AssessmentCard
      compact
      title={metadata.title}
      context={metadata.context}
      status={
        factor.available
          ? { label: `Weight ${(factor.weight * 100).toFixed(0)}%`, tone: "neutral" }
          : { label: "Unavailable", tone: "muted" }
      }
      result={
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-xs font-mono font-medium ${factor.available ? "text-text-primary" : "text-text-muted"}`}>
            {resultText}
          </span>
          {factor.available && factor.weighted_score !== null && (
            <span className="text-2xs font-mono text-accent">
              +{factor.weighted_score.toFixed(1)} pts
            </span>
          )}
        </div>
      }
      supportingInfo={`Source: ${metadata.source}`}
    >
      {factor.available && factor.normalized_value !== null && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1 bg-surface-secondary border border-border-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full"
              style={{
                width: `${Math.min(100, factor.normalized_value * 100)}%`,
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-text-muted whitespace-nowrap">
            Norm: {factor.normalized_value.toFixed(2)}
          </span>
        </div>
      )}
    </AssessmentCard>
  );
}

function getFactorMetadata(name: string): {
  title: string;
  context: string;
  unit: string;
  source: string;
  unavailableExplanation: string;
} {
  switch (name) {
    case "slope":
      return {
        title: "Slope Analysis",
        context: "Terrain steepness at the selected analysis location.",
        unit: "°",
        source: "Copernicus DEM GLO-30",
        unavailableExplanation: "Slope data absent. DEM raster not validated.",
      };
    case "low_elevation":
      return {
        title: "Elevation Check",
        context: "Ground elevation relative to regional datum.",
        unit: "m",
        source: "Copernicus DEM GLO-30",
        unavailableExplanation: "Elevation data absent. No connected DEM.",
      };
    case "local_relief":
      return {
        title: "Local Relief Analysis",
        context: "Neighborhood elevation range within 100m radius.",
        unit: "m",
        source: "Copernicus DEM GLO-30",
        unavailableExplanation: "Local relief absent. Micro-catchment window unverified.",
      };
    case "flow_accumulation":
      return {
        title: "Flow Accumulation Analysis",
        context: "Upslope contributing area via D8 flow routing.",
        unit: "cells",
        source: "Copernicus DEM GLO-30 / D8 Routing",
        unavailableExplanation: "Unavailable for this zone. Upstream terrain coverage has not been validated.",
      };
    case "rainfall":
      return {
        title: "Rainfall Intensity Forcing",
        context: "Exploratory precipitation rate for study scenario.",
        unit: "mm/h",
        source: "Scenario Configuration",
        unavailableExplanation: "Rainfall forcing rate not assigned.",
      };
    default:
      return {
        title: name.replace(/_/g, " "),
        context: "Hydrological input factor",
        unit: "",
        source: "FloodLens Analysis Engine",
        unavailableExplanation: "Unavailable for this zone.",
      };
  }
}

function getRiskColor(category: string): string {
  switch (category) {
    case "low":
      return "#766a56"; // Dust grey / muted olive
    case "moderate":
      return "#cc9c00"; // Warm gold
    case "high":
      return "#bb4111"; // Spicy Paprika
    case "severe":
      return "#8c310d"; // Deep Paprika
    default:
      return "#514d48"; // Charcoal brown
  }
}
