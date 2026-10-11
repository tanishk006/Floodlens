import { useState } from "react";
import type { CandidateZone } from "../api/types";

interface ZonePanelProps {
  zones: CandidateZone[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  isLoading: boolean;
}

export default function ZonePanel({
  zones,
  selectedZoneId,
  onSelectZone,
  isLoading,
}: ZonePanelProps) {
  const [expanded, setExpanded] = useState(true);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  return (
    <section className="border-b border-border-subtle bg-surface-primary">
      {/* Selected zone header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xs font-mono text-text-muted uppercase tracking-wider">
            Monitoring Zone
          </span>
          <div className="flex items-center gap-2">
            {zones.length > 0 && (
              <span className="text-2xs font-mono text-text-muted">
                {zones.length} candidate zones loaded
              </span>
            )}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-2xs font-medium text-accent hover:text-accent-emphasis transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded px-1"
              aria-expanded={expanded}
            >
              {expanded ? "Collapse" : `All ${zones.length} zones`}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 py-1">
            <div className="skeleton h-5 w-48" />
            <div className="skeleton h-3 w-32" />
          </div>
        ) : selectedZone ? (
          <div>
            <h2 className="font-display font-semibold text-text-primary text-base leading-tight">
              {selectedZone.name}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-mono text-2xs text-text-muted">
                [{selectedZone.coordinates[0].toFixed(4)},{" "}
                {selectedZone.coordinates[1].toFixed(4)}]
              </span>
              <StatusBadge status={selectedZone.data_status} />
              {selectedZone.notes && (
                <span className="text-2xs text-text-muted truncate max-w-[160px] hidden sm:inline" title={selectedZone.notes}>
                  · {selectedZone.notes}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-muted">Select a zone from the map</p>
        )}
      </div>

      {/* Expanded zone list */}
      {expanded && (
        <div className="border-t border-border-subtle max-h-60 overflow-y-auto">
          {zones.map((zone) => {
            const isActive = zone.id === selectedZoneId;
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => {
                  onSelectZone(zone.id);
                  setExpanded(false);
                }}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors border-b border-border-subtle/50 ${
                  isActive
                    ? "bg-floral-white-950 text-accent-text border-l-2 border-l-accent"
                    : "hover:bg-surface-elevated text-text-secondary hover:text-text-primary"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      isActive ? "bg-accent" : "bg-charcoal-brown-600"
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-medium block truncate">
                      {zone.state}
                    </span>
                    <span className="text-2xs text-text-muted font-mono block">
                      [{zone.coordinates[0].toFixed(2)},{" "}
                      {zone.coordinates[1].toFixed(2)}]
                    </span>
                  </div>
                </div>
                <StatusBadge status={zone.data_status} />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    verified: "risk-badge-low",
    illustrative: "risk-badge-moderate",
    insufficient_data: "risk-badge-insufficient",
  };

  const labels: Record<string, string> = {
    verified: "Verified DEM",
    illustrative: "Illustrative",
    insufficient_data: "DEM Pending",
  };

  return (
    <span
      className={`inline-flex px-1.5 py-0.5 text-2xs font-mono rounded ${
        classes[status] || classes.insufficient_data
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
