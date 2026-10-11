import { useEffect, useRef, useState, useCallback } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  type StyleSpecification,
} from "maplibre-gl";
import type { CandidateZone } from "./api/types";

interface FloodMapProps {
  zones: CandidateZone[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}

const INDIA_CENTER: [number, number] = [79.5, 23.0];
const INDIA_ZOOM = 4.5;
const FLY_ZOOM = 6.5;

function createDarkStyle(): StyleSpecification {
  return {
    version: 8,
    name: "FloodLens CARTO Dark (Fallback)",
    sources: {
      "carto-dark": {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
          "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        ],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a> &copy; <a href="https://carto.com/" target="_blank">CARTO</a>',
        maxzoom: 19,
      },
      "carto-labels": {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
        ],
        tileSize: 256,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: "carto-dark-layer",
        type: "raster",
        source: "carto-dark",
        minzoom: 0,
        maxzoom: 19,
      },
      {
        id: "carto-labels-layer",
        type: "raster",
        source: "carto-labels",
        minzoom: 0,
        maxzoom: 19,
        paint: { "raster-opacity": 0.7 },
      },
    ],
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  };
}

function getRiskColor(status: string): string {
  switch (status) {
    case "verified":
      return "#34D399";
    case "illustrative":
      return "#FBBF24";
    default:
      return "#64748B";
  }
}

export default function FloodMap({
  zones,
  selectedZoneId,
  onSelectZone,
}: FloodMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [basemapProvider, setBasemapProvider] = useState<"MapTiler" | "CARTO">("CARTO");

  // Initialize map
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mapTilerKey = (import.meta.env.VITE_MAPTILER_API_KEY as string | undefined)?.trim();
    const useMapTiler = Boolean(mapTilerKey && mapTilerKey !== "your_maptiler_api_key_here");
    const initialStyle: string | StyleSpecification = useMapTiler
      ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${mapTilerKey}`
      : createDarkStyle();

    setBasemapProvider(useMapTiler ? "MapTiler" : "CARTO");

    let map: Map;
    try {
      map = new Map({
        container,
        style: initialStyle,
        center: INDIA_CENTER,
        zoom: INDIA_ZOOM,
        minZoom: 3,
        maxZoom: 14,
        attributionControl: { compact: true },
        pitchWithRotate: false,
        dragRotate: false,
      });
      mapRef.current = map;
    } catch (err) {
      setMapError(
        err instanceof Error ? err.message : "Map initialization failed."
      );
      return;
    }

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      setMapLoaded(true);
      map.resize();
    });

    // Graceful fallback to CARTO dark if MapTiler style fails to load
    const handleError = (e: any) => {
      console.warn("FloodLens Map notice:", e?.error ?? e);
      if (useMapTiler && basemapProvider === "MapTiler") {
        try {
          map.setStyle(createDarkStyle());
          setBasemapProvider("CARTO");
        } catch {
          // ignore fallback error
        }
      }
    };
    map.on("error", handleError);

    // Dynamic resize observer to handle layout shifts / drawer toggling
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
      observer.observe(container);
    }

    return () => {
      observer?.disconnect();
      map.off("error", handleError);
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Create markers
  const createMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    zones.forEach((zone) => {
      const isSelected = zone.id === selectedZoneId;
      const color = getRiskColor(zone.data_status);

      // Marker container
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.gap = "6px";
      el.style.transition = "transform 0.2s ease";

      // Indicator dot
      const dot = document.createElement("div");
      const size = isSelected ? "14px" : "10px";
      dot.style.width = size;
      dot.style.height = size;
      dot.style.borderRadius = "50%";
      dot.style.backgroundColor = isSelected ? "#22D3EE" : color;
      dot.style.border = isSelected ? "2px solid #22D3EE" : `2px solid ${color}`;
      dot.style.boxShadow = isSelected
        ? "0 0 14px rgba(34,211,238,0.7)"
        : `0 0 6px ${color}50`;
      dot.style.transition = "all 0.2s ease";

      // Label
      const label = document.createElement("div");
      label.textContent = zone.state;
      label.style.fontSize = "11px";
      label.style.fontFamily = '"Inter", system-ui, sans-serif';
      label.style.fontWeight = isSelected ? "600" : "500";
      label.style.color = isSelected ? "#22D3EE" : "#CBD5E1";
      label.style.backgroundColor = isSelected
        ? "rgba(17,24,39,0.95)"
        : "rgba(17,24,39,0.85)";
      label.style.padding = "2px 8px";
      label.style.borderRadius = "3px";
      label.style.border = isSelected
        ? "1px solid rgba(34,211,238,0.4)"
        : "1px solid rgba(30,41,59,0.8)";
      label.style.whiteSpace = "nowrap";
      label.style.transition = "all 0.2s ease";
      label.style.letterSpacing = "0.01em";

      el.appendChild(dot);
      el.appendChild(label);

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.08)";
        dot.style.boxShadow = `0 0 16px ${isSelected ? "rgba(34,211,238,0.8)" : color + "90"}`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
        dot.style.boxShadow = isSelected
          ? "0 0 14px rgba(34,211,238,0.7)"
          : `0 0 6px ${color}50`;
      });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectZone(zone.id);
      });

      const marker = new Marker({ element: el, anchor: "left" })
        .setLngLat(zone.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [zones, selectedZoneId, onSelectZone, mapLoaded]);

  useEffect(() => {
    createMarkers();
  }, [createMarkers]);

  // Fly to selected zone
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !selectedZoneId) return;

    const zone = zones.find((z) => z.id === selectedZoneId);
    if (!zone) return;

    map.flyTo({
      center: zone.coordinates,
      zoom: Math.max(map.getZoom(), FLY_ZOOM),
      duration: 1200,
      essential: true,
    });
  }, [selectedZoneId, zones, mapLoaded]);

  if (mapError) {
    return (
      <div className="h-full flex items-center justify-center bg-surface text-text-secondary text-sm">
        <div className="text-center">
          <p className="font-medium text-text-primary mb-1">Map Error</p>
          <p className="text-xs">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Map loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10">
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            Loading geospatial canvas…
          </div>
        </div>
      )}

      {/* Map badges and legend */}
      {mapLoaded && (
        <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-2">
          {/* Legend */}
          <div className="bg-surface-raised/90 backdrop-blur-md border border-surface-border rounded-md px-3 py-2 text-2xs font-data text-slate-300 shadow-lg space-y-1.5">
            <div className="text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              Cartographic Legend
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE]" />
                Selected Zone
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                DEM Pending (SRTM/Cop-30)
              </span>
            </div>
          </div>

          {/* Telemetry info */}
          <div className="bg-surface-raised/90 backdrop-blur-md border border-surface-border rounded-md px-2.5 py-1 text-[11px] font-mono text-slate-400 inline-flex items-center gap-2">
            <span>Provider: <strong className="text-cyan-400">{basemapProvider} Dark</strong></span>
            <span>·</span>
            <span>{zones.length} Zones (EPSG:4326)</span>
          </div>
        </div>
      )}
    </div>
  );
}
