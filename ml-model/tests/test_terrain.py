"""Tests for terrain processing and DEM verification routines."""

from pathlib import Path

import numpy as np
import pytest

from floodlens_ml.config import TerrainConfig
from floodlens_ml.terrain import (
    check_dem_availability,
    compute_local_relief,
    compute_slope_degrees,
    process_terrain_grid,
)


def test_check_dem_availability(tmp_path: Path) -> None:
    # Non-existent file
    missing = tmp_path / "non_existent.tif"
    ok, msg = check_dem_availability(missing)
    assert ok is False
    assert "not found" in msg

    # Empty 0-byte file
    empty = tmp_path / "empty.tif"
    empty.write_bytes(b"")
    ok, msg = check_dem_availability(empty)
    assert ok is False
    assert "empty" in msg

    # Non-empty file
    valid = tmp_path / "sample.tif"
    valid.write_bytes(b"fake_geotiff_header_data")
    ok, msg = check_dem_availability(valid)
    assert ok is True
    assert "found" in msg


def test_compute_slope_flat_surface() -> None:
    flat = np.full((10, 10), 50.0, dtype=float)
    slope = compute_slope_degrees(flat, cell_size_m=10.0)
    assert slope.shape == (10, 10)
    assert np.allclose(slope, 0.0)


def test_compute_slope_inclined_surface() -> None:
    # Elevation rises 10m every 10m in x direction (gradient = 1.0, 45 degrees)
    # Using a 10x10 grid with cell_size_m = 10.0
    x = np.arange(10, dtype=float) * 10.0
    grid = np.tile(x, (10, 1))

    slope = compute_slope_degrees(grid, cell_size_m=10.0)
    # Interior cells (away from edge boundary effects) should have 45 deg slope
    interior_slope = slope[1:-1, 1:-1]
    assert np.allclose(interior_slope, 45.0, atol=1e-3)


def test_compute_slope_invalid_parameters() -> None:
    grid = np.zeros((5, 5))
    with pytest.raises(ValueError, match="cell_size_m must be strictly positive"):
        compute_slope_degrees(grid, cell_size_m=0.0)

    with pytest.raises(ValueError, match="elevation_grid must be a 2D array"):
        compute_slope_degrees(np.zeros(5), cell_size_m=10.0)


def test_compute_local_relief() -> None:
    grid = np.array(
        [
            [10.0, 10.0, 10.0],
            [10.0, 25.0, 10.0],
            [10.0, 10.0, 10.0],
        ]
    )
    # Center cell has neighbor 10.0 and self 25.0 -> relief = 15.0
    relief = compute_local_relief(grid, cell_size_m=10.0, radius_m=15.0)
    assert relief[1, 1] == 15.0
    # Corner cell has neighbors up to 15m radius
    assert relief[0, 0] == 15.0


def test_process_terrain_grid() -> None:
    grid = np.array(
        [
            [10.0, 12.0, 14.0],
            [12.0, 15.0, 18.0],
            [14.0, 18.0, 22.0],
        ]
    )
    cfg = TerrainConfig(
        local_relief_radius_m=30.0,
        sink_depth_m=0.5,
        simplify_tolerance_m=2.0,
    )
    res = process_terrain_grid(grid, cell_size_m=10.0, terrain_cfg=cfg)
    assert res["elevation_min"] == 10.0
    assert res["elevation_max"] == 22.0
    assert res["grid_shape"] == (3, 3)
    assert res["slope_mean"] > 0.0


def test_fill_depressions_priority_flood() -> None:
    from floodlens_ml.terrain import fill_depressions_priority_flood

    # 3x3 depression bowl: border is 20m, center is 10m
    bowl = np.full((3, 3), 20.0, dtype=float)
    bowl[1, 1] = 10.0

    filled = fill_depressions_priority_flood(bowl)
    assert filled[1, 1] == 20.0
    assert np.allclose(filled, 20.0)


def test_compute_d8_flow_accumulation() -> None:
    from floodlens_ml.terrain import compute_d8_flow_accumulation

    # Simple 3x3 slope from top-left (30m) to bottom-right (10m)
    inclined = np.array(
        [
            [30.0, 25.0, 20.0],
            [25.0, 20.0, 15.0],
            [20.0, 15.0, 10.0],
        ],
        dtype=float,
    )
    downstream, acc = compute_d8_flow_accumulation(inclined, dy_m=30.0, dx_m=30.0)
    assert acc.shape == (3, 3)
    # Outlet cell at bottom-right receives upstream flow
    assert acc[2, 2] > 1.0
    # Top-left cell is a ridge / headwater with accumulation = 1.0
    assert acc[0, 0] == 1.0


def test_extract_pilot_terrain_features_real_dem() -> None:
    from floodlens_ml.terrain import extract_pilot_terrain_features

    dem_path = Path("ml-model/data/raw/copernicus_dem_uttar_pradesh.tif")
    if not dem_path.is_file():
        pytest.skip("Copernicus DEM file not present")

    res = extract_pilot_terrain_features(
        dem_path=dem_path,
        target_lat=26.8467,
        target_lon=80.9462,
        radius_m=100.0,
        catchment_half_cells=50,
    )
    assert res["elevation_m"] > 100.0
    assert res["slope_deg"] >= 0.0
    assert res["local_relief_m"] >= 0.0
    assert res["flow_accumulation"] >= 1.0
    assert res["mean_cell_size_m"] > 25.0
