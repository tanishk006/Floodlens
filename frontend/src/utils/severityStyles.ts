import type { RiskCategory } from "../api/types";

export interface SeverityStyle {
  category: RiskCategory;
  label: string;
  fillColor: string;
  fillOpacity: number;
  borderColor: string;
  borderOpacity: number;
  borderWidth: number;
  dashArray?: [number, number];
  description: string;
}

/**
 * Single source of truth for mapping backend RiskCategory to
 * Option B Soft Regional Shading visual style attributes.
 *
 * Adheres strictly to the FloodLens palette:
 * - Low: Dust Grey / Earthy (#94856b)
 * - Moderate: Muted Gold (#cc9c00)
 * - High / Severe: Muted Paprika (#bb4111)
 * - Insufficient data: Transparent neutral charcoal (#6a6762) with dashed outline
 */
export function getSeverityStyle(
  category: RiskCategory | string | undefined | null
): SeverityStyle {
  switch (category) {
    case "low":
      return {
        category: "low",
        label: "Low",
        fillColor: "#94856b",
        fillOpacity: 0.16,
        borderColor: "#766a56",
        borderOpacity: 0.7,
        borderWidth: 1.2,
        description: "Terrain indicators suggest lower baseline susceptibility under this scenario.",
      };

    case "moderate":
      return {
        category: "moderate",
        label: "Moderate",
        fillColor: "#cc9c00",
        fillOpacity: 0.22,
        borderColor: "#cc9c00",
        borderOpacity: 0.85,
        borderWidth: 1.4,
        description: "Elevated susceptibility observed from combined terrain slope, relief, and scenario rainfall.",
      };

    case "high":
      return {
        category: "high",
        label: "High",
        fillColor: "#bb4111",
        fillOpacity: 0.26,
        borderColor: "#bb4111",
        borderOpacity: 0.9,
        borderWidth: 1.6,
        description: "Significant susceptibility indicated by low relief and steep upstream accumulation.",
      };

    case "severe":
      return {
        category: "severe",
        label: "Severe",
        fillColor: "#8c310d",
        fillOpacity: 0.3,
        borderColor: "#8c310d",
        borderOpacity: 0.95,
        borderWidth: 1.8,
        description: "Severe susceptibility heuristic threshold reached for this simulated rainfall volume.",
      };

    case "insufficient_data":
    default:
      return {
        category: "insufficient_data",
        label: "Insufficient Data",
        fillColor: "#6a6762",
        fillOpacity: 0.04,
        borderColor: "#6a6762",
        borderOpacity: 0.75,
        borderWidth: 1.0,
        dashArray: [2, 2],
        description: "Required elevation or hydrologic observations have not yet been validated for this zone.",
      };
  }
}

export const SEVERITY_LEGEND_ITEMS: Array<{
  category: RiskCategory;
  label: string;
  fillColor: string;
  borderColor: string;
  borderStyle: "solid" | "dashed";
  description: string;
}> = [
  {
    category: "low",
    label: "Low Susceptibility",
    fillColor: "rgba(148, 133, 107, 0.25)",
    borderColor: "#766a56",
    borderStyle: "solid",
    description: "Lower baseline indicator score (0–25)",
  },
  {
    category: "moderate",
    label: "Moderate Susceptibility",
    fillColor: "rgba(204, 156, 0, 0.25)",
    borderColor: "#cc9c00",
    borderStyle: "solid",
    description: "Intermediate susceptibility score (25–50)",
  },
  {
    category: "high",
    label: "High Susceptibility",
    fillColor: "rgba(187, 65, 17, 0.28)",
    borderColor: "#bb4111",
    borderStyle: "solid",
    description: "Higher relative susceptibility score (50–75)",
  },
  {
    category: "severe",
    label: "Severe Susceptibility",
    fillColor: "rgba(140, 49, 13, 0.32)",
    borderColor: "#8c310d",
    borderStyle: "solid",
    description: "Extreme relative susceptibility (>75)",
  },
  {
    category: "insufficient_data",
    label: "Insufficient Data",
    fillColor: "rgba(106, 103, 98, 0.08)",
    borderColor: "#6a6762",
    borderStyle: "dashed",
    description: "Missing or unvalidated terrain input data",
  },
];
