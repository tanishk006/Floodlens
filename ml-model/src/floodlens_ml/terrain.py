"""Terrain analysis and DEM processing routines for FloodLens.

Extracts slope, local relief, and elevation features from raster DEMs when
available. If no documented DEM exists at the configured path, raises clear,
explicit exceptions rather than synthesizing false geographic measurements.
"""

from pathlib import Path
from typing import Any

import numpy as np

from floodlens_ml.config import TerrainConfig


def check_dem_availability(dem_path: Path | str) -> tuple[bool, str]:
    """Verify whether a real DEM file is present on disk at the configured path.

    Returns:
        (is_available, diagnostic_message)
    """
    path = Path(dem_path)
    if not path.exists():
        return (
            False,
            f"DEM file not found at '{path}'. A documented GeoTIFF DEM is "
            "required before terrain processing can run.",
        )
    if path.stat().st_size == 0:
        return (
            False,
            f"DEM file at '{path}' is empty (0 bytes). Valid raster data required.",
        )
    return True, f"DEM file found at '{path}'."


def compute_slope_degrees(
    elevation_grid: np.ndarray, cell_size_m: float
) -> np.ndarray:
    """Compute slope in degrees from a 2D elevation grid using finite differences.

    Args:
        elevation_grid: 2D numpy array of elevation values in meters.
        cell_size_m: Spatial resolution of grid cells in meters (must be > 0).

    Returns:
        2D numpy array of surface slope in degrees, bounded in [0.0, 90.0].
    """
    if cell_size_m <= 0:
        raise ValueError("cell_size_m must be strictly positive")
    if elevation_grid.ndim != 2:
        raise ValueError("elevation_grid must be a 2D array")

    # Compute spatial gradients dz/dy and dz/dx
    gy, gx = np.gradient(elevation_grid, cell_size_m)
    gradient_magnitude = np.sqrt(gx**2 + gy**2)
    slope_rad = np.arctan(gradient_magnitude)
    slope_deg = np.degrees(slope_rad)
    return np.clip(slope_deg, 0.0, 90.0)


def compute_local_relief(
    elevation_grid: np.ndarray,
    cell_size_m: float,
    radius_m: float,
) -> np.ndarray:
    """Compute local relief (max - min) within a spatial neighborhood radius.

    Args:
        elevation_grid: 2D numpy array of elevation values in meters.
        cell_size_m: Cell size in meters.
        radius_m: Neighborhood radius in meters.

    Returns:
        2D numpy array of local relief in meters.
    """
    if radius_m <= 0 or cell_size_m <= 0:
        raise ValueError("radius_m and cell_size_m must be strictly positive")

    window_cells = max(1, int(round(radius_m / cell_size_m)))
    rows, cols = elevation_grid.shape
    relief_grid = np.zeros_like(elevation_grid, dtype=float)

    for r in range(rows):
        r_min = max(0, r - window_cells)
        r_max = min(rows, r + window_cells + 1)
        for c in range(cols):
            c_min = max(0, c - window_cells)
            c_max = min(cols, c + window_cells + 1)
            window = elevation_grid[r_min:r_max, c_min:c_max]
            relief_grid[r, c] = float(np.max(window) - np.min(window))

    return relief_grid


def process_terrain_grid(
    elevation_grid: np.ndarray,
    cell_size_m: float,
    terrain_cfg: TerrainConfig,
) -> dict[str, Any]:
    """Derive terrain indicator layers from an in-memory elevation grid.

    Used when a validated DEM raster array is loaded.
    """
    slope_grid = compute_slope_degrees(elevation_grid, cell_size_m)
    relief_grid = compute_local_relief(
        elevation_grid, cell_size_m, terrain_cfg.local_relief_radius_m
    )

    return {
        "elevation_mean": float(np.mean(elevation_grid)),
        "elevation_min": float(np.min(elevation_grid)),
        "elevation_max": float(np.max(elevation_grid)),
        "slope_mean": float(np.mean(slope_grid)),
        "local_relief_mean": float(np.mean(relief_grid)),
        "cell_size_m": cell_size_m,
        "grid_shape": elevation_grid.shape,
    }
