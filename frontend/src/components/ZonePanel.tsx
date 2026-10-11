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
    <section className="border-b border-surface-border">
      {/* Selected zone header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xs font-data text-text-muted uppercase tracking-wider">
            Monitoring Zone
          </span>
          <div className="flex items-center gap-2">
            {zones.length > 0 && (
              <span className="text-2xs font-data text-text-muted">
                {zones.length} candidate zones loaded
              </span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-2xs font-medium text-accent hover:text-accent-dim transition-colors"
              aria-expanded={expanded}
            >
              {expanded ? "Collapse" : `All ${zones.length} zones`}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <div className="skeleton h-5 w-48" />
            <div className="skeleton h-3 w-32" />
          </div>
        ) : selectedZone ? (
          <div>
            <h2 className="font-display font-semibold text-text-primary text-base leading-tight">
              {selectedZone.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-data text-2xs text-text-muted">
                [{selectedZone.coordinates[0].toFixed(4)},{" "}
                {selectedZone.coordinates[1].toFixed(4)}]
              </span>
              <StatusBadge status={selectedZone.data_status} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Select a zone from the map</p>
        )}
      </div>

      {/* Expanded zone list */}
      {expanded && (
        <div className="border-t border-surface-border max-h-64 overflow-y-auto animate-fade-in">
          {zones.map((zone) => {
            const isActive = zone.id === selectedZoneId;
            return (
              <button
                key={zone.id}
                onClick={() => {
                  onSelectZone(zone.id);
                  setExpanded(false);
                }}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors border-b border-surface-border/50 ${
                  isActive
                    ? "bg-accent/8 text-accent"
                    : "hover:bg-surface-overlay text-text-secondary hover:text-text-primary"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isActive ? "bg-accent" : "bg-text-disabled"
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-medium block truncate">
                      {zone.state}
                    </span>
                    <span className="text-2xs text-text-muted font-data block">
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
    verified: "Verified",
    illustrative: "Illustrative",
    insufficient_data: "No Data",
  };

  return (
    <span
      className={`inline-flex px-1.5 py-0.5 text-2xs font-data rounded-xs ${
        classes[status] || classes.insufficient_data
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
