"""Command-line entry point for the FloodLens risk scoring pipeline."""

import argparse
import logging
import sys
from pathlib import Path

from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from floodlens_ml.config import load_config
from floodlens_ml.export import write_export_artifacts
from floodlens_ml.io import validate_pipeline_prerequisites

LOGGER = logging.getLogger("floodlens_ml")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the FloodLens terrain and flood-susceptibility pipeline."
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "config.yaml",
        help="Path to pipeline YAML configuration.",
    )
    parser.add_argument(
        "--export",
        action="store_true",
        help="Export candidate monitoring zones and GeoJSON artifacts.",
    )
    parser.add_argument(
        "--synthetic-demo",
        action="store_true",
        help="Run pipeline against illustrative synthetic fixtures for testing.",
    )
    return parser


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    args = build_parser().parse_args()

    try:
        config = load_config(args.config)
    except (OSError, ValueError, ValidationError) as error:
        LOGGER.error("Could not load configuration: %s", error)
        return 2

    repo_root = Path(args.config).resolve().parent
    validation = validate_pipeline_prerequisites(config, base_dir=repo_root)

    if args.export:
        LOGGER.info(
            "Exporting candidate monitoring zones data contract to %s...",
            config.paths.output,
        )
        out_paths = write_export_artifacts(
            config, output_dir=repo_root / config.paths.output
        )
        LOGGER.info("Export completed successfully:")
        for name, path in out_paths.items():
            LOGGER.info("  - %s: %s", name, path)
        return 0

    if args.synthetic_demo:
        LOGGER.info(
            "Running synthetic demo benchmark against illustrative test fixtures..."
        )
        out_paths = write_export_artifacts(
            config, output_dir=repo_root / config.paths.output
        )
        LOGGER.info(
            "Synthetic demo artifacts written to %s",
            repo_root / config.paths.output,
        )
        return 0

    if validation.missing_prerequisites:
        LOGGER.error(
            "Pipeline cannot run because the following prerequisites are missing:"
        )
        for missing in validation.missing_prerequisites:
            LOGGER.error("  - %s", missing)
        LOGGER.error(
            "Before real geographic processing can begin, configure a target locality, "
            "EPSG:4326 bbox, projected metric CRS, and supply a documented DEM GeoTIFF."
        )
        return 2

    LOGGER.info(
        "All prerequisites satisfied for locality '%s'. Executing pipeline...",
        config.area_of_interest.locality,
    )
    write_export_artifacts(config, output_dir=repo_root / config.paths.output)
    LOGGER.info("Pipeline executed successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
