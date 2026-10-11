import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  type StyleSpecification,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import type { CandidateZone, RiskScoreResult } from "./api/types";
import rawZoneBoundaries from "./data/zone_boundaries.json";
import { getSeverityStyle, SEVERITY_LEGEND_ITEMS } from "./utils/severityStyles";

export interface FloodMapProps {
  zones: CandidateZone[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  zoneRisks?: Record<string, RiskScoreResult>;
  isEstimating?: boolean;
}

interface HoverTooltipState {
  id: string;
  name: string;
  state: string;
  severity: string;
  riskIndex: number | null;
  dataStatus: string;
  x: number;
  y: number;
}

const INDIA_CENTER: [number, number] = [79.5, 22.8];
const INDIA_ZOOM = 4.4;
const FLY_ZOOM = 6.2;

const CARTO_API_KEY = (import.meta.env.VITE_CARTO_API_KEY as string | undefined)?.trim();

/**
 * Builds the MapLibre style specification implementing:
 * 1. Bottom: CARTO Dark raster basemap (dark_nolabels)
 * 2. Middle: Soft regional severity fills & boundary lines
 * 3. Top of fills: CARTO Dark placename/labels raster layer (dark_only_labels)
 * 4. Top: Selected-region gold outline
 */
function createOptionBDarkStyle(
  apiKey: string | undefined,
  initialGeoJson: FeatureCollection,
  selectedZoneId: string | null
): StyleSpecification {
  const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : "";

  return {
    version: 8,
    name: "FloodLens Option B Soft Regional Shading Cartography",
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
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a> &copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://github.com/datameet/maps" target="_blank">DataMeet</a>',
        maxzoom: 19,
      },
      "zone-boundaries-source": {
        type: "geojson",
        data: initialGeoJson,
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
      // 1. Basemap raster tiles
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
      // 2. Soft regional severity fills
      {
        id: "zone-fills",
        type: "fill",
        source: "zone-boundaries-source",
        paint: {
          "fill-color": ["get", "fill_color"],
          "fill-opacity": ["get", "fill_opacity"],
        },
      },
      // 3. Regional boundary borders
      {
        id: "zone-borders",
        type: "line",
        source: "zone-boundaries-source",
        paint: {
          "line-color": ["get", "border_color"],
          "line-width": ["get", "border_width"],
          "line-opacity": 0.85,
        },
      },
      // 4. Cartographic labels on top of fills so roads, cities and terrain labels remain legible
      {
        id: "carto-labels-layer",
        type: "raster",
        source: "carto-labels",
        minzoom: 0,
        maxzoom: 19,
        paint: {
          "raster-opacity": 0.75,
        },
      },
      // 5. Selected region outline (distinct gold highlight separate from severity fill)
      {
        id: "zone-selected-outline",
        type: "line",
        source: "zone-boundaries-source",
        filter: ["==", ["get", "zone_id"], selectedZoneId ?? ""],
        paint: {
          "line-color": "#cc9c00",
          "line-width": 2.5,
          "line-opacity": 1.0,
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
  zoneRisks = {},
  isEstimating = false,
}: FloodMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<HoverTooltipState | null>(null);
  const [showLegendDetails, setShowLegendDetails] = useState(false);

  const basemapProvider = CARTO_API_KEY ? "CARTO (Auth)" : "CARTO Dark";

  // Enrich boundary features with actual backend severity styling
  const enrichedGeoJson = useMemo<FeatureCollection>(() => {
    const raw = (rawZoneBoundaries as FeatureCollection) || {
      type: "FeatureCollection",
      features: [],
    };

    return {
      type: "FeatureCollection",
      features: raw.features.map((f) => {
        const zoneId = (f.properties?.zone_id || f.id) as string;
        const matchingZone = zones.find((z) => z.id === zoneId);
        const risk = zoneRisks[zoneId];

        // Scientific data honesty: If zone has insufficient data or no terrain, declare insufficient_data
        const category =
          matchingZone?.data_status === "insufficient_data"
            ? "insufficient_data"
            : risk?.risk_category ?? (matchingZone ? "insufficient_data" : "insufficient_data");

        const style = getSeverityStyle(category);
        const isSelected = zoneId === selectedZoneId;

        return {
          ...f,
          id: zoneId,
          properties: {
            ...f.properties,
            zone_id: zoneId,
            state: matchingZone?.state || f.properties?.state || "Unknown",
            name: matchingZone?.name || f.properties?.name || zoneId,
            data_status: matchingZone?.data_status || "insufficient_data",
            severity: style.category,
            severity_label: style.label,
            risk_index: risk?.risk_index ?? null,
            fill_color: style.fillColor,
            fill_opacity: style.fillOpacity,
            border_color: style.borderColor,
            border_width: style.borderWidth,
            is_selected: isSelected,
          },
        };
      }),
    };
  }, [zones, zoneRisks, selectedZoneId]);

  // Initialize MapLibre
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: Map;
    try {
      map = new Map({
        container,
        style: createOptionBDarkStyle(CARTO_API_KEY, enrichedGeoJson, selectedZoneId),
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

    map.addControl?.(new NavigationControl({ showCompass: false }), "top-right");

    const onReady = () => {
      setMapLoaded(true);
      map.resize?.();
    };

    map.on?.("load", onReady);
    map.on?.("style.load", onReady);

    // Failsafe timer to prevent hanging overlay in tests or offline environments
    const fallbackTimer = setTimeout(() => {
      if (mapRef.current) {
        setMapLoaded(true);
        mapRef.current.resize?.();
      }
    }, 800);

    // Interactive polygon hover and click listeners
    const handleMouseMove = (e: any) => {
      if (!e.features || e.features.length === 0) return;
      const feat = e.features[0];
      const zId = feat.properties?.zone_id;
      const zone = zones.find((z) => z.id === zId);
      if (zone) {
        if (containerRef.current) {
          containerRef.current.style.cursor = "pointer";
        }
        setHoveredZone({
          id: zone.id,
          name: zone.name,
          state: zone.state,
          severity: feat.properties?.severity_label || feat.properties?.severity || "Unknown",
          riskIndex:
            feat.properties?.risk_index != null
              ? Number(feat.properties.risk_index)
              : null,
          dataStatus: zone.data_status,
          x: e.point.x,
          y: e.point.y,
        });
      }
    };

    const handleMouseLeave = () => {
      if (containerRef.current) {
        containerRef.current.style.cursor = "";
      }
      setHoveredZone(null);
    };

    const handleClick = (e: any) => {
      if (!e.features || e.features.length === 0) return;
      const zId = e.features[0].properties?.zone_id;
      if (zId) {
        onSelectZone(zId);
      }
    };

    map.on?.("mousemove", "zone-fills", handleMouseMove);
    map.on?.("mouseleave", "zone-fills", handleMouseLeave);
    map.on?.("click", "zone-fills", handleClick);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        mapRef.current?.resize?.();
      });
      observer.observe(container);
    }

    return () => {
      clearTimeout(fallbackTimer);
      observer?.disconnect();
      map.off?.("load", onReady);
      map.off?.("style.load", onReady);
      map.off?.("mousemove", "zone-fills", handleMouseMove);
      map.off?.("mouseleave", "zone-fills", handleMouseLeave);
      map.off?.("click", "zone-fills", handleClick);
      map.remove?.();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronize dynamic GeoJSON data and selected outline filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Update GeoJSON source data with latest severity styling
    const source: any = map.getSource?.("zone-boundaries-source");
    if (source && typeof source.setData === "function") {
      source.setData(enrichedGeoJson);
    }

    // Update selected region outline filter
    if (typeof map.setFilter === "function") {
      map.setFilter("zone-selected-outline", [
        "==",
        ["get", "zone_id"],
        selectedZoneId ?? "",
      ]);
    }
  }, [enrichedGeoJson, selectedZoneId, mapLoaded]);

  // Create clean, accessible topographic label markers (matching Image 2)
  const createMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove?.());
    markersRef.current = [];

    zones.forEach((zone) => {
      const isSelected = zone.id === selectedZoneId;
      const hasVerifiedData = zone.data_status === "verified";
      const risk = zoneRisks[zone.id];
      const severity = risk?.risk_category ?? (hasVerifiedData ? "moderate" : "insufficient_data");
      const style = getSeverityStyle(severity);

      // Marker container
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `Select ${zone.name}`);
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.gap = "6px";
      el.style.background = "transparent";
      el.style.border = "none";
      el.style.padding = "0";
      el.style.transition = "transform 0.15s ease";

      // Tactical indicator dot
      const dot = document.createElement("div");
      const size = isSelected ? "11px" : "8px";
      dot.style.width = size;
      dot.style.height = size;
      dot.style.borderRadius = "50%";
      dot.style.flexShrink = "0";

      if (isSelected) {
        dot.style.backgroundColor = "#cc9c00"; // Gold accent
        dot.style.border = "2px solid #fff3cc";
        dot.style.boxShadow = "0 1px 4px rgba(0,0,0,0.7)";
      } else if (hasVerifiedData) {
        dot.style.backgroundColor = style.fillColor;
        dot.style.border = `1.5px solid ${style.borderColor}`;
      } else {
        dot.style.backgroundColor = "#6a6762"; // Unavailable neutral
        dot.style.border = "1.5px dashed #878178";
      }

      // Label badge
      const label = document.createElement("div");
      label.textContent = zone.state;
      label.style.fontSize = "11px";
      label.style.fontFamily = '"Poppins", system-ui, sans-serif';
      label.style.fontWeight = isSelected ? "600" : "500";
      label.style.color = isSelected ? "#fff9e5" : "#d4cec4";
      label.style.backgroundColor = isSelected
        ? "rgba(27, 26, 24, 0.96)"
        : "rgba(27, 26, 24, 0.88)";
      label.style.padding = "2px 8px";
      label.style.borderRadius = "3px";
      label.style.border = isSelected
        ? "1.5px solid #cc9c00"
        : "1px solid #363330";
      label.style.whiteSpace = "nowrap";
      label.style.letterSpacing = "0.01em";

      el.appendChild(dot);
      el.appendChild(label);

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.06)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1.0)";
      });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectZone(zone.id);
      });

      try {
        const marker = new Marker({ element: el, anchor: "left" })
          .setLngLat(zone.coordinates)
          .addTo(map);
        markersRef.current.push(marker);
      } catch {
        // Fallback for mock environments
      }
    });
  }, [zones, selectedZoneId, zoneRisks, onSelectZone, mapLoaded]);

  useEffect(() => {
    createMarkers();
  }, [createMarkers]);

  // Smooth camera repositioning with reduced-motion support
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !selectedZoneId) return;

    const zone = zones.find((z) => z.id === selectedZoneId);
    if (!zone) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      map.easeTo?.({
        center: zone.coordinates,
        zoom: Math.max(map.getZoom?.() ?? 4.2, FLY_ZOOM),
        duration: 0,
      });
    } else if (typeof map.flyTo === "function") {
      map.flyTo({
        center: zone.coordinates,
        zoom: Math.max(map.getZoom?.() ?? 4.2, FLY_ZOOM),
        duration: 800,
        essential: true,
      });
    } else if (typeof map.easeTo === "function") {
      map.easeTo({
        center: zone.coordinates,
        zoom: Math.max(map.getZoom?.() ?? 4.2, FLY_ZOOM),
      });
    }
  }, [selectedZoneId, zones, mapLoaded]);

  const handleResetIndiaView = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo?.({
      center: INDIA_CENTER,
      zoom: INDIA_ZOOM,
      duration: 700,
    });
  };

  if (mapError) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-primary text-text-secondary text-sm">
        <div className="text-center p-4 max-w-md">
          <p className="font-medium text-text-primary mb-1">Geospatial Canvas Notice</p>
          <p className="text-xs text-text-muted">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#131211] select-none">
      <div ref={containerRef} className="h-full w-full" />

      {/* Static loading placeholder (No blinking or pulsing) */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-primary/95 z-10">
          <div className="flex items-center gap-2 text-text-secondary text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Loading Cartographic Canvas (Option B)…
          </div>
        </div>
      )}

      {/* Floating Tooltip at Cursor Position */}
      {hoveredZone && (
        <div
          className="pointer-events-none absolute z-30 transform -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: hoveredZone.x, top: hoveredZone.y - 8 }}
        >
          <div className="bg-surface-primary/95 backdrop-blur-md border border-border-strong rounded px-3 py-2 text-2xs font-mono shadow-2xl space-y-1 min-w-[190px]">
            <div className="flex items-center justify-between border-b border-border-subtle pb-1">
              <span className="font-semibold text-text-primary font-sans text-xs">
                {hoveredZone.state}
              </span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded border ${
                  hoveredZone.dataStatus === "verified"
                    ? "bg-surface-secondary text-dust-grey-200 border-dust-grey-600"
                    : "bg-surface-secondary text-text-muted border-border-subtle"
                }`}
              >
                {hoveredZone.dataStatus === "verified" ? "Copernicus DEM" : "DEM Pending"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-text-muted">Severity:</span>
              <span className="text-text-primary font-medium">{hoveredZone.severity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Risk Index:</span>
              <span className="text-accent font-semibold">
                {hoveredZone.riskIndex !== null
                  ? `${hoveredZone.riskIndex.toFixed(1)} / 100`
                  : "Unavailable"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Left: Reset View & Telemetry Controls (below the View Mode toggle) */}
      <div className="absolute top-14 left-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={handleResetIndiaView}
          className="px-2.5 py-1.5 rounded bg-surface-primary/90 hover:bg-surface-elevated border border-border-subtle hover:border-border-strong text-2xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          title="Reset map camera to India overview"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>India Overview</span>
        </button>

        {isEstimating && (
          <span className="px-2 py-1 rounded bg-surface-primary/90 border border-border-subtle text-2xs font-mono text-accent">
            Updating regional shading…
          </span>
        )}
      </div>

      {/* Bottom Left: Option B Regional Shading Legend */}
      {mapLoaded && (
        <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-2 max-w-sm">
          <div className="bg-surface-primary/95 backdrop-blur-md border border-border-subtle rounded p-3 text-2xs font-mono text-text-secondary shadow-card space-y-2">
            <div className="flex items-center justify-between border-b border-border-subtle/70 pb-1.5">
              <div>
                <div className="text-text-primary font-semibold font-sans text-xs">
                  Regional Screening Severity
                </div>
                <div className="text-text-muted text-[10px]">
                  Option B Soft Regional Shading
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLegendDetails(!showLegendDetails)}
                className="text-[10px] text-accent hover:underline focus-visible:outline-none"
              >
                {showLegendDetails ? "Hide" : "Details"}
              </button>
            </div>

            {/* Severity categories list */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              {SEVERITY_LEGEND_ITEMS.map((item) => (
                <div key={item.category} className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3 rounded flex-shrink-0"
                    style={{
                      backgroundColor: item.fillColor,
                      border: `${item.borderStyle === "dashed" ? "1px dashed" : "1.2px solid"} ${item.borderColor}`,
                    }}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 col-span-2 pt-1 border-t border-border-subtle/50">
                <span className="w-3.5 h-3 rounded flex-shrink-0 border-2 border-accent bg-transparent" />
                <span className="text-floral-white-200">Selected Zone Outline</span>
              </div>
            </div>

            {showLegendDetails && (
              <div className="pt-2 border-t border-border-subtle text-[10px] text-text-muted leading-relaxed space-y-1 font-sans">
                <p>
                  • <strong>Soft Regional Shading:</strong> Tinted polygons highlight monitoring zones according to heuristic susceptibility scores.
                </p>
                <p>
                  • <strong>Data Honesty:</strong> Zones missing verified Copernicus DEM terrain data display as transparent with dashed boundaries.
                </p>
                <p>
                  • <strong>Exploratory:</strong> Not a calibrated hydraulic inundation simulator or official flood hazard forecast.
                </p>
              </div>
            )}
          </div>

          {/* Cartographic Telemetry info */}
          <div className="bg-surface-primary/95 backdrop-blur-md border border-border-subtle rounded px-2.5 py-1 text-[11px] font-mono text-text-muted inline-flex items-center gap-2 shadow-card self-start">
            <span>Basemap: <strong className="text-text-primary">{basemapProvider}</strong></span>
            <span>·</span>
            <span>{zones.length} Candidate Zones</span>
          </div>
        </div>
      )}
    </div>
  );
}
