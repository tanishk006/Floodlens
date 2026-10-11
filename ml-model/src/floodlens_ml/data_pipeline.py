"""Terrain data acquisition, processing pipeline, and provenance generator.

Processes genuine Copernicus GLO-30 DEM rasters into verified terrain features
(elevation, slope, local relief, and D8 flow accumulation) for FloodLens
monitoring zones without fabricating synthetic values.
"""

import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from floodlens_ml.terrain import extract_pilot_terrain_features

logger = logging.getLogger(__name__)

# Pilot configuration for Uttar Pradesh Monitoring Zone
PILOT_ZONE_CONFIG = {
    "zone_id": "zone-uttar-pradesh",
    "name": "Uttar Pradesh Monitoring Zone",
    "state": "Uttar Pradesh",
    "coordinates": [80.9462, 26.8467],
    "dem_source": {
        "dataset_name": "Copernicus DEM GLO-30",
        "product_id": "Copernicus_DSM_COG_10_N26_00_E080_00_DEM",
        "source_url": (
            "https://copernicus-dem-30m.s3.amazonaws.com/"
            "Copernicus_DSM_COG_10_N26_00_E080_00_DEM/"
            "Copernicus_DSM_COG_10_N26_00_E080_00_DEM.tif"
        ),
        "provider": "European Space Agency (ESA) / AWS Open Data Copernicus DEM",
        "licence": "Copernicus Sentinel Data Terms / Open Access Public Dataset",
        "vertical_datum": "EGM2008 geoid (meters)",
        "horizontal_crs": "EPSG:4326 (WGS84 2D)",
        "spatial_resolution": "1 arc-second (~30 meters)",
        "tile_bounds": [80.0, 26.0, 81.0, 27.0],
    },
    "processing": {
        "hydrology_algorithm": (
            "D8 steepest descent flow routing with Priority-Flood "
            "pit conditioning (Barnes et al., 2014)"
        ),
        "local_relief_radius_m": 100.0,
        "catchment_half_window_cells": 100,
    },
}


def run_terrain_pipeline(
    dem_path: Path | str,
    output_path: Path | str | None = None,
    zone_id: str = "zone-uttar-pradesh",
) -> dict[str, Any]:
    """Execute terrain extraction and generate provenance metadata record.

    Args:
        dem_path: Path to the Copernicus GLO-30 DEM GeoTIFF.
        output_path: Destination JSON path for provenance records.
        zone_id: Identifier of monitoring zone to process.

    Returns:
        Structured dictionary of verified terrain features and provenance metadata.
    """
    if zone_id != "zone-uttar-pradesh":
        raise ValueError(
            f"Pipeline configured for pilot 'zone-uttar-pradesh', got '{zone_id}'"
        )

    path = Path(dem_path)
    if not path.is_file():
        raise FileNotFoundError(f"Input DEM file '{path}' does not exist.")

    lon, lat = PILOT_ZONE_CONFIG["coordinates"]
    extracted = extract_pilot_terrain_features(
        dem_path=path,
        target_lat=lat,
        target_lon=lon,
        radius_m=PILOT_ZONE_CONFIG["processing"]["local_relief_radius_m"],
        catchment_half_cells=PILOT_ZONE_CONFIG["processing"][
            "catchment_half_window_cells"
        ],
    )

    provenance_record = {
        "zone_id": PILOT_ZONE_CONFIG["zone_id"],
        "zone_name": PILOT_ZONE_CONFIG["name"],
        "state": PILOT_ZONE_CONFIG["state"],
        "target_coordinates": PILOT_ZONE_CONFIG["coordinates"],
        "data_status": "verified",
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "terrain_features": {
            "elevation_m": extracted["elevation_m"],
            "slope_deg": extracted["slope_deg"],
            "local_relief_m": extracted["local_relief_m"],
            "flow_accumulation": extracted["flow_accumulation"],
        },
        "dataset_provenance": PILOT_ZONE_CONFIG["dem_source"],
        "processing_parameters": {
            "mean_cell_size_m": extracted["mean_cell_size_m"],
            "dy_m": extracted["dy_m"],
            "dx_m": extracted["dx_m"],
            "raster_pixel_indices": {
                "row": extracted["pixel_row"],
                "col": extracted["pixel_col"],
            },
            "subcatchment_window_shape": extracted["catchment_window_shape"],
            "algorithms": PILOT_ZONE_CONFIG["processing"],
        },
        "scientific_notes": (
            "Elevation derived from genuine Copernicus GLO-30 DSM raster. "
            "Slope computed using central finite differences on metric grid. "
            "Local relief represents elevation difference within 100m radius. "
            "Flow accumulation calculated using D8 flow routing across a "
            "subcatchment after Priority-Flood depression conditioning. "
            "This exploratory terrain index is non-probabilistic."
        ),
    }

    if output_path is not None:
        out_file = Path(output_path)
        out_file.parent.mkdir(parents=True, exist_ok=True)
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(provenance_record, f, indent=2)
        logger.info("Saved terrain provenance record to %s", out_file)

    return provenance_record


def main() -> None:
    """CLI entrypoint for running terrain data pipeline."""
    parser = argparse.ArgumentParser(
        description="FloodLens Terrain Processing Pipeline"
    )
    parser.add_argument(
        "--dem",
        type=str,
        default="ml-model/data/raw/copernicus_dem_uttar_pradesh.tif",
        help="Path to Copernicus GLO-30 DEM GeoTIFF",
    )
    parser.add_argument(
        "--out",
        type=str,
        default="ml-model/data/processed/pilot_uttar_pradesh_provenance.json",
        help="Path to output provenance JSON file",
    )
    parser.add_argument(
        "--zone",
        type=str,
        default="zone-uttar-pradesh",
        help="Monitoring zone ID to process",
    )
    args = parser.parse_args()

    record = run_terrain_pipeline(
        dem_path=args.dem,
        output_path=args.out,
        zone_id=args.zone,
    )
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
