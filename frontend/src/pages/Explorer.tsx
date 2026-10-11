import { useState, lazy, Suspense } from "react";
import type {
  CandidateZone,
  RiskScoreResult,
  ScenarioId,
} from "../api/types";
import FloodMap from "../FloodMap";
import ZonePanel from "../components/ZonePanel";
import WeatherCard from "../components/WeatherCard";
import ScenarioControls from "../components/ScenarioControls";
import RiskIntelligence from "../components/RiskIntelligence";
import HydrologyCard from "../components/HydrologyCard";

const TerrainModel = lazy(() => import("../components/TerrainModel"));

interface ExplorerProps {
  zones: CandidateZone[];
  selectedZone: CandidateZone | null;
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  scenario: ScenarioId;
  onSetScenario: (s: ScenarioId) => void;
  customRainfall: number | null;
  onSetCustomRainfall: (v: number | null) => void;
  riskResult: RiskScoreResult | null;
  isEstimating: boolean;
  isLoadingZones: boolean;
  backendError: string | null;
  apiOnline: boolean | null;
  onRetry: () => void;
}

export default function Explorer({
  zones,
  selectedZone,
  selectedZoneId,
  onSelectZone,
  scenario,
  onSetScenario,
  customRainfall,
  onSetCustomRainfall,
  riskResult,
  isEstimating,
  isLoadingZones,
  backendError,
  apiOnline,
  onRetry,
}: ExplorerProps) {
  const [viewMode, setViewMode] = useState<"map" | "terrain">("map");

  const elevationVal =
    riskResult?.factors?.find((f) => f.factor_name === "low_elevation")?.raw_value ??
    undefined;
  const reliefVal =
    riskResult?.factors?.find((f) => f.factor_name === "local_relief")?.raw_value ??
    undefined;
  const slopeVal =
    riskResult?.factors?.find((f) => f.factor_name === "slope")?.raw_value ??
    undefined;

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-[#131211]">
      {/* Map or 3D Topographic Terrain View */}
      <div className="flex-1 relative min-h-[320px] lg:min-h-0">
        {viewMode === "map" ? (
          <FloodMap
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={onSelectZone}
          />
        ) : (
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-[#131211] text-xs text-text-muted font-mono">
                Loading 3D Topographic Model…
              </div>
            }
          >
            <TerrainModel
              zoneId={selectedZoneId ?? "zone-uttar-pradesh"}
              zoneName={selectedZone?.name}
              dataStatus={
                selectedZone?.data_status === "verified"
                  ? "verified"
                  : "insufficient_data"
              }
              riskIndex={riskResult?.risk_index ?? null}
              rainfallMmPerHour={
                customRainfall ??
                riskResult?.scenario.rainfall_mm_per_hour ??
                35
              }
              elevationM={elevationVal}
              reliefM={reliefVal}
              slopeDeg={slopeVal}
            />
          </Suspense>
        )}

        {/* View mode toggle (Map vs 3D Terrain) */}
        <div className="absolute top-3 left-3 z-10 flex items-center bg-surface-primary/95 backdrop-blur-md border border-border-subtle rounded p-0.5 shadow-card">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`px-3 py-1 text-2xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              viewMode === "map"
                ? "bg-floral-white-950 text-accent-text border border-floral-white-800 font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setViewMode("terrain")}
            className={`px-3 py-1 text-2xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              viewMode === "terrain"
                ? "bg-floral-white-950 text-accent-text border border-floral-white-800 font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            3D Terrain
          </button>
        </div>

        {/* Backend notice / error banner */}
        {(backendError || apiOnline === false) && (
          <div className="absolute top-3 left-3 right-3 z-20">
            <div className="bg-surface-primary/95 backdrop-blur-md border border-warning-primary rounded px-3 py-2 flex items-center justify-between gap-3 shadow-card">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-primary flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs text-warning-primary">Backend Notice</h3>
                  <p className="text-xs text-text-secondary truncate">
                    {backendError || "Backend API is currently offline. Showing cached configuration."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRetry}
                className="text-2xs font-medium text-accent hover:text-accent-emphasis px-2.5 py-1 border border-border-subtle rounded flex-shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                Reconnect
              </button>
            </div>
          </div>
        )}

        {/* Persistent scientific disclaimer */}
        <div className="absolute top-3 right-14 z-10">
          <div className="bg-surface-primary/90 backdrop-blur-md border border-border-subtle rounded px-2.5 py-1 text-2xs text-text-muted font-mono shadow-card">
            Experimental estimate. Not an official warning.
          </div>
        </div>
      </div>

      {/* Right intelligence workspace panel */}
      <aside className="w-full lg:w-[430px] xl:w-[470px] flex-shrink-0 bg-surface-primary border-t lg:border-t-0 lg:border-l border-border-subtle overflow-y-auto">
        <div className="flex flex-col">
          {/* Zone selection card */}
          <ZonePanel
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={onSelectZone}
            isLoading={isLoadingZones}
          />

          {/* Operational Weather Forcing Card (Open-Meteo) */}
          <WeatherCard
            selectedZone={selectedZone}
            onApplyForecastRate={(rate) => onSetCustomRainfall(rate)}
            activeCustomRate={customRainfall}
          />

          {/* Environmental Hydrology & River Discharge (Copernicus GloFAS + ECMWF) */}
          <HydrologyCard
            selectedZone={selectedZone}
            riskResult={riskResult}
          />

          {/* Scenario controls */}
          <ScenarioControls
            scenario={scenario}
            onSetScenario={onSetScenario}
            customRainfall={customRainfall}
            onSetCustomRainfall={onSetCustomRainfall}
            isEstimating={isEstimating}
          />

          {/* Risk intelligence and factor breakdowns */}
          <RiskIntelligence
            zone={selectedZone}
            riskResult={riskResult}
            isEstimating={isEstimating}
          />
        </div>
      </aside>
    </div>
  );
}
