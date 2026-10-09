import { useEffect, useRef, useState } from "react";
import { Map, type ErrorEvent, type StyleSpecification } from "maplibre-gl";
import { placeholderPlaces, placeholderSegments } from "./placeholderData";

function readToken(name: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!value) {
    throw new Error(`The map color token ${name} is not available.`);
  }
  return value;
}

function createMapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      "placeholder-segments": {
        type: "geojson",
        data: placeholderSegments,
      },
      "placeholder-places": {
        type: "geojson",
        data: placeholderPlaces,
      },
    },
    layers: [
      {
        id: "paper",
        type: "background",
        paint: { "background-color": readToken("--color-paper") },
      },
      {
        id: "placeholder-streets",
        type: "line",
        source: "placeholder-segments",
        paint: {
          "line-color": [
            "match",
            ["get", "risk"],
            "low",
            readToken("--color-risk-low"),
            "moderate",
            readToken("--color-risk-moderate"),
            "high",
            readToken("--color-risk-high"),
            "severe",
            readToken("--color-risk-severe"),
            readToken("--color-rule"),
          ],
          "line-width": 4,
          "line-opacity": 0.9,
        },
      },
      {
        id: "placeholder-place",
        type: "circle",
        source: "placeholder-places",
        paint: {
          "circle-radius": 5,
          "circle-color": readToken("--color-accent"),
          "circle-stroke-color": readToken("--color-paper"),
          "circle-stroke-width": 2,
        },
      },
    ],
  };
}

export default function FloodMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: Map;
    try {
      map = new Map({
        container,
        style: createMapStyle(),
        center: [0, 0],
        zoom: 13,
        minZoom: 11,
        maxZoom: 16,
        attributionControl: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The map could not be started.";
      console.error("FloodLens map initialization failed:", error);
      setMapError(message);
      return;
    }

    const handleMapError = (event: ErrorEvent) => {
      console.error("FloodLens map error:", event.error);
      setMapError(event.error.message || "The map encountered an error.");
    };

    map.on("error", handleMapError);

    return () => {
      map.off("error", handleMapError);
      map.remove();
    };
  }, []);

  return (
    <div className="relative h-full min-h-[360px] w-full bg-paper">
      <div
        ref={containerRef}
        className="absolute inset-0"
        aria-label="Illustrative map with placeholder street exposure data"
        role="application"
      />
      {mapError && (
        <p
          className="absolute bottom-3 left-3 right-3 border-l-2 border-risk-severe bg-paper p-3 text-sm text-ink"
          role="alert"
        >
          Map error: {mapError}
        </p>
      )}
    </div>
  );
}
