import type { ScenarioId } from "../api/types";

const SCENARIOS: { id: ScenarioId; label: string; mmHr: number }[] = [
  { id: "light", label: "Light", mmHr: 7.5 },
  { id: "moderate", label: "Moderate", mmHr: 35.0 },
  { id: "heavy", label: "Heavy", mmHr: 65.0 },
  { id: "extreme", label: "Extreme", mmHr: 115.0 },
];

interface ScenarioControlsProps {
  scenario: ScenarioId;
  onSetScenario: (s: ScenarioId) => void;
  customRainfall: number | null;
  onSetCustomRainfall: (v: number | null) => void;
  isEstimating: boolean;
}

export default function ScenarioControls({
  scenario,
  onSetScenario,
  customRainfall,
  onSetCustomRainfall,
  isEstimating,
}: ScenarioControlsProps) {
  const activePreset = SCENARIOS.find((s) => s.id === scenario);

  return (
    <section className="px-4 py-3 border-b border-surface-border">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-2xs font-data text-text-muted uppercase tracking-wider">
          Rainfall Scenario
        </span>
        {isEstimating && (
          <span className="flex items-center gap-1.5 text-2xs font-data text-accent">
            <span className="w-3 h-3 border border-accent/30 border-t-accent rounded-full animate-spin" />
            Computing
          </span>
        )}
      </div>

      {/* Scenario presets */}
      <div className="grid grid-cols-4 gap-1 mb-3">
        {SCENARIOS.map((s) => {
          const isActive = scenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                onSetScenario(s.id);
                onSetCustomRainfall(null);
              }}
              className={`py-2 px-1 rounded text-center transition-all ${
                isActive
                  ? "bg-accent/15 border border-accent/40 text-accent"
                  : "bg-surface-overlay border border-surface-border text-text-secondary hover:text-text-primary hover:border-surface-subtle"
              }`}
            >
              <span className="block text-2xs font-medium">{s.label}</span>
              <span className="block text-2xs font-data opacity-70 mt-0.5">
                {s.mmHr} mm/h
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom rainfall input */}
      <div className="flex items-center gap-2">
        <label className="text-2xs text-text-muted whitespace-nowrap">
          Custom:
        </label>
        <div className="relative flex-1">
          <input
            type="number"
            min={0}
            max={300}
            step={0.5}
            value={customRainfall ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                onSetCustomRainfall(null);
              } else {
                const num = parseFloat(val);
                if (!isNaN(num) && num >= 0) onSetCustomRainfall(num);
              }
            }}
            placeholder={`${activePreset?.mmHr ?? 35} mm/h (preset)`}
            className="w-full bg-surface border border-surface-border rounded px-2.5 py-1.5 text-xs font-data text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs text-text-disabled font-data">
            mm/h
          </span>
        </div>
        {customRainfall !== null && (
          <button
            onClick={() => onSetCustomRainfall(null)}
            className="text-2xs text-text-muted hover:text-accent transition-colors"
            title="Reset to preset"
          >
            ✕
          </button>
        )}
      </div>

      {/* Screen reader */}
      <p className="sr-only" aria-live="polite">
        Rainfall scenario set to {scenario} at{" "}
        {customRainfall ?? activePreset?.mmHr} mm per hour.
      </p>

      <p className="text-2xs text-text-disabled mt-2 leading-relaxed">
        Exploratory intensity rates for scenario analysis. Not weather forecasts.
      </p>
    </section>
  );
}
