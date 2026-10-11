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


def compute_slope_degrees(elevation_grid: np.ndarray, cell_size_m: float) -> np.ndarray:
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


def fill_depressions_priority_flood(elevation_grid: np.ndarray) -> np.ndarray:
    """Condition DEM by filling pits using the Priority-Flood algorithm.

    Guarantees monotonic drainage toward DEM boundaries without artificial sinks.
    Algorithm based on Barnes, Lehman, Mulla (2014) / Wang & Liu (2006).

    Args:
        elevation_grid: 2D numpy array of elevation values in meters.

    Returns:
        2D numpy array with closed depressions filled to their pour points.
    """
    import heapq

    if elevation_grid.ndim != 2:
        raise ValueError("elevation_grid must be a 2D array")

    dem = elevation_grid.astype(np.float64, copy=True)
    rows, cols = dem.shape
    visited = np.zeros((rows, cols), dtype=bool)
    pq: list[tuple[float, int, int]] = []

    # Seed priority queue with all boundary cells (outlets)
    for r in range(rows):
        for c in (0, cols - 1):
            heapq.heappush(pq, (float(dem[r, c]), r, c))
            visited[r, c] = True
    for c in range(1, cols - 1):
        for r in (0, rows - 1):
            heapq.heappush(pq, (float(dem[r, c]), r, c))
            visited[r, c] = True

    offsets = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    while pq:
        z, r, c = heapq.heappop(pq)
        for dr, dc in offsets:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and not visited[nr, nc]:
                visited[nr, nc] = True
                if dem[nr, nc] < z:
                    dem[nr, nc] = z
                heapq.heappush(pq, (float(dem[nr, nc]), nr, nc))

    return dem


