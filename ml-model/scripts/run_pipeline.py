"""Command-line entry point for the staged FloodLens processing pipeline."""

import argparse
import logging
import sys
from pathlib import Path

from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from floodlens_ml.config import load_config

LOGGER = logging.getLogger("floodlens_ml")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the FloodLens terrain and flood-exposure pipeline."
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "config.yaml",
        help="Path to pipeline YAML configuration.",
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

    gaps = config.setup_gaps()
    if gaps:
        LOGGER.error(
            "Configuration needs locality-specific setup before processing: %s",
            ", ".join(gaps),
        )
        return 2

    LOGGER.info(
        "Configuration for %s loaded. Pipeline stages are not implemented yet.",
        config.area_of_interest.locality,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
