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
    <section className="px-4 py-3.5 border-b border-border-subtle bg-surface-primary">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-2xs font-mono text-text-muted uppercase tracking-wider block">
            Rainfall Scenario
          </span>
          <p className="text-2xs text-text-muted mt-0.5">
            Exploratory precipitation rate for heuristic flood susceptibility
          </p>
        </div>
        {isEstimating && (
          <span className="flex items-center gap-1.5 text-2xs font-mono text-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Computing
          </span>
        )}
      </div>

      {/* Scenario presets */}
      <div className="grid grid-cols-4 gap-1.5 my-2.5">
        {SCENARIOS.map((s) => {
          const isActive = scenario === s.id && customRainfall === null;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSetScenario(s.id);
                onSetCustomRainfall(null);
              }}
              className={`py-2 px-1.5 rounded text-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                isActive
                  ? "bg-floral-white-950 border border-accent text-accent-text font-medium"
                  : "bg-surface-secondary border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-strong"
              }`}
            >
              <span className="block text-2xs font-medium">{s.label}</span>
              <span className="block text-2xs font-mono opacity-80 mt-0.5">
                {s.mmHr} mm/h
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom rainfall input */}
      <div className="flex items-center gap-2 mt-2">
        <label htmlFor="custom-rainfall" className="text-2xs text-text-muted whitespace-nowrap font-mono">
          Custom:
        </label>
        <div className="relative flex-1">
          <input
            id="custom-rainfall"
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
            className="w-full bg-surface-secondary border border-border-subtle rounded px-2.5 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs text-text-muted font-mono">
            mm/h
          </span>
        </div>
        {customRainfall !== null && (
          <button
            type="button"
            onClick={() => onSetCustomRainfall(null)}
            className="text-2xs text-text-muted hover:text-accent transition-colors px-1"
            title="Reset to preset"
          >
            ✕
          </button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        Rainfall scenario set to {scenario} at{" "}
        {customRainfall ?? activePreset?.mmHr} mm per hour.
      </p>

      <div className="mt-2 text-2xs text-text-muted font-mono leading-relaxed border-t border-border-subtle/50 pt-2 flex items-center justify-between">
        <span>* Fixed exploratory rate across study window.</span>
        <span>Not a forecast</span>
      </div>
    </section>
  );
}
