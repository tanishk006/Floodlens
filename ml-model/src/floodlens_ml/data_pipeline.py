"""Terrain data acquisition, processing pipeline, and provenance generator.

Processes genuine Copernicus GLO-30 DEM rasters into verified terrain features
(elevation, slope, local relief, and D8 flow accumulation) for FloodLens
monitoring zones without fabricating synthetic values.
"""

import argparse
import json
import logging
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from floodlens_ml.terrain import extract_pilot_terrain_features

logger = logging.getLogger(__name__)

# Complete candidate monitoring zones catalog with Copernicus 1-degree tile metadata
ZONE_CATALOG_REGISTRY: dict[str, dict[str, Any]] = {
    "zone-uttar-pradesh": {
        "zone_id": "zone-uttar-pradesh",
        "name": "Uttar Pradesh Monitoring Zone",
        "state": "Uttar Pradesh",
        "coordinates": [80.9462, 26.8467],
        "tile_lat": 26,
        "tile_lon": 80,
    },
    "zone-bihar": {
        "zone_id": "zone-bihar",
        "name": "Bihar Monitoring Zone",
        "state": "Bihar",
        "coordinates": [85.1376, 25.5941],
        "tile_lat": 25,
        "tile_lon": 85,
    },
    "zone-punjab": {
        "zone_id": "zone-punjab",
        "name": "Punjab Monitoring Zone",
        "state": "Punjab",
        "coordinates": [75.3412, 31.1471],
        "tile_lat": 31,
        "tile_lon": 75,
    },
    "zone-rajasthan": {
        "zone_id": "zone-rajasthan",
        "name": "Rajasthan Monitoring Zone",
        "state": "Rajasthan",
        "coordinates": [75.7873, 26.9124],
        "tile_lat": 26,
        "tile_lon": 75,
    },
    "zone-assam": {
        "zone_id": "zone-assam",
        "name": "Assam Monitoring Zone",
        "state": "Assam",
        "coordinates": [91.7539, 26.1445],
        "tile_lat": 26,
        "tile_lon": 91,
    },
    "zone-west-bengal": {
        "zone_id": "zone-west-bengal",
        "name": "West Bengal Monitoring Zone",
        "state": "West Bengal",
        "coordinates": [88.3639, 22.5726],
        "tile_lat": 22,
        "tile_lon": 88,
    },
    "zone-haryana": {
        "zone_id": "zone-haryana",
        "name": "Haryana Monitoring Zone",
        "state": "Haryana",
        "coordinates": [76.0856, 29.0588],
        "tile_lat": 29,
        "tile_lon": 76,
    },
    "zone-odisha": {
        "zone_id": "zone-odisha",
        "name": "Odisha Monitoring Zone",
        "state": "Odisha",
        "coordinates": [85.8245, 20.2961],
        "tile_lat": 20,
        "tile_lon": 85,
    },
    "zone-andhra-pradesh": {
        "zone_id": "zone-andhra-pradesh",
        "name": "Andhra Pradesh Monitoring Zone",
        "state": "Andhra Pradesh",
        "coordinates": [80.6480, 16.5062],
        "tile_lat": 16,
        "tile_lon": 80,
    },
    "zone-gujarat": {
        "zone_id": "zone-gujarat",
        "name": "Gujarat Monitoring Zone",
        "state": "Gujarat",
        "coordinates": [72.5714, 23.0225],
        "tile_lat": 23,
        "tile_lon": 72,
    },
}

PROCESSING_CONFIG = {
    "hydrology_algorithm": (
        "D8 steepest descent flow routing with Priority-Flood "
        "pit conditioning (Barnes et al., 2014)"
    ),
    "local_relief_radius_m": 100.0,
    "catchment_half_window_cells": 100,
}


def get_copernicus_tile_info(lat: float, lon: float) -> dict[str, Any]:
    """Derive Copernicus DEM GLO-30 tile ID and download URL from coordinates."""
    floor_lat = int(lat)
    floor_lon = int(lon)
    lat_str = f"N{floor_lat:02d}_00" if floor_lat >= 0 else f"S{abs(floor_lat):02d}_00"
    lon_str = f"E{floor_lon:03d}_00" if floor_lon >= 0 else f"W{abs(floor_lon):03d}_00"
    product_id = f"Copernicus_DSM_COG_10_{lat_str}_{lon_str}_DEM"
    source_url = (
        f"https://copernicus-dem-30m.s3.amazonaws.com/{product_id}/{product_id}.tif"
    )
    return {
        "dataset_name": "Copernicus DEM GLO-30",
        "product_id": product_id,
        "source_url": source_url,
        "provider": "European Space Agency (ESA) / AWS Open Data Copernicus DEM",
        "licence": "Copernicus Sentinel Data Terms / Open Access Public Dataset",
        "vertical_datum": "EGM2008 geoid (meters)",
        "horizontal_crs": "EPSG:4326 (WGS84 2D)",
        "spatial_resolution": "1 arc-second (~30 meters)",
        "tile_bounds": [
            float(floor_lon),
            float(floor_lat),
            float(floor_lon + 1),
            float(floor_lat + 1),
        ],
    }


