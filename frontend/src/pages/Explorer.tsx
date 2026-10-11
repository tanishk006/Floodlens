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
  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Map — takes primary space */}
      <div className="flex-1 relative min-h-[300px] lg:min-h-0">
        <FloodMap
          zones={zones}
          selectedZoneId={selectedZoneId}
          onSelectZone={onSelectZone}
        />

        {/* Error overlay */}
        {(backendError || apiOnline === false) && (
          <div className="absolute top-3 left-3 right-3 z-20 animate-fade-in">
            <div className="bg-surface-raised/95 backdrop-blur-sm border border-risk-severe/30 rounded px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-risk-severe flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs text-risk-severe">Backend Notice</h3>
                  <p className="text-xs text-text-secondary truncate">
                    {backendError || "Backend API is currently offline. Showing cached configuration."}
                  </p>
                </div>
              </div>
              <button
                onClick={onRetry}
                className="text-2xs font-medium text-accent hover:text-accent-dim px-2 py-1 border border-surface-border rounded flex-shrink-0 transition-colors"
              >
                Reconnect
              </button>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="absolute top-3 right-14 z-10">
          <div className="bg-surface-raised/80 backdrop-blur-sm border border-surface-border rounded px-2 py-1 text-2xs text-text-muted font-data">
            Experimental estimate. Not an official warning.
          </div>
        </div>
      </div>

      {/* Right sidebar — intelligence panel */}
      <aside className="w-full lg:w-[410px] xl:w-[440px] flex-shrink-0 bg-surface-raised border-t lg:border-t-0 lg:border-l border-surface-border overflow-y-auto">
        <div className="flex flex-col">
          {/* Zone selector */}
          <ZonePanel
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={onSelectZone}
            isLoading={isLoadingZones}
          />

          {/* Real-time Weather Forcing Card (Open-Meteo) */}
          <WeatherCard
            selectedZone={selectedZone}
            onApplyForecastRate={(rate) => onSetCustomRainfall(rate)}
            activeCustomRate={customRainfall}
          />

          {/* Scenario controls */}
          <ScenarioControls
            scenario={scenario}
            onSetScenario={onSetScenario}
            customRainfall={customRainfall}
            onSetCustomRainfall={onSetCustomRainfall}
            isEstimating={isEstimating}
          />

          {/* Risk intelligence */}
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
