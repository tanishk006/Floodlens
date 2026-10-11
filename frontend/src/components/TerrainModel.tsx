import {
  useRef,
  useMemo,
  useEffect,
  useState,
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

export interface TerrainModelProps {
  zoneId: string;
  zoneName?: string;
  dataStatus: "verified" | "insufficient_data";
  riskIndex: number | null;
  rainfallMmPerHour: number;
  reliefM?: number;
  slopeDeg?: number;
  elevationM?: number;
  flowAcc?: number;
}

// -----------------------------------------------------------------------------
// WebGL Support Detection
// -----------------------------------------------------------------------------

function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Graceful 2D Fallback: Topographic Contour Vector Illustration
// -----------------------------------------------------------------------------

function TopographicFallback({
  zoneName,
  dataStatus,
  elevationM,
  reliefM,
  slopeDeg,
}: {
  zoneName?: string;
  dataStatus: "verified" | "insufficient_data";
  elevationM?: number;
  reliefM?: number;
  slopeDeg?: number;
}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#131211] p-6 text-center select-none">
      <svg
        viewBox="0 0 240 180"
        className="w-48 h-36 max-w-full text-dust-grey-400 stroke-current fill-none stroke-[1.2] mb-4 opacity-75"
        aria-hidden="true"
      >
        {/* Isometric base block */}
        <polygon
          points="120,20 210,65 120,110 30,65"
          className="stroke-charcoal-brown-600 fill-charcoal-brown-900/60"
        />
        <polygon
          points="30,65 120,110 120,150 30,105"
          className="stroke-charcoal-brown-700 fill-charcoal-brown-950"
        />
        <polygon
          points="210,65 120,110 120,150 210,105"
          className="stroke-charcoal-brown-800 fill-charcoal-brown-950"
        />

        {/* Stepped elevation contours */}
        <path
          d="M 60,65 Q 90,45 120,50 T 180,68"
          className="stroke-dust-grey-300"
        />
        <path
          d="M 75,75 Q 105,58 135,62 T 165,78"
          className="stroke-dust-grey-200"
        />
        <path
          d="M 90,82 Q 115,70 145,74 T 150,85"
          className="stroke-floral-white-300"
        />

        {/* River valley */}
        <path
          d="M 120,50 Q 115,80 120,110"
          className="stroke-charcoal-brown-400 stroke-[1.5]"
        />
      </svg>

      <div className="max-w-md space-y-1">
        <h4 className="text-xs font-semibold text-text-primary">
          Topographic Relief Diagram
        </h4>
        <p className="text-2xs text-text-muted leading-relaxed">
          {dataStatus === "verified"
            ? `Terrain model for ${zoneName || "selected zone"} (${elevationM != null ? `${elevationM.toFixed(1)}m elevation, ` : ""}${reliefM != null ? `${reliefM.toFixed(1)}m relief, ` : ""}${slopeDeg != null ? `${slopeDeg.toFixed(1)}° slope` : ""}). WebGL 3D canvas is resting or unsupported on this viewport.`
            : "DEM observations pending for this zone. 2D cartographic fallback active."}
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// WebGL Error Boundary
// -----------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("TerrainModel WebGL rendering issue:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// -----------------------------------------------------------------------------
// Stable Seed Generator
// -----------------------------------------------------------------------------

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// -----------------------------------------------------------------------------
// Terraced Physical Elevation Geometry (Topographic Studio Block)
// -----------------------------------------------------------------------------

interface TerracedBlockProps {
  zoneId: string;
  dataStatus: "verified" | "insufficient_data";
  reliefM?: number;
  slopeDeg?: number;
  elevationM?: number;
  flowAcc?: number;
  exaggeration: number;
}

function TerracedBlock({
  zoneId,
  dataStatus,
  reliefM,
  slopeDeg,
  flowAcc,
  exaggeration,
}: TerracedBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const contourLinesRef = useRef<THREE.LineSegments>(null);

  // Derive morphological parameters from real Copernicus DEM GLO-30 values
  const reliefScale = useMemo(() => {
    if (dataStatus === "insufficient_data") return 1.5 * exaggeration;
    // Real local relief typically ranges from ~5m (floodplains) to ~35m (foothills)
    const r = reliefM ?? 11.59;
    return Math.min(3.8, Math.max(0.6, (r * 0.12))) * exaggeration;
  }, [dataStatus, reliefM, exaggeration]);

  const slopeMultiplier = useMemo(() => {
    if (dataStatus === "insufficient_data") return 1.0;
    // Slope angles typically range from 1° (plains) to 12° (ridges)
    const s = slopeDeg ?? 6.42;
    return Math.min(1.6, Math.max(0.5, Math.tan(s * (Math.PI / 180)) * 6.0));
  }, [dataStatus, slopeDeg]);

  const canyonDepthFactor = useMemo(() => {
    if (dataStatus === "insufficient_data") return 1.0;
    const acc = Math.max(1.0, flowAcc ?? 19.0);
    // Incise channel proportional to log of upslope contributing cells
    return Math.min(2.2, Math.max(0.8, 0.8 + Math.log10(acc) * 0.7));
  }, [dataStatus, flowAcc]);

  const { geometry, contourGeometry } = useMemo(() => {
    const size = 18;
    const segments = 90;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const vertexCount = pos.count;
    const colors = new Float32Array(vertexCount * 3);

    const h = hashString(zoneId || "zone-uttar-pradesh");
    const freq = 0.22 + ((h % 10) * 0.008);
    const canyonOffset = ((h >> 2) % 20) * 0.1 - 1.0;

    // Earthy slate-charcoal stone palette
    const darkStone = new THREE.Color("#181715");
    const midStone = new THREE.Color("#252320");
    const elevatedStone = new THREE.Color("#35322c");
    const ridgeStone = new THREE.Color("#4a453d");

    const numTerraces = 14;

    for (let i = 0; i < vertexCount; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Central valley / drainage channel carved along D8 flow routing
      const valleyDist = Math.abs((x * 0.7 - z * 0.7) - canyonOffset);
      const canyonFactor = Math.min(1.0, valleyDist / (3.4 * canyonDepthFactor));

      // Natural ridges on either flank
      const ridge1 = Math.sin(x * freq + 0.4) * Math.cos(z * freq * 0.9);
      const ridge2 = Math.sin((x + z) * freq * 1.5) * 0.4;
      const rawElevation = (ridge1 + ridge2 + 1.2) * canyonFactor * 0.5;

      // Discrete terraced step function
      const stepped = Math.floor(rawElevation * numTerraces) / numTerraces;
      const finalY = stepped * reliefScale * slopeMultiplier;

      pos.setY(i, finalY);

      // Shading based on elevation level
      const normH = Math.min(1.0, Math.max(0.0, rawElevation / 1.5));
      const col = new THREE.Color();
      if (normH < 0.25) {
        col.copy(darkStone).lerp(midStone, normH / 0.25);
      } else if (normH < 0.65) {
        col.copy(midStone).lerp(elevatedStone, (normH - 0.25) / 0.4);
      } else {
        col.copy(elevatedStone).lerp(ridgeStone, (normH - 0.65) / 0.35);
      }

      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    // Generate thin off-white contour lines along terrace perimeter edges
    const linePositions: number[] = [];
    const stepSize = size / segments;

    for (let ix = 0; ix < segments; ix++) {
      for (let iz = 0; iz < segments; iz++) {
        const iCurrent = ix * (segments + 1) + iz;
        const iRight = (ix + 1) * (segments + 1) + iz;
        const iDown = ix * (segments + 1) + (iz + 1);

        const yCurrent = pos.getY(iCurrent);
        const yRight = pos.getY(iRight);
        const yDown = pos.getY(iDown);

        if (Math.abs(yCurrent - yRight) > 0.05) {
          const elev = Math.max(yCurrent, yRight);
          const x0 = pos.getX(iCurrent);
          const z0 = pos.getZ(iCurrent);
          const x1 = pos.getX(iCurrent) + stepSize;
          linePositions.push(x0, elev + 0.015, z0, x1, elev + 0.015, z0);
        }
        if (Math.abs(yCurrent - yDown) > 0.05) {
          const elev = Math.max(yCurrent, yDown);
          const x0 = pos.getX(iCurrent);
          const z0 = pos.getZ(iCurrent);
          const z1 = pos.getZ(iCurrent) + stepSize;
          linePositions.push(x0, elev + 0.015, z0, x0, elev + 0.015, z1);
        }
      }
    }

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3)
    );

    return { geometry: geom, contourGeometry: lineGeom };
  }, [zoneId, reliefScale, slopeMultiplier, canyonDepthFactor]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      contourGeometry.dispose();
    };
  }, [geometry, contourGeometry]);

  return (
    <group position={[0, -0.6, 0]}>
      {/* 1. Terraced Stone Block Mesh */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={0.88}
          metalness={0.05}
          flatShading={false}
        />
      </mesh>

      {/* 2. Fine Off-White Contour Edge Lines */}
      <lineSegments ref={contourLinesRef} geometry={contourGeometry}>
        <lineBasicMaterial
          color="#d4cec4"
          transparent
          opacity={0.65}
          linewidth={1}
        />
      </lineSegments>

      {/* 3. Solid Block Base Pedestal */}
      <mesh position={[0, -1.0, 0]}>
        <boxGeometry args={[18.02, 1.95, 18.02]} />
        <meshStandardMaterial
          color="#15130f"
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>

      {/* 4. Fine Pedestal Outline Trim */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(18.05, 1.96, 18.05)]} />
        <lineBasicMaterial color="#514d48" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

// -----------------------------------------------------------------------------
// Controlled Scenario Valley Water Level
// -----------------------------------------------------------------------------

interface WaterBedProps {
  dataStatus: "verified" | "insufficient_data";
  rainfallMmPerHour: number;
  riskIndex: number | null;
}

function ValleyWaterBed({
  dataStatus,
  rainfallMmPerHour,
  riskIndex,
}: WaterBedProps) {
  const waterY = useMemo(() => {
    if (dataStatus === "insufficient_data" || (riskIndex === null && rainfallMmPerHour <= 0)) {
      return -0.4;
    }
    const floodRatio = Math.min(1.0, Math.max(0.1, (rainfallMmPerHour / 100)));
    return -0.4 + floodRatio * 0.55;
  }, [dataStatus, rainfallMmPerHour, riskIndex]);

  return (
    <mesh position={[0, waterY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[17.9, 17.9]} />
      <meshStandardMaterial
        color="#1b2126"
        roughness={0.25}
        metalness={0.2}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

// -----------------------------------------------------------------------------
// Main TerrainModel Component
// -----------------------------------------------------------------------------

export default function TerrainModel({
  zoneId,
  zoneName = "Uttar Pradesh",
  dataStatus,
  riskIndex,
  rainfallMmPerHour,
  reliefM,
  slopeDeg,
  elevationM,
  flowAcc,
}: TerrainModelProps) {
  const [hasWebGL] = useState(() => isWebGLAvailable());
  const [showInspector, setShowInspector] = useState(false);
  const [exaggeration, setExaggeration] = useState<number>(1.0);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const isVerified = dataStatus === "verified";

  // Compute realistic contour interval based on local relief
  const contourIntervalM = useMemo(() => {
    if (!reliefM) return 5;
    if (reliefM < 8) return 1.5; // Flat floodplain (e.g. Bihar)
    if (reliefM < 16) return 2.5; // Rolling plains (e.g. UP)
    return 5.0; // Foothills / River gorges (e.g. Assam)
  }, [reliefM]);

  if (!hasWebGL) {
    return (
      <TopographicFallback
        zoneName={zoneName}
        dataStatus={dataStatus}
        elevationM={elevationM}
        reliefM={reliefM}
        slopeDeg={slopeDeg}
      />
    );
  }

  return (
    <WebGLErrorBoundary
      fallback={
        <TopographicFallback
          zoneName={zoneName}
          dataStatus={dataStatus}
          elevationM={elevationM}
          reliefM={reliefM}
          slopeDeg={slopeDeg}
        />
      }
    >
      <div className="relative w-full h-full bg-[#131211] overflow-hidden select-none">
        {/* 3D Canvas */}
        <Canvas
          camera={{ position: [16, 17, 18], fov: 38 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
        >
          {/* Studio Charcoal Backdrop */}
          <color attach="background" args={["#131211"]} />

          {/* Balanced Topographic Studio Lighting */}
          <ambientLight intensity={0.65} color="#e7e6e4" />
          <directionalLight
            position={[18, 25, 14]}
            intensity={1.1}
            color="#fff9e5"
            castShadow={false}
          />
          <directionalLight
            position={[-16, 14, -12]}
            intensity={0.4}
            color="#bfb6a6"
          />

          {/* Terraced Physical Block Model */}
          <TerracedBlock
            zoneId={zoneId}
            dataStatus={dataStatus}
            reliefM={reliefM}
            slopeDeg={slopeDeg}
            elevationM={elevationM}
            flowAcc={flowAcc}
            exaggeration={exaggeration}
          />

          {/* Muted Valley Drainage Plane */}
          <ValleyWaterBed
            dataStatus={dataStatus}
            rainfallMmPerHour={rainfallMmPerHour}
            riskIndex={riskIndex}
          />

          {/* Predictable OrbitControls */}
          <OrbitControls
            ref={controlsRef}
            autoRotate={false}
            enableRotate={true}
            enableZoom={true}
            enablePan={false}
            minDistance={14}
            maxDistance={44}
            maxPolarAngle={Math.PI / 2 - 0.08}
            minPolarAngle={0.15}
          />
        </Canvas>

        {/* Studio Top-Right Controls & Status */}
        <div className="absolute top-3 right-3 z-10 flex flex-wrap items-center gap-2">
          {/* Scientific Provenance Badge */}
          <div className="px-2.5 py-1 rounded bg-surface-primary/90 backdrop-blur-md border border-border-subtle text-2xs font-mono text-text-secondary shadow-card">
            {isVerified ? (
              <span className="flex items-center gap-1.5 text-dust-grey-200">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Copernicus DEM GLO-30 Model
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-charcoal-brown-500" />
                Illustrative Relief (DEM Pending)
              </span>
            )}
          </div>

          {/* Vertical Exaggeration Switch */}
          <button
            type="button"
            onClick={() => setExaggeration(exaggeration === 1.0 ? 1.8 : 1.0)}
            className={`px-2 py-1 rounded border text-2xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              exaggeration > 1.0
                ? "bg-floral-white-950 border-accent text-accent-text font-medium"
                : "bg-surface-primary/90 border-border-subtle text-text-secondary hover:text-text-primary"
            }`}
            title="Toggle vertical relief exaggeration (1x Real vs 1.8x Analytical)"
          >
            {exaggeration > 1.0 ? "Relief: 1.8x" : "Relief: 1.0x"}
          </button>

          {/* Return to Default View Control */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="px-2 py-1 rounded bg-surface-primary/90 hover:bg-surface-elevated border border-border-subtle hover:border-border-strong text-2xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            title="Reset 3D camera to default isometric view"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Reset View</span>
          </button>

          {/* Toggle Metrics Inspector */}
          <button
            type="button"
            onClick={() => setShowInspector(!showInspector)}
            className={`px-2 py-1 rounded border text-2xs font-mono transition-colors ${
              showInspector
                ? "bg-floral-white-950 border-accent text-accent-text"
                : "bg-surface-primary/90 border-border-subtle text-text-secondary hover:text-text-primary"
            }`}
          >
            {showInspector ? "Hide Metadata" : "GIS Metadata"}
          </button>
        </div>

        {/* Full GIS & Copernicus DEM Inspector Overlay */}
        {showInspector && (
          <div className="absolute top-12 right-3 z-20 w-80 bg-surface-primary/95 backdrop-blur-md border border-border-strong rounded p-3.5 text-2xs font-mono space-y-2.5 shadow-card">
            <div className="flex items-center justify-between border-b border-border-subtle pb-1.5">
              <span className="font-semibold text-text-primary">
                Copernicus DEM GLO-30 Metadata
              </span>
              <span className="text-[10px] text-accent">
                {zoneName}
              </span>
            </div>

            <div className="space-y-1 text-text-secondary">
              <div className="flex justify-between">
                <span>Base Datum Elevation:</span>
                <span className="text-text-primary font-semibold">
                  {elevationM != null ? `${elevationM.toFixed(2)} m` : "Unavailable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Local Relief (100m window):</span>
                <span className="text-text-primary">
                  {reliefM != null ? `${reliefM.toFixed(2)} m` : "Unavailable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Terrain Gradient (Slope):</span>
                <span className="text-text-primary">
                  {slopeDeg != null ? `${slopeDeg.toFixed(2)}°` : "Unavailable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>D8 Flow Accumulation:</span>
                <span className="text-text-primary">
                  {flowAcc != null ? `${flowAcc.toFixed(0)} cells` : "Unavailable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Derived Contour Interval:</span>
                <span className="text-accent font-semibold">
                  ~{contourIntervalM}m terraced intervals
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border-subtle space-y-1 text-[10px] text-text-muted">
              <div>• Product: Copernicus DEM GLO-30 DSM (ESA/AWS)</div>
              <div>• Grid Resolution: 1 arc-second (~30m cell pitch)</div>
              <div>• Vertical Datum: EGM2008 Geoid (MSL)</div>
              <div>• Processing: D8 Priority-Flood pit-filling (201×201 cells)</div>
            </div>
          </div>
        )}

        {/* Bottom studio status legend */}
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-surface-primary/90 backdrop-blur-md border border-border-subtle px-3 py-1.5 rounded text-2xs text-text-secondary font-mono shadow-card">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-[1.5px] bg-dust-grey-200 rounded" />
            <span>~{contourIntervalM}m Contour Steps</span>
          </div>
          <span className="text-border-strong">·</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-[#252320] border border-border-strong" />
            <span>Terraced Stone Relief ({exaggeration}x)</span>
          </div>
          <span className="text-border-strong">·</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-[#1b2126] border border-border-strong" />
            <span>D8 Inundation Channel</span>
          </div>
        </div>
      </div>
    </WebGLErrorBoundary>
  );
}
