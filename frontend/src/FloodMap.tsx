import { useEffect, useRef, useState } from "react";
import { Map, Marker, type ErrorEvent, type StyleSpecification } from "maplibre-gl";
import type { CandidateZone } from "./api/types";

interface FloodMapProps {
  zones: CandidateZone[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  mapErrorBanner?: string | null;
  onRetry?: () => void;
}

const INDIA_CENTER: [number, number] = [79.2, 22.5];
const INDIA_ZOOM = 4.2;

function getToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return val || fallback;
}

function createBaseStyle(): StyleSpecification {
  const paper = getToken("--color-paper", "#F4F1EA");

  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "background-paper",
        type: "background",
        paint: { "background-color": paper },
      },
    ],
  };
}

export default function FloodMap({
  zones,
  selectedZoneId,
  onSelectZone,
  mapErrorBanner,
  onRetry,
}: FloodMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Initialize MapLibre GL JS map centered on India
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: Map;
    try {
      map = new Map({
        container,
        style: createBaseStyle(),
        center: INDIA_CENTER,
        zoom: INDIA_ZOOM,
        minZoom: 3,
        maxZoom: 12,
        attributionControl: false,
      });
      mapRef.current = map;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Map initialization failed.";
      console.error("FloodLens MapLibre init error:", err);
      setInternalError(msg);
      return;
    }

    const handleError = (e: ErrorEvent) => {
      console.warn("FloodLens Map event error:", e.error);
      setInternalError(e.error?.message || "Map encountered a rendering warning.");
    };

    map.on("error", handleError);

    return () => {
      map.off("error", handleError);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update HTML markers whenever zones or selectedZoneId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    zones.forEach((zone) => {
      const isSelected = zone.id === selectedZoneId;

      // Outer wrapper element for MapLibre Marker
      const el = document.createElement("div");
      el.className = "group relative cursor-pointer";

      // Accessible button
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = [
        "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium font-ui transition-all duration-150",
        "border shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2",
        isSelected
          ? "bg-accent text-paper border-accent ring-2 ring-accent/30 font-semibold scale-110 z-20"
          : "bg-paper text-ink border-rule hover:border-accent hover:text-accent z-10",
      ].join(" ");
      btn.setAttribute("aria-label", `Monitoring zone: ${zone.name}, ${zone.state}`);
      btn.setAttribute("aria-pressed", String(isSelected));
      btn.tabIndex = 0;

      // Flag marker pin symbol
      const pin = document.createElement("span");
      pin.className = [
        "inline-block h-2 w-2 rounded-full",
        isSelected ? "bg-paper" : "bg-muted group-hover:bg-accent",
      ].join(" ");
      pin.setAttribute("aria-hidden", "true");

      // Label text
      const text = document.createElement("span");
      text.textContent = zone.state;

      btn.appendChild(pin);
      btn.appendChild(text);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectZone(zone.id);
      });

      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectZone(zone.id);
        }
      });

      el.appendChild(btn);

      // Create MapLibre Marker at [longitude, latitude]
      const marker = new Marker({ element: el, anchor: "center" })
        .setLngLat(zone.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [zones, selectedZoneId, onSelectZone]);

  // Center on selected zone when selectedZoneId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedZoneId) return;

    const target = zones.find((z) => z.id === selectedZoneId);
    if (target) {
      map.easeTo({
        center: target.coordinates,
        zoom: Math.max(map.getZoom(), 5.8),
        duration: 900,
      });
    }
  }, [selectedZoneId, zones]);

  const handleResetView = () => {
    const map = mapRef.current;
    if (map) {
      map.easeTo({
        center: INDIA_CENTER,
        zoom: INDIA_ZOOM,
        duration: 800,
      });
    }
  };

  const activeError = mapErrorBanner || internalError;

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden bg-paper border border-rule">
      <div
        ref={containerRef}
        className="absolute inset-0"
        aria-label="Interactive India map showing candidate monitoring zones"
        role="application"
      />

      {/* Map Control Overlay */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleResetView}
          className="border border-rule bg-paper px-3 py-1.5 text-xs font-ui text-ink shadow-sm hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          aria-label="Reset map to India-wide view"
        >
          Reset view
        </button>
      </div>

      {/* Data Source Notice on Map */}
      <div className="absolute bottom-3 left-3 z-10 max-w-sm border border-rule bg-paper/95 p-2 text-[11px] leading-tight text-muted backdrop-blur-xs">
        <span className="font-semibold text-ink">Spatial Reference:</span> EPSG:4326 |
        Coordinates are [longitude, latitude]. Independent survey-map basemap.
      </div>

      {/* Error or Disconnected State Banner */}
      {activeError && (
        <div
          className="absolute inset-x-3 bottom-12 z-30 border-l-4 border-risk-severe bg-paper p-3 shadow-md text-xs text-ink font-ui"
          role="alert"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-risk-severe">Connection Status</p>
              <p className="mt-0.5 text-muted">{activeError}</p>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="shrink-0 border border-rule px-2 py-1 text-xs hover:border-accent hover:text-accent focus-visible:outline-accent"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
