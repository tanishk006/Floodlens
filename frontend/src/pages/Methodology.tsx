import type { RiskScoreResult } from "../api/types";
import AssessmentCard from "../components/AssessmentCard";

interface MethodologyProps {
  riskResult?: RiskScoreResult | null;
}

export default function Methodology({ riskResult }: MethodologyProps) {
  const factorWeights = [
    {
      name: "Rainfall Intensity",
      key: "rainfall",
      weight: 0.30,
      description:
        "Hydrological meteorological forcing factor. Normalized linearly across exploratory bounds [0.0, 115.0 mm/hr].",
      dataStatus: "Dynamic Scenario / NWP Forecast",
      statusTone: "accent" as const,
    },
    {
      name: "Low Elevation",
      key: "low_elevation",
      weight: 0.25,
      description:
        "Topographic elevation susceptibility. Normalized inversely across bounds [0.0, 100.0 m] (lower ground = higher index).",
      dataStatus: "DEM Pending (Copernicus 30m)",
      statusTone: "neutral" as const,
    },
    {
      name: "Flow Accumulation",
      key: "flow_accumulation",
      weight: 0.20,
      description:
        "Upslope contributing area computed via hydrologically conditioned D8 flow routing across bounds [0.0, 1000.0].",
      dataStatus: "DEM Derivative Pending",
      statusTone: "neutral" as const,
    },
    {
      name: "Local Relief",
      key: "local_relief",
      weight: 0.15,
      description:
        "Neighborhood elevation difference (elevation range within 100m radius) across bounds [0.0, 10.0 m]. Flatter local relief indicates ponding depressions.",
      dataStatus: "DEM Derivative Pending",
      statusTone: "neutral" as const,
    },
    {
      name: "Slope",
      key: "slope",
      weight: 0.10,
      description:
        "Terrain gradient in degrees across bounds [0.0, 30.0°]. Flatter slopes reduce runoff velocity and impede gravity drainage.",
      dataStatus: "DEM Derivative Pending",
      statusTone: "neutral" as const,
    },
  ];

  const pipelineStages = [
    {
      step: "01",
      title: "Geospatial Raster Ingestion",
      tech: "Rasterio / GDAL / Shapely",
      description:
        "Acquires Copernicus GLO-30 DEM rasters and HydroSHEDS vector layers. Reprojects to EPSG:4326/3857, clips to Area of Interest (AOI) bounding boxes, and handles nodata masking.",
    },
    {
      step: "02",
      title: "Hydrological Feature Extraction",
      tech: "floodlens_ml.features (NumPy / SciPy)",
      description:
        "Executes pit-filling, D8 slope calculation, flow routing accumulation, and Topographic Wetness Index (TWI) calculation across micro-catchments.",
    },
    {
      step: "03",
      title: "Multi-Criteria Heuristic Scoring",
      tech: "floodlens_ml.scoring",
      description:
        "Combines weighted topographic derivatives with scenario rainfall parameters. Evaluates completeness: if critical DEM derivatives are missing, strictly issues `insufficient_data` status.",
    },
    {
      step: "04",
      title: "FastAPI REST Engine",
      tech: "FastAPI / Pydantic v2 / Uvicorn",
      description:
        "Serves candidate monitoring zones (`/api/zones`), dynamic scenario risk estimation (`/api/risk/estimate`), and health telemetry (`/api/health`) with rigorous schema validation.",
    },
    {
      step: "05",
      title: "Interactive Geospatial Intelligence",
      tech: "React 18 / MapLibre GL / Poppins / Tailwind",
      description:
        "Street-level decision support UI providing real-time slider-driven rainfall scenario lab, contextual factor explainability, and cartographic visual intelligence.",
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#131211] p-6 md:p-10 text-text-primary">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="border-b border-border-subtle pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-mono bg-floral-white-950 text-accent-text border border-floral-white-800 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            ENGINEERING & MODELING DISCLOSURE
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary mb-2">
            FloodLens Methodology & Technical Architecture
          </h1>
          <p className="text-text-muted max-w-3xl text-sm leading-relaxed">
            FloodLens combines multi-criteria topographic analysis with hydrologic rainfall forcing
            to evaluate localized surface inundation vulnerability. Below is the full mathematical
            formulation, pipeline telemetry, and data integrity disclosure.
          </p>
        </div>

        {/* Essential Scientific Disclaimer Alert */}
        <div className="rounded border border-warning-primary/40 bg-surface-primary p-5 md:p-6 text-text-primary">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded bg-spicy-paprika-950 text-warning-primary border border-spicy-paprika-700 mt-0.5 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-text-primary text-base">
                Operational Purpose & Scientific Disclaimer
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                <strong className="text-text-primary">FloodLens produces a comparative susceptibility index, NOT an absolute flood forecast or hydraulic probability.</strong>{" "}
                The composite risk index is a heuristic aggregation of physical factors designed for rapid screening and risk ranking.
                It does not model 2D dynamic hydrodynamic wave propagation (e.g., shallow water equations), underground drainage pipe network backflow,
                or structural flood defense failure (e.g., levee breaching).
              </p>
            </div>
          </div>
        </div>

        {/* Mathematical Model Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-accent font-mono text-base">01.</span>
              Mathematical Formulation
            </h2>
            <p className="text-text-secondary text-xs leading-relaxed">
              When all topographic raster layers are ingested, the localized Composite Risk Index{" "}
              <code className="text-accent bg-surface-primary px-1.5 py-0.5 rounded font-mono border border-border-subtle">
                R
              </code>{" "}
              is calculated as the weighted linear combination of normalized physical factors{" "}
              <code className="text-accent bg-surface-primary px-1.5 py-0.5 rounded font-mono border border-border-subtle">
                v_i ∈ [0, 1]
              </code>
              :
            </p>

            <div className="p-4 rounded bg-surface-primary border border-border-subtle font-mono text-center text-sm md:text-base text-accent">
              R = 100 × ∑ (w_i × v_i) &nbsp;&nbsp;&nbsp;where&nbsp; ∑ w_i = 1.0
            </div>

            <div className="overflow-x-auto rounded border border-border-subtle">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-secondary text-text-muted font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3.5">Factor</th>
                    <th className="py-2.5 px-3.5">Weight</th>
                    <th className="py-2.5 px-3.5">Description</th>
                    <th className="py-2.5 px-3.5">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50 bg-surface-primary">
                  {factorWeights.map((f) => (
                    <tr key={f.key} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-medium text-text-primary">{f.name}</td>
                      <td className="py-2.5 px-3.5 font-mono text-accent">
                        {(f.weight * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-3.5 text-text-secondary">{f.description}</td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] px-2 py-0.5 rounded font-mono border ${
                            f.statusTone === "accent"
                              ? "bg-floral-white-950 text-accent-text border-floral-white-800"
                              : "bg-surface-secondary text-text-muted border-border-subtle"
                          }`}
                        >
                          {f.dataStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Missing Data & Integrity Column */}
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-accent font-mono text-base">02.</span>
              Data Integrity Guarantee
            </h2>
            <div className="p-4 rounded bg-surface-primary border border-border-subtle space-y-3">
              <div className="flex items-center gap-2 text-warning-primary text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-primary" />
                Zero Hallucination Policy
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Rather than fabricating speculative terrain metrics or generating pseudo-random
                risk percentages for locations without validated DEM rasters, FloodLens strictly
                marks zones with{" "}
                <code className="text-accent font-mono bg-surface-secondary px-1 py-0.5 rounded border border-border-subtle">
                  insufficient_data
                </code>
                .
              </p>
              <div className="text-xs text-text-muted space-y-2 border-t border-border-subtle/60 pt-3 font-mono">
                <div className="flex justify-between">
                  <span>Backend Test Coverage:</span>
                  <span className="text-text-primary">19 / 19 Passing</span>
                </div>
                <div className="flex justify-between">
                  <span>ML Feature Tests:</span>
                  <span className="text-text-primary">43 / 43 Passing</span>
                </div>
                <div className="flex justify-between">
                  <span>Candidate Monitoring Zones:</span>
                  <span className="text-accent">10 Indian Zones</span>
                </div>
              </div>
            </div>

            {riskResult && (
              <div className="p-4 rounded bg-surface-primary border border-border-subtle space-y-2.5 font-mono text-xs">
                <h3 className="text-[10px] uppercase text-text-muted font-semibold">
                  Active Runtime Telemetry
                </h3>
                <div className="space-y-1 text-text-secondary text-2xs">
                  <div>Zone ID: <span className="text-text-primary">{riskResult.zone_id}</span></div>
                  <div>Scenario: <span className="text-accent">{riskResult.scenario.label}</span></div>
                  <div>Rainfall: <span className="text-text-primary">{riskResult.scenario.rainfall_mm_per_hour} mm/h</span></div>
                  <div>Category: <span className="text-text-primary uppercase">{riskResult.risk_category}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Architecture */}
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <span className="text-accent font-mono text-base">03.</span>
            End-to-End Processing Pipeline
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {pipelineStages.map((stage) => (
              <AssessmentCard
                key={stage.step}
                compact
                title={`${stage.step}. ${stage.title}`}
                context={stage.tech}
                result={
                  <p className="text-2xs text-text-secondary leading-relaxed font-sans">
                    {stage.description}
                  </p>
                }
              />
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-2xs text-text-muted gap-3 font-mono">
          <div>FloodLens — Environmental Intelligence Platform</div>
          <div>Stack: FastAPI + MapLibre GL + React 18 + Copernicus DEM</div>
        </div>
      </div>
    </div>
  );
}
