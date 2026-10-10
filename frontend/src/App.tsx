import { useEffect, useState } from "react";
import FloodMap from "./FloodMap";
import { estimateRisk, getHealth, getZones, ApiClientError } from "./api/client";
import type {
  CandidateZone,
  RiskScoreResult,
  ScenarioId,
} from "./api/types";

const SCENARIO_OPTIONS: { id: ScenarioId; label: string; mmHr: number }[] = [
  { id: "light", label: "Light", mmHr: 7.5 },
  { id: "moderate", label: "Moderate", mmHr: 35.0 },
  { id: "heavy", label: "Heavy", mmHr: 65.0 },
  { id: "extreme", label: "Extreme", mmHr: 115.0 },
];

export default function App() {
  const [zones, setZones] = useState<CandidateZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<ScenarioId>("moderate");
  const [riskResult, setRiskResult] = useState<RiskScoreResult | null>(null);

  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [isEstimating, setIsEstimating] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Initial load: Fetch health and candidate zones from FastAPI backend
  const loadInitialData = async () => {
    setIsLoadingZones(true);
    setBackendError(null);

    try {
      await getHealth();
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }

    try {
      const response = await getZones();
      setZones(response.zones);
      setApiOnline(true);
      // Select first zone by default if none selected
      if (response.zones.length > 0 && !selectedZoneId) {
        setSelectedZoneId(response.zones[0].id);
      }
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : "Failed to connect to backend server.";
      setBackendError(msg);
      setApiOnline(false);
    } finally {
      setIsLoadingZones(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Whenever selected zone or scenario changes, query POST /api/risk/estimate
  useEffect(() => {
    if (!selectedZoneId) return;

    let isCancelled = false;
    const fetchEstimate = async () => {
      setIsEstimating(true);
      try {
        const result = await estimateRisk({
          zone_id: selectedZoneId,
          scenario_id: scenario,
        });
        if (!isCancelled) {
          setRiskResult(result);
          setBackendError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          const msg =
            err instanceof ApiClientError
              ? err.message
              : "Failed to retrieve risk estimate.";
          setBackendError(msg);
        }
      } finally {
        if (!isCancelled) {
          setIsEstimating(false);
        }
      }
    };

    fetchEstimate();

    return () => {
      isCancelled = true;
    };
  }, [selectedZoneId, scenario]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || null;

  return (
    <div className="min-h-screen bg-paper font-ui text-ink flex flex-col">
      {/* Top Header */}
      <header className="border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2.5 px-5 py-3.5 sm:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <a
                className="font-display text-2xl font-semibold tracking-tight text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                href="#main"
              >
                FloodLens
              </a>
              <span className="text-xs font-data uppercase tracking-wider text-muted">
                Street-Level Flood Risk Intelligence
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-data">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  apiOnline === true
                    ? "bg-risk-low"
                    : apiOnline === false
                      ? "bg-risk-severe"
                      : "bg-muted"
                }`}
                aria-hidden="true"
              />
              <span className="text-muted">
                {apiOnline === true
                  ? "API Online"
                  : apiOnline === false
                    ? "API Offline"
                    : "Connecting..."}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-2 text-xs font-medium text-accent">
            <p>Experimental estimate. Not an official warning.</p>
            <p className="text-muted font-normal">Environmental Hacks 2026 | Heat and Water</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-[1440px] w-full flex-1 px-5 py-5 sm:px-8 sm:py-6" id="main">
        {/* Intro Summary Bar */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-medium sm:text-3xl">
              Candidate Monitoring Zones
            </h1>
            <p className="mt-0.5 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted">
              Select one of the 10 candidate states across India to inspect environmental indicators
              and simulate relative flood susceptibility under exploratory rainfall scenarios.
            </p>
          </div>
          <div className="text-right">
            <span className="border border-rule bg-paper px-2.5 py-1 text-xs font-data text-muted">
              {zones.length} candidate zones loaded
            </span>
          </div>
        </div>

        {/* Global Connection Warning */}
        {backendError && (
          <div
            className="mb-4 border-l-4 border-risk-severe bg-paper p-3 text-xs text-ink shadow-sm"
            role="alert"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-risk-severe">Backend Notice</p>
                <p className="mt-0.5 text-muted">{backendError}</p>
              </div>
              <button
                type="button"
                onClick={loadInitialData}
                className="shrink-0 border border-rule px-2 py-1 text-xs hover:border-accent hover:text-accent focus-visible:outline-accent"
              >
                Reconnect
              </button>
            </div>
          </div>
        )}

        {/* Main Grid: Map & Zones (Left) + Inspector Panel (Right) */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          {/* Map Column */}
          <section className="flex flex-col gap-4" aria-labelledby="map-section-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg" id="map-section-title">
                India Geographic Overview
              </h2>
              <span className="font-data text-xs text-muted">
                {selectedZone ? `Focused: ${selectedZone.name}` : "Click any marker to select"}
              </span>
            </div>

            {/* Map Canvas */}
            <div className="h-[460px] w-full sm:h-[520px]">
              <FloodMap
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={(id) => setSelectedZoneId(id)}
                mapErrorBanner={
                  apiOnline === false
                    ? "Backend unavailable. Run 'uvicorn app.main:app' to connect candidate zones."
                    : null
                }
                onRetry={loadInitialData}
              />
            </div>

            {/* Map Legend */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-rule bg-paper px-3.5 py-2 text-xs">
              <span className="font-medium text-ink">Susceptibility Index Key:</span>
              <div className="flex flex-wrap items-center gap-3 text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-low" aria-hidden="true" />
                  Low (0–25)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-moderate" aria-hidden="true" />
                  Moderate (25–50)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-high" aria-hidden="true" />
                  High (50–75)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-severe" aria-hidden="true" />
                  Severe (&gt;75)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted" aria-hidden="true" />
                  Insufficient Data
                </span>
              </div>
            </div>

            {/* Candidate Monitoring Zones Table */}
            <div className="border border-rule bg-paper">
              <div className="border-b border-rule px-3 py-2 flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-ink">
                  Monitoring Zone Directory
                </h3>
                <span className="text-[11px] text-muted font-data">
                  Select row to center map
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-rule text-muted bg-paper sticky top-0">
                      <th className="px-3 py-1.5 font-medium">State</th>
                      <th className="px-3 py-1.5 font-medium">Coordinates [Lon, Lat]</th>
                      <th className="px-3 py-1.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingZones ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-muted font-data">
                          Loading candidate zones from API...
                        </td>
                      </tr>
                    ) : zones.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-muted font-data">
                          No zones available. Ensure backend is running.
                        </td>
                      </tr>
                    ) : (
                      zones.map((zone) => {
                        const isSelected = zone.id === selectedZoneId;
                        return (
                          <tr
                            key={zone.id}
                            onClick={() => setSelectedZoneId(zone.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedZoneId(zone.id);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-pressed={isSelected}
                            className={`border-b border-rule/60 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                              isSelected
                                ? "bg-accent/10 font-semibold text-accent"
                                : "hover:bg-paper hover:text-accent"
                            }`}
                          >
                            <td className="px-3 py-2 flex items-center gap-1.5">
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full ${
                                  isSelected ? "bg-accent" : "bg-muted"
                                }`}
                              />
                              {zone.state}
                            </td>
                            <td className="px-3 py-2 font-data text-muted">
                              [{zone.coordinates[0].toFixed(2)}, {zone.coordinates[1].toFixed(2)}]
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-block border border-rule px-1.5 py-0.5 text-[10px] text-muted">
                                {zone.data_status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-rule px-3 py-1.5 text-[11px] text-muted">
                Candidate zones are exploratory regions. The historical million-hectare figures
                are unverified and not treated as flood-risk scores.
              </div>
            </div>
          </section>

          {/* Right Inspector & Controls Column */}
          <aside className="flex flex-col gap-5" aria-label="Zone assessment and rainfall simulator">
            {/* Rainfall Scenario Simulator Box */}
            <section className="border border-rule bg-paper p-4" aria-labelledby="scenario-title">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-data text-muted uppercase tracking-wider">
                  Scenario Simulator
                </span>
                <span className="font-data text-xs text-accent">
                  {isEstimating ? "Computing..." : "Ready"}
                </span>
              </div>
              <h2 className="mt-1 font-display text-lg" id="scenario-title">
                Rainfall Assumption
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Select an exploratory rainfall intensity to recalculate relative susceptibility.
                These are simulated stress rates, not weather forecasts.
              </p>

              {/* Scenario Toggle Buttons */}
              <div
                className="mt-3.5 grid grid-cols-4 border border-rule"
                role="group"
                aria-label="Supported rainfall scenarios"
              >
                {SCENARIO_OPTIONS.map((opt) => {
                  const isCurrent = scenario === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setScenario(opt.id)}
                      aria-pressed={isCurrent}
                      className={`flex flex-col items-center justify-center py-2 px-1 text-center transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                        isCurrent
                          ? "bg-accent text-paper font-semibold"
                          : "bg-paper text-ink hover:text-accent hover:bg-rule/20"
                      } ${opt.id !== "extreme" ? "border-r border-rule" : ""}`}
                    >
                      <span className="text-xs">{opt.label}</span>
                      <span className="font-data text-[10px] opacity-80">
                        {opt.mmHr} mm/h
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Screen reader live region */}
              <p className="sr-only" aria-live="polite">
                Rainfall scenario set to {scenario} with{" "}
                {SCENARIO_OPTIONS.find((s) => s.id === scenario)?.mmHr} mm per hour.
              </p>

              {riskResult && (
                <div className="mt-3 border-t border-rule pt-2 text-[11px] text-muted">
                  <span className="font-semibold text-ink">Model Note: </span>
                  {riskResult.scenario.assumption}
                </div>
              )}
            </section>

            {/* Selected Zone Assessment Card */}
            <section
              className="border border-rule bg-paper p-4 flex-1 flex flex-col justify-between"
              aria-labelledby="zone-assessment-title"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-data text-muted uppercase tracking-wider">
                      Selected Region
                    </span>
                    <h2 className="font-display text-xl" id="zone-assessment-title">
                      {selectedZone ? selectedZone.name : "No Zone Selected"}
                    </h2>
                  </div>
                  {selectedZone && (
                    <span className="border border-rule px-2 py-0.5 text-xs font-data text-muted">
                      {selectedZone.data_status}
                    </span>
                  )}
                </div>

                {selectedZone && (
                  <p className="mt-1 text-xs text-muted font-data">
                    Coordinates: [{selectedZone.coordinates[0].toFixed(4)},{" "}
                    {selectedZone.coordinates[1].toFixed(4)}] (EPSG:4326)
                  </p>
                )}

                {/* Score Status Block */}
                <div className="mt-4 border border-rule p-3 bg-paper">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Relative Susceptibility Index</span>
                    <span className="font-data">Scale 0–100</span>
                  </div>

                  {isEstimating ? (
                    <div className="py-4 text-center text-xs text-muted font-data">
                      Querying scoring engine...
                    </div>
                  ) : riskResult?.risk_index === null ||
                    riskResult?.data_quality.status === "insufficient_data" ? (
                    <div className="mt-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-2xl font-semibold text-muted">
                          Insufficient Data
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        No real DEM or documented terrain observations are connected for this
                        location. A score is not fabricated.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-3xl font-semibold text-accent">
                          {riskResult?.risk_index}
                        </span>
                        <span className="text-xs uppercase font-semibold text-accent">
                          {riskResult?.risk_category}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted">
                        Deterministic index. is_probability = false.
                      </p>
                    </div>
                  )}
                </div>

                {/* Contributing Factors & Missing Inputs */}
                <div className="mt-4">
                  <h3 className="font-display text-sm font-semibold text-ink">
                    Factor Breakdown & Prerequisite State
                  </h3>
                  <div className="mt-2 space-y-1.5 text-xs">
                    {riskResult?.factors && riskResult.factors.length > 0 ? (
                      riskResult.factors.map((f) => (
                        <div
                          key={f.factor_name}
                          className="flex items-start justify-between border-b border-rule/50 pb-1.5"
                        >
                          <div>
                            <span className="font-medium text-ink capitalize">
                              {f.factor_name.replace("_", " ")}
                            </span>
                            <p className="text-[11px] text-muted">{f.interpretation}</p>
                          </div>
                          <span
                            className={`font-data text-[11px] px-1.5 py-0.5 shrink-0 ${
                              f.available
                                ? "bg-accent/10 text-accent font-medium"
                                : "bg-rule/30 text-muted"
                            }`}
                          >
                            {f.available ? "Available" : "Missing Input"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted">
                        Awaiting factor details from scoring engine.
                      </p>
                    )}
                  </div>
                </div>

                {/* Explicit Missing Inputs Diagnostics */}
                {riskResult?.data_quality.missing_inputs &&
                  riskResult.data_quality.missing_inputs.length > 0 && (
                    <div className="mt-3.5 border-l-2 border-rule pl-2.5 text-[11px] text-muted">
                      <span className="font-semibold text-ink">Prerequisites Needed:</span>
                      <ul className="mt-1 list-disc list-inside space-y-0.5 font-data">
                        {riskResult.data_quality.missing_inputs.map((missing) => (
                          <li key={missing}>{missing}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Bottom Boundary / Disclaimer Section */}
              <div className="mt-5 border-t border-rule pt-3 text-[11px] text-muted">
                <span className="font-semibold text-ink">Operational Boundary: </span>
                {riskResult?.limitations?.[0] ||
                  "Experimental estimate. Not an official warning or emergency instruction."}
              </div>
            </section>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-rule bg-paper py-4 text-center text-xs text-muted">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 flex flex-wrap items-center justify-between gap-2">
          <span>FloodLens | Decision Support &amp; Environmental Risk Exploration</span>
          <span>MapLibre GL JS | Independent GeoJSON Basemap</span>
        </div>
      </footer>
    </div>
  );
}
