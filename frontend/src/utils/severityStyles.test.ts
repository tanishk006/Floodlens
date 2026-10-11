import { describe, it, expect } from "vitest";
import { getSeverityStyle } from "./severityStyles";

describe("getSeverityStyle", () => {
  it("maps 'low' category to muted dusty gray-brown styling", () => {
    const style = getSeverityStyle("low");
    expect(style.category).toBe("low");
    expect(style.fillColor).toBe("#94856b");
    expect(style.fillOpacity).toBeGreaterThanOrEqual(0.12);
    expect(style.fillOpacity).toBeLessThanOrEqual(0.20);
    expect(style.borderColor).toBe("#766a56");
    expect(style.dashArray).toBeUndefined();
  });

  it("maps 'moderate' category to muted gold styling", () => {
    const style = getSeverityStyle("moderate");
    expect(style.category).toBe("moderate");
    expect(style.fillColor).toBe("#cc9c00");
    expect(style.borderColor).toBe("#cc9c00");
    expect(style.fillOpacity).toBeGreaterThanOrEqual(0.18);
    expect(style.fillOpacity).toBeLessThanOrEqual(0.25);
  });

  it("maps 'high' category to muted paprika styling without fluorescent red", () => {
    const style = getSeverityStyle("high");
    expect(style.category).toBe("high");
    expect(style.fillColor).toBe("#bb4111");
    expect(style.borderColor).toBe("#bb4111");
    expect(style.fillOpacity).toBeGreaterThanOrEqual(0.22);
  });

  it("maps 'insufficient_data' to neutral dashed styling and transparent fill", () => {
    const style = getSeverityStyle("insufficient_data");
    expect(style.category).toBe("insufficient_data");
    expect(style.borderColor).toBe("#6a6762");
    expect(style.dashArray).toEqual([2, 2]);
    expect(style.fillOpacity).toBeLessThan(0.1);
  });

  it("safely falls back to insufficient_data for undefined or unexpected values", () => {
    const nullStyle = getSeverityStyle(null);
    expect(nullStyle.category).toBe("insufficient_data");
    const undefinedStyle = getSeverityStyle(undefined);
    expect(undefinedStyle.category).toBe("insufficient_data");
    const unknownStyle = getSeverityStyle("unsupported_random");
    expect(unknownStyle.category).toBe("insufficient_data");
  });
});
