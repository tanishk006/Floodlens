import type { Feature, FeatureCollection, LineString, Point } from "geojson";

type SegmentProperties = {
  risk: "low" | "moderate" | "high" | "severe";
};

export const placeholderSegments: FeatureCollection<LineString, SegmentProperties> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { risk: "low" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.025, -0.02],
          [-0.016, -0.006],
          [-0.005, 0.002],
          [0.006, 0.012],
          [0.021, 0.019],
        ],
      },
    },
    {
      type: "Feature",
      properties: { risk: "moderate" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.024, 0.018],
          [-0.014, 0.008],
          [-0.004, -0.001],
          [0.008, -0.009],
          [0.023, -0.018],
        ],
      },
    },
    {
      type: "Feature",
      properties: { risk: "high" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.018, -0.022],
          [-0.009, -0.01],
          [0.002, 0],
          [0.013, 0.01],
          [0.022, 0.022],
        ],
      },
    },
    {
      type: "Feature",
      properties: { risk: "severe" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.022, 0.004],
          [-0.011, 0.003],
          [0, 0.004],
          [0.011, 0.002],
          [0.023, 0.003],
        ],
      },
    },
  ],
};

type PlaceProperties = {
  label: string;
};

export const placeholderPlaces: FeatureCollection<Point, PlaceProperties> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { label: "Illustrative point" },
      geometry: { type: "Point", coordinates: [0, 0.004] },
    },
  ] satisfies Feature<Point, PlaceProperties>[],
};
