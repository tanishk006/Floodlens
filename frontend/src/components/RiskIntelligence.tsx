import { useState } from "react";
import type { CandidateZone, RiskScoreResult, FactorContribution } from "../api/types";

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
      <section className="px-4 py-8 text-center">
        <div className="w-10 h-10 rounded-full bg-surface-overlay border border-surface-border flex items-center justify-center mx-auto mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-text-disabled">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
          </svg>
        </div>
        <p className="text-sm text-text-muted">Select a monitoring zone</p>
        <p className="text-2xs text-text-disabled mt-1">
          Click a marker on the map or use the zone selector above
        </p>
      </section>
    );
  }

  const isInsufficient =
    riskResult?.data_quality.status === "insufficient_data" ||
    riskResult?.risk_index === null;

  return (
    <section className="flex-1">
      {/* Score display */}
      <div className="px-4 py-4 border-b border-surface-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xs font-data text-text-muted uppercase tracking-wider">
            Susceptibility Index
          </span>
          <span className="text-2xs font-data text-text-disabled">
            Scale 0–100
          </span>
        </div>

        {isEstimating ? (
          <div className="mt-3">
            <div className="skeleton h-10 w-24 mb-2" />
            <div className="skeleton h-4 w-40" />
          </div>
        ) : isInsufficient ? (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-display font-bold text-text-disabled">
                —
              </span>
              <span className="risk-badge-insufficient text-2xs px-2 py-0.5 rounded-xs font-data">
                Insufficient Data
              </span>
            </div>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">
              No real DEM or documented terrain observations are connected for this
              zone. A score cannot be computed without real environmental data.
            </p>
          </div>
        ) : riskResult ? (
          <div className="mt-2 animate-fade-in">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-display font-bold text-text-primary tabular-nums">
                {riskResult.risk_index?.toFixed(1)}
              </span>
              <RiskCategoryBadge category={riskResult.risk_category} />
            </div>
            <p className="text-2xs text-text-disabled mt-1 font-data">
              Deterministic relative index · is_probability = false
            </p>

            {/* Score bar */}
            <div className="mt-3 h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(100, riskResult.risk_index ?? 0)}%`,
                  backgroundColor: getRiskCategoryColor(
                    riskResult.risk_category
                  ),
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-2xs font-data text-text-disabled">
              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
              <span>Severe</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Factor breakdown */}
      {riskResult && riskResult.factors.length > 0 && (
        <div className="px-4 py-3 border-b border-surface-border">
          <h3 className="text-2xs font-data text-text-muted uppercase tracking-wider mb-2.5">
            Contributing Factors
          </h3>
          <div className="space-y-2">
            {riskResult.factors.map((factor) => (
              <FactorRow key={factor.factor_name} factor={factor} />
            ))}
          </div>
        </div>
      )}

      {/* Data quality & missing inputs */}
      {riskResult?.data_quality.missing_inputs &&
        riskResult.data_quality.missing_inputs.length > 0 && (
          <div className="px-4 py-3 border-b border-surface-border">
            <h3 className="text-2xs font-data text-text-muted uppercase tracking-wider mb-2">
              Prerequisites Needed:
            </h3>
            <div className="space-y-1">
              {riskResult.data_quality.missing_inputs.map((input) => (
                <div
                  key={input}
                  className="flex items-start gap-2 text-xs text-text-secondary"
                >
                  <span className="text-risk-moderate mt-0.5">⚠</span>
                  <span className="font-data text-2xs">{input}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Scenario info */}
      {riskResult?.scenario && (
        <div className="px-4 py-3 border-b border-surface-border">
          <h3 className="text-2xs font-data text-text-muted uppercase tracking-wider mb-2">
            Active Scenario
          </h3>
          <div className="bg-surface rounded border border-surface-border p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">
                {riskResult.scenario.label}
              </span>
              <span className="font-data text-xs text-accent">
                {riskResult.scenario.rainfall_mm_per_hour} mm/h
              </span>
            </div>
            <p className="text-2xs text-text-disabled mt-1 leading-relaxed">
              {riskResult.scenario.assumption}
            </p>
          </div>
        </div>
      )}

      {/* Technical details toggle */}
      <div className="px-4 py-3">
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className="text-2xs font-medium text-accent hover:text-accent-dim transition-colors"
        >
          {showTechnical ? "Hide" : "Show"} Technical Details
        </button>

        {showTechnical && riskResult && (
          <div className="mt-3 space-y-2 text-2xs font-data text-text-muted animate-fade-in">
            <div className="flex justify-between">
              <span>Model Version</span>
              <span className="text-text-secondary">
                {riskResult.model_version}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Generated At</span>
              <span className="text-text-secondary">
                {new Date(riskResult.generated_at).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Data Quality</span>
              <span className="text-text-secondary">
                {riskResult.data_quality.status}
              </span>
            </div>
            {riskResult.data_quality.warnings.length > 0 && (
              <div className="mt-2 border-t border-surface-border pt-2">
                <span className="text-text-disabled block mb-1">Warnings:</span>
                {riskResult.data_quality.warnings.map((w, i) => (
                  <p key={i} className="text-text-muted text-2xs leading-relaxed">
                    {w}
                  </p>
                ))}
              </div>
            )}
            {riskResult.limitations.length > 0 && (
              <div className="mt-2 border-t border-surface-border pt-2">
                <span className="text-text-disabled block mb-1">
                  Operational Limitations:
                </span>
                {riskResult.limitations.map((l, i) => (
                  <p key={i} className="text-text-muted text-2xs leading-relaxed mb-1">
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

function FactorRow({ factor }: { factor: FactorContribution }) {
  const label = formatFactorName(factor.factor_name);

  return (
    <div className="flex items-center gap-2">
      {/* Availability indicator */}
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          factor.available ? "bg-accent" : "bg-text-disabled"
        }`}
      />

      {/* Factor info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-text-primary font-medium truncate">
            {label}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {factor.available && factor.normalized_value !== null && (
              <div className="w-16 h-1 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{
                    width: `${Math.min(100, factor.normalized_value * 100)}%`,
                  }}
                />
              </div>
            )}
            <span className="text-2xs font-data text-text-muted w-10 text-right">
              {factor.available && factor.weighted_score !== null
                ? factor.weighted_score.toFixed(1)
                : "—"}
            </span>
          </div>
        </div>
        <p className="text-2xs text-text-disabled truncate mt-0.5">
          {factor.interpretation}
        </p>
      </div>
    </div>
  );
}

function RiskCategoryBadge({ category }: { category: string }) {
  const classes: Record<string, string> = {
    low: "risk-badge-low",
    moderate: "risk-badge-moderate",
    high: "risk-badge-high",
    severe: "risk-badge-severe",
    insufficient_data: "risk-badge-insufficient",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-data rounded-xs uppercase tracking-wide ${
        classes[category] || classes.insufficient_data
      }`}
    >
      {category.replace("_", " ")}
    </span>
  );
}

function getRiskCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    low: "#34D399",
    moderate: "#FBBF24",
    high: "#F97316",
    severe: "#EF4444",
  };
  return colors[category] || "#64748B";
}

function formatFactorName(name: string): string {
  const labels: Record<string, string> = {
    low_elevation: "Elevation",
    local_relief: "Local Relief",
    slope: "Terrain Slope",
    flow_accumulation: "Flow Accumulation",
    rainfall: "Rainfall Intensity",
  };
  return labels[name] || name.replace(/_/g, " ");
}
