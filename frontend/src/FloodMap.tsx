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

const CARTO_API_KEY = (import.meta.env.VITE_CARTO_API_KEY as string | undefined)?.trim();

function createDarkStyle(apiKey?: string): StyleSpecification {
  const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : "";
  return {
    version: 8,
    name: "FloodLens Muted Dark Cartography",
    sources: {
      "carto-dark": {
        type: "raster",
        tiles: [
          `https://a.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}@2x.png${keyParam}`,
          `https://b.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}@2x.png${keyParam}`,
          `https://c.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}@2x.png${keyParam}`,
          `https://d.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}@2x.png${keyParam}`,
        ],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a> &copy; <a href="https://carto.com/" target="_blank">CARTO</a>',
        maxzoom: 19,
      },
      "carto-labels": {
        type: "raster",
        tiles: [
          `https://a.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png${keyParam}`,
          `https://b.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png${keyParam}`,
          `https://c.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png${keyParam}`,
          `https://d.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png${keyParam}`,
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
        paint: {
          "raster-opacity": 0.88,
        },
      },
      {
        id: "carto-labels-layer",
        type: "raster",
        source: "carto-labels",
        minzoom: 0,
        maxzoom: 19,
        paint: {
          "raster-opacity": 0.55,
        },
      },
    ],
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  };
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
  const [basemapProvider] = useState<string>(
    CARTO_API_KEY ? "CARTO (Auth)" : "CARTO Dark"
  );

  // Initialize map with bulletproof CARTO Dark style
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: Map;
    try {
      map = new Map({
        container,
        style: createDarkStyle(CARTO_API_KEY),
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

    const onReady = () => {
      setMapLoaded(true);
      map.resize?.();
    };

    map.on("load", onReady);
    map.on("style.load", onReady);

    // Failsafe timer to never trap user in an indefinite loading overlay
    const fallbackTimer = setTimeout(() => {
      if (mapRef.current) {
        setMapLoaded(true);
        mapRef.current.resize?.();
      }
    }, 800);

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
      clearTimeout(fallbackTimer);
      observer?.disconnect();
      map.off("load", onReady);
      map.off("style.load", onReady);
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
      const hasVerifiedData = zone.data_status === "verified";

      // Marker container
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.gap = "6px";
      el.style.transition = "transform 0.15s ease";

      // Indicator dot
      const dot = document.createElement("div");
      const size = isSelected ? "12px" : "8px";
      dot.style.width = size;
      dot.style.height = size;
      dot.style.borderRadius = "50%";

      if (isSelected) {
        dot.style.backgroundColor = "#cc9c00"; // Gold accent
        dot.style.border = "2px solid #fff3cc";
        dot.style.boxShadow = "0 1px 4px rgba(0,0,0,0.6)";
      } else if (hasVerifiedData) {
        dot.style.backgroundColor = "#94856b"; // Dust grey
        dot.style.border = "1.5px solid #bfb6a6";
      } else {
        dot.style.backgroundColor = "#514d48"; // Charcoal brown
        dot.style.border = "1.5px solid #6c6760";
      }

      // Label pill
      const label = document.createElement("div");
      label.textContent = zone.state;
      label.style.fontSize = "11px";
      label.style.fontFamily = '"Poppins", sans-serif';
      label.style.fontWeight = isSelected ? "600" : "400";
      label.style.color = isSelected ? "#fff3cc" : "#b7b3ae";
      label.style.backgroundColor = isSelected
        ? "rgba(27,26,24,0.96)"
        : "rgba(27,26,24,0.85)";
      label.style.padding = "2px 8px";
      label.style.borderRadius = "3px";
      label.style.border = isSelected
        ? "1px solid #cc9c00"
        : "1px solid #363330";
      label.style.whiteSpace = "nowrap";
      label.style.letterSpacing = "0.01em";

      el.appendChild(dot);
      el.appendChild(label);

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.05)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
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

    if (typeof map.flyTo === "function") {
      map.flyTo({
        center: zone.coordinates,
        zoom: Math.max(map.getZoom?.() ?? 4.2, FLY_ZOOM),
        duration: 1000,
        essential: true,
      });
    } else if (typeof map.easeTo === "function") {
      map.easeTo({
        center: zone.coordinates,
        zoom: Math.max(map.getZoom?.() ?? 4.2, FLY_ZOOM),
      });
    }
  }, [selectedZoneId, zones, mapLoaded]);

  if (mapError) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-primary text-text-secondary text-sm">
        <div className="text-center p-4">
          <p className="font-medium text-text-primary mb-1">Map Notice</p>
          <p className="text-xs text-text-muted">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#131211]">
      <div ref={containerRef} className="h-full w-full" />

      {/* Map loading overlay (fades out as soon as map style is ready) */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-primary/90 z-10">
          <div className="flex items-center gap-2 text-text-secondary text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Loading geospatial canvas…
          </div>
        </div>
      )}

      {/* Map badges and legend */}
      {mapLoaded && (
        <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-2">
          {/* Legend */}
          <div className="bg-surface-primary/95 backdrop-blur-md border border-border-subtle rounded px-3 py-2 text-2xs font-mono text-text-secondary shadow-card space-y-1.5">
            <div className="text-text-muted uppercase text-[10px] tracking-wider font-semibold">
              Cartographic Legend
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent border border-floral-white-200" />
                Selected Zone
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-charcoal-brown-500" />
                DEM Pending (SRTM/Cop-30)
              </span>
            </div>
          </div>

          {/* Telemetry info */}
          <div className="bg-surface-primary/95 backdrop-blur-md border border-border-subtle rounded px-2.5 py-1 text-[11px] font-mono text-text-muted inline-flex items-center gap-2 shadow-card">
            <span>Provider: <strong className="text-text-primary">{basemapProvider} Dark</strong></span>
            <span>·</span>
            <span>{zones.length} Zones (EPSG:4326)</span>
          </div>
        </div>
      )}
    </div>
  );
}
