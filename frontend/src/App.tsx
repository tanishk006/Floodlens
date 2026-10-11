import { useState, useEffect, useCallback } from "react";
import { getHealth, getZones, estimateRisk, ApiClientError } from "./api/client";
import type {
  CandidateZone,
  RiskScoreResult,
  ScenarioId,
} from "./api/types";
import Header, { type AppPage } from "./components/Header";
import Explorer from "./pages/Explorer";
import WeatherView from "./pages/WeatherView";
import Methodology from "./pages/Methodology";

export default function App() {
  const [page, setPage] = useState<AppPage>("explorer");

  // API state
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [zones, setZones] = useState<CandidateZone[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Selection state
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<ScenarioId>("moderate");
  const [customRainfall, setCustomRainfall] = useState<number | null>(null);

  // Risk result state
  const [riskResult, setRiskResult] = useState<RiskScoreResult | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  const loadInitialData = useCallback(async () => {
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
  }, [selectedZoneId]);

  useEffect(() => {
    loadInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch risk estimate when zone or scenario changes
  useEffect(() => {
    if (!selectedZoneId) return;

    let cancelled = false;
    const fetchEstimate = async () => {
      setIsEstimating(true);
      try {
        const result = await estimateRisk({
          zone_id: selectedZoneId,
          scenario_id: scenario,
          ...(customRainfall !== null && customRainfall >= 0
            ? { rainfall_mm_per_hour: customRainfall }
            : {}),
        });
        if (!cancelled) {
          setRiskResult(result);
          setBackendError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof ApiClientError
              ? err.message
              : "Failed to retrieve risk estimate.";
          setBackendError(msg);
        }
      } finally {
        if (!cancelled) setIsEstimating(false);
      }
    };

    fetchEstimate();
    return () => { cancelled = true; };
  }, [selectedZoneId, scenario, customRainfall]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  const handleApplyForecastToRisk = (rateMmHr: number) => {
    setCustomRainfall(rateMmHr);
    setPage("explorer");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface">
      <Header
        page={page}
        onNavigate={setPage}
        apiOnline={apiOnline}
        zoneCount={zones.length}
      />

      <main className="flex-1 overflow-hidden">
        {page === "explorer" && (
          <Explorer
            zones={zones}
            selectedZone={selectedZone}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            scenario={scenario}
            onSetScenario={setScenario}
            customRainfall={customRainfall}
            onSetCustomRainfall={setCustomRainfall}
            riskResult={riskResult}
            isEstimating={isEstimating}
            isLoadingZones={isLoadingZones}
            backendError={backendError}
            apiOnline={apiOnline}
            onRetry={loadInitialData}
          />
        )}
        {page === "weather" && (
          <WeatherView
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZoneId}
            onApplyForecastToRisk={handleApplyForecastToRisk}
          />
        )}
        {page === "methodology" && (
          <Methodology riskResult={riskResult} />
        )}
      </main>
    </div>
  );
}