def download_copernicus_dem_tile(
    zone_id: str,
    raw_dir: Path | str,
    timeout_sec: int = 60,
) -> Path:
    """Download Copernicus DEM GLO-30 GeoTIFF tile from AWS Open Data if not present."""
    if zone_id not in ZONE_CATALOG_REGISTRY:
        raise ValueError(f"Unknown zone_id '{zone_id}'")

    zone_info = ZONE_CATALOG_REGISTRY[zone_id]
    lon, lat = zone_info["coordinates"]
    tile_info = get_copernicus_tile_info(lat, lon)
    product_id = tile_info["product_id"]

    out_dir = Path(raw_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    target_path = out_dir / f"{product_id}.tif"

    # Also check legacy alias for uttar pradesh if present
    if zone_id == "zone-uttar-pradesh":
        legacy_path = out_dir / "copernicus_dem_uttar_pradesh.tif"
        if legacy_path.is_file() and legacy_path.stat().st_size > 10 * 1024 * 1024:
            return legacy_path

    if target_path.is_file() and target_path.stat().st_size > 10 * 1024 * 1024:
        logger.info("Using cached DEM tile at %s", target_path)
        return target_path

    url = tile_info["source_url"]
    logger.info("Downloading %s from %s...", product_id, url)
    temp_target = out_dir / f"{product_id}.tmp"

    req = urllib.request.Request(
        url, headers={"User-Agent": "FloodLens/0.1.0-DataPipeline"}
    )
    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        with open(temp_target, "wb") as f:
            while True:
                chunk = resp.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)

    temp_target.replace(target_path)
    size_mb = target_path.stat().st_size / (1024 * 1024)
    logger.info("Successfully downloaded %s (%.1f MB)", target_path, size_mb)
    return target_path


def run_terrain_pipeline(
    zone_id: str = "zone-uttar-pradesh",
    dem_path: Path | str | None = None,
    output_path: Path | str | None = None,
    raw_dir: Path | str = "ml-model/data/raw",
    processed_dir: Path | str = "ml-model/data/processed",
) -> dict[str, Any]:
    """Execute terrain feature extraction and generate provenance metadata record.

    Args:
        zone_id: Identifier of monitoring zone to process.
        dem_path: Optional direct path to GeoTIFF; downloaded automatically if None.
        output_path: Optional explicit output JSON path.
        raw_dir: Directory for storing raw GeoTIFF rasters.
        processed_dir: Directory for saving processed JSON provenance records.

    Returns:
        Structured dictionary of verified terrain features and provenance metadata.
    """
    if zone_id not in ZONE_CATALOG_REGISTRY:
        valid_keys = list(ZONE_CATALOG_REGISTRY.keys())
        raise ValueError(
            f"Zone '{zone_id}' not found in registry. Valid zones: {valid_keys}"
        )

    zone_info = ZONE_CATALOG_REGISTRY[zone_id]
    lon, lat = zone_info["coordinates"]

    if dem_path is not None:
        raster_path = Path(dem_path)
    else:
        raster_path = download_copernicus_dem_tile(zone_id, raw_dir=raw_dir)

    if not raster_path.is_file() or raster_path.stat().st_size == 0:
        raise FileNotFoundError(
            f"Input DEM file '{raster_path}' does not exist or is empty."
        )

    tile_provenance = get_copernicus_tile_info(lat, lon)
    extracted = extract_pilot_terrain_features(
        dem_path=raster_path,
        target_lat=lat,
        target_lon=lon,
        radius_m=PROCESSING_CONFIG["local_relief_radius_m"],
        catchment_half_cells=PROCESSING_CONFIG["catchment_half_window_cells"],
    )

    provenance_record = {
        "zone_id": zone_info["zone_id"],
        "zone_name": zone_info["name"],
        "state": zone_info["state"],
        "target_coordinates": zone_info["coordinates"],
        "data_status": "verified",
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "terrain_features": {
            "elevation_m": extracted["elevation_m"],
            "slope_deg": extracted["slope_deg"],
            "local_relief_m": extracted["local_relief_m"],
            "flow_accumulation": extracted["flow_accumulation"],
        },
        "dataset_provenance": tile_provenance,
        "processing_parameters": {
            "mean_cell_size_m": extracted["mean_cell_size_m"],
            "dy_m": extracted["dy_m"],
            "dx_m": extracted["dx_m"],
            "raster_pixel_indices": {
                "row": extracted["pixel_row"],
                "col": extracted["pixel_col"],
            },
            "subcatchment_window_shape": extracted["catchment_window_shape"],
            "algorithms": PROCESSING_CONFIG,
        },
        "scientific_notes": (
            "Elevation derived from genuine Copernicus GLO-30 DSM raster. "
            "Slope computed using central finite differences on metric grid. "
            "Local relief represents elevation difference within 100m radius. "
            "Flow accumulation calculated using D8 flow routing across a "
            "subcatchment window after Priority-Flood depression conditioning. "
            "This exploratory terrain index is non-probabilistic."
        ),
    }

    # Save to primary destination
    dest_file = (
        Path(output_path)
        if output_path is not None
        else Path(processed_dir) / f"{zone_id}_provenance.json"
    )
    dest_file.parent.mkdir(parents=True, exist_ok=True)
    with open(dest_file, "w", encoding="utf-8") as f:
        json.dump(provenance_record, f, indent=2)
    logger.info("Saved terrain provenance record to %s", dest_file)

    # For zone-uttar-pradesh, maintain pilot_uttar_pradesh_provenance.json alias
    if zone_id == "zone-uttar-pradesh":
        alias_file = Path(processed_dir) / "pilot_uttar_pradesh_provenance.json"
        with open(alias_file, "w", encoding="utf-8") as f:
            json.dump(provenance_record, f, indent=2)

    return provenance_record