def compute_d8_flow_accumulation(
    conditioned_dem: np.ndarray,
    dy_m: float,
    dx_m: float,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute D8 flow directions and flow accumulation on a conditioned DEM.

    Uses steepest descent across 8 neighbors with true metric distance weighting.
    Accumulates contributing cell counts downstream in descending elevation order.

    Args:
        conditioned_dem: 2D numpy array of pit-filled elevations in meters.
        dy_m: North-south cell spacing in meters (> 0).
        dx_m: East-west cell spacing in meters (> 0).

    Returns:
        (downstream_directions, flow_accumulation_grid)
        where flow_accumulation_grid contains the upslope contributing
        cell count (>= 1.0).
    """
    if dy_m <= 0 or dx_m <= 0:
        raise ValueError("dy_m and dx_m must be strictly positive")
    if conditioned_dem.ndim != 2:
        raise ValueError("conditioned_dem must be a 2D array")

    rows, cols = conditioned_dem.shape
    offsets = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    dist = [float(np.hypot(dr * dy_m, dc * dx_m)) for dr, dc in offsets]

    # Resolve perfectly flat plateaus with a minor deterministic gradient
    plateau_epsilon = 1e-4
    resolved_dem = conditioned_dem - (
        np.arange(rows)[:, None] * plateau_epsilon
        + np.arange(cols)[None, :] * plateau_epsilon
    )

    downstream = np.full((rows, cols, 2), -1, dtype=np.int32)

    for r in range(rows):
        for c in range(cols):
            z_curr = resolved_dem[r, c]
            max_slope = 0.0
            best_target: tuple[int, int] | None = None
            for idx, (dr, dc) in enumerate(offsets):
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols:
                    drop = z_curr - resolved_dem[nr, nc]
                    if drop > 0:
                        slope = drop / dist[idx]
                        if slope > max_slope:
                            max_slope = slope
                            best_target = (nr, nc)
            if best_target is not None:
                downstream[r, c] = best_target

    acc = np.ones((rows, cols), dtype=np.float64)
    flat_indices = np.argsort(-resolved_dem.ravel())
    for idx in flat_indices:
        r, c = divmod(int(idx), cols)
        nr, nc = int(downstream[r, c, 0]), int(downstream[r, c, 1])
        if nr >= 0 and nc >= 0:
            acc[nr, nc] += acc[r, c]

    return downstream, acc


def extract_pilot_terrain_features(
    dem_path: Path | str,
    target_lat: float,
    target_lon: float,
    radius_m: float = 100.0,
    catchment_half_cells: int = 100,
) -> dict[str, Any]:
    """Extract terrain indicators at exact coordinates from a Copernicus GeoTIFF.

    Args:
        dem_path: Path to the Copernicus GLO-30 GeoTIFF raster.
        target_lat: Target latitude in decimal degrees.
        target_lon: Target longitude in decimal degrees.
        radius_m: Search radius for local relief in meters.
        catchment_half_cells: Half-width of catchment window for hydrological routing.

    Returns:
        Dictionary containing extracted features and raster provenance.
    """
    import tifffile

    path = Path(dem_path)
    if not path.is_file():
        raise FileNotFoundError(f"DEM raster not found at '{path}'")

    with tifffile.TiffFile(path) as tif:
        page = tif.pages[0]
        rows, cols = page.shape

        # Read GeoTIFF tiepoints and pixel scale
        tiepoint = page.tags["ModelTiepointTag"].value  # (i, j, k, x, y, z)
        pixel_scale = page.tags[
            "ModelPixelScaleTag"
        ].value  # (scale_x, scale_y, scale_z)

        origin_lon = float(tiepoint[3])
        origin_lat = float(tiepoint[4])
        scale_x = float(pixel_scale[0])
        scale_y = float(pixel_scale[1])

        # Geographic bounds
        min_lon = origin_lon
        max_lon = origin_lon + cols * scale_x
        max_lat = origin_lat
        min_lat = origin_lat - rows * scale_y

        if not (min_lon <= target_lon <= max_lon and min_lat <= target_lat <= max_lat):
            raise ValueError(
                f"Coordinates ({target_lon}, {target_lat}) fall outside raster bounds "
                f"[{min_lon}, {min_lat}, {max_lon}, {max_lat}]"
            )

        # Compute target pixel indices
        target_col = int(round((target_lon - origin_lon) / scale_x))
        target_row = int(round((origin_lat - target_lat) / scale_y))

        # Clamp indices safely
        target_col = min(max(target_col, 0), cols - 1)
        target_row = min(max(target_row, 0), rows - 1)

        full_raster = page.asarray()

    # Calculate metric grid spacing at latitude
    lat_rad = np.radians(target_lat)
    dy_m = scale_y * 111320.0
    dx_m = scale_x * 111320.0 * np.cos(lat_rad)
    mean_cell_size_m = float((dy_m + dx_m) / 2.0)

    # Sub-catchment window bounds
    r_min = max(0, target_row - catchment_half_cells)
    r_max = min(rows, target_row + catchment_half_cells + 1)
    c_min = max(0, target_col - catchment_half_cells)
    c_max = min(cols, target_col + catchment_half_cells + 1)

    subgrid = full_raster[r_min:r_max, c_min:c_max].astype(np.float64)
    center_sub_r = target_row - r_min
    center_sub_c = target_col - c_min

    # Condition DEM with Priority-Flood depression filling
    conditioned_subgrid = fill_depressions_priority_flood(subgrid)

    # Derive terrain features
    slope_grid = compute_slope_degrees(subgrid, mean_cell_size_m)
    relief_grid = compute_local_relief(subgrid, mean_cell_size_m, radius_m)
    _, flow_acc_grid = compute_d8_flow_accumulation(conditioned_subgrid, dy_m, dx_m)

    point_elevation = float(subgrid[center_sub_r, center_sub_c])
    point_slope = float(slope_grid[center_sub_r, center_sub_c])
    point_relief = float(relief_grid[center_sub_r, center_sub_c])
    point_flow_acc = float(flow_acc_grid[center_sub_r, center_sub_c])

    return {
        "elevation_m": round(point_elevation, 2),
        "slope_deg": round(point_slope, 2),
        "local_relief_m": round(point_relief, 2),
        "flow_accumulation": round(point_flow_acc, 2),
        "target_coordinates": [target_lon, target_lat],
        "pixel_row": target_row,
        "pixel_col": target_col,
        "mean_cell_size_m": round(mean_cell_size_m, 2),
        "dy_m": round(float(dy_m), 2),
        "dx_m": round(float(dx_m), 2),
        "raster_bounds": [min_lon, min_lat, max_lon, max_lat],
        "raster_shape": [rows, cols],
        "catchment_window_shape": list(subgrid.shape),
    }


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