def run_all_zones(
    raw_dir: Path | str = "ml-model/data/raw",
    processed_dir: Path | str = "ml-model/data/processed",
) -> dict[str, Any]:
    """Execute terrain extraction across all candidate monitoring zones."""
    results: dict[str, Any] = {"successful": [], "failed": []}
    for zone_id in ZONE_CATALOG_REGISTRY:
        try:
            rec = run_terrain_pipeline(
                zone_id=zone_id,
                raw_dir=raw_dir,
                processed_dir=processed_dir,
            )
            results["successful"].append(
                {
                    "zone_id": zone_id,
                    "name": rec["zone_name"],
                    "elevation_m": rec["terrain_features"]["elevation_m"],
                    "slope_deg": rec["terrain_features"]["slope_deg"],
                    "local_relief_m": rec["terrain_features"]["local_relief_m"],
                    "flow_accumulation": rec["terrain_features"]["flow_accumulation"],
                }
            )
        except Exception as e:
            logger.error("Failed processing zone %s: %s", zone_id, e)
            results["failed"].append({"zone_id": zone_id, "error": str(e)})

    return results


def main() -> None:
    """CLI entrypoint for running terrain data pipeline."""
    parser = argparse.ArgumentParser(
        description="FloodLens Terrain Processing Pipeline"
    )
    parser.add_argument(
        "--zone",
        type=str,
        default="zone-uttar-pradesh",
        help="Monitoring zone ID to process, or 'all'",
    )
    parser.add_argument(
        "--dem",
        type=str,
        default=None,
        help="Optional explicit path to Copernicus GLO-30 DEM GeoTIFF",
    )
    parser.add_argument(
        "--out",
        type=str,
        default=None,
        help="Optional explicit path to output provenance JSON file",
    )
    parser.add_argument(
        "--raw-dir",
        type=str,
        default="ml-model/data/raw",
        help="Directory for caching raw DEM GeoTIFF files",
    )
    parser.add_argument(
        "--processed-dir",
        type=str,
        default="ml-model/data/processed",
        help="Directory for saving processed provenance JSON files",
    )
    args = parser.parse_args()

    if args.zone == "all":
        summary = run_all_zones(raw_dir=args.raw_dir, processed_dir=args.processed_dir)
        print(json.dumps(summary, indent=2))
    else:
        record = run_terrain_pipeline(
            zone_id=args.zone,
            dem_path=args.dem,
            output_path=args.out,
            raw_dir=args.raw_dir,
            processed_dir=args.processed_dir,
        )
        print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
