"""Validated configuration loading for the FloodLens ML pipeline."""

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AreaOfInterestConfig(StrictModel):
    locality: str = Field(min_length=1)
    bbox: tuple[float, float, float, float] | None = None
    metric_crs: str | None = None

    @model_validator(mode="after")
    def validate_bbox(self) -> "AreaOfInterestConfig":
        if self.bbox is None:
            return self

        west, south, east, north = self.bbox
        if not (-180 <= west < east <= 180):
            raise ValueError(
                "bbox longitude bounds must satisfy -180 <= west < east <= 180"
            )
        if not (-90 <= south < north <= 90):
            raise ValueError(
                "bbox latitude bounds must satisfy -90 <= south < north <= 90"
            )
        return self

    def missing_setup(self) -> list[str]:
        missing: list[str] = []
        if self.locality == "[LOCALITY]":
            missing.append("area_of_interest.locality")
        if self.bbox is None:
            missing.append("area_of_interest.bbox")
        if not self.metric_crs:
            missing.append("area_of_interest.metric_crs")
        return missing


class PathsConfig(StrictModel):
    dem: str
    labels: str
    roads: str
    processed: str
    output: str
    artifacts: str


class ThresholdsConfig(StrictModel):
    low_max: float = Field(ge=0, le=100)
    moderate_max: float = Field(ge=0, le=100)
    high_max: float = Field(ge=0, le=100)
    min_positive_samples: int = Field(ge=1)
    min_negative_samples: int = Field(ge=1)

    @model_validator(mode="after")
    def validate_order(self) -> "ThresholdsConfig":
        if not self.low_max < self.moderate_max < self.high_max:
            raise ValueError("score thresholds must be strictly increasing")
        return self


class ScoringConfig(StrictModel):
    weights: dict[
        Literal[
            "low_elevation",
            "local_relief",
            "slope",
            "flow_accumulation",
            "rainfall",
        ],
        float,
    ]
    normalization: dict[
        Literal[
            "low_elevation",
            "local_relief",
            "slope",
            "flow_accumulation",
            "rainfall",
        ],
        tuple[float, float],
    ]

    @model_validator(mode="after")
    def validate_factors(self) -> "ScoringConfig":
        factors = {
            "low_elevation",
            "local_relief",
            "slope",
            "flow_accumulation",
            "rainfall",
        }
        if set(self.weights) != factors or set(self.normalization) != factors:
            raise ValueError(
                "weights and normalization must define all five baseline factors"
            )
        if any(weight < 0 for weight in self.weights.values()):
            raise ValueError("factor weights cannot be negative")
        if abs(sum(self.weights.values()) - 1.0) > 1e-9:
            raise ValueError("factor weights must sum to 1")
        for name, (minimum, maximum) in self.normalization.items():
            if minimum >= maximum:
                raise ValueError(f"normalization bounds for {name} must be increasing")
        return self


class TerrainConfig(StrictModel):
    local_relief_radius_m: float = Field(gt=0)
    sink_depth_m: float = Field(gt=0)
    simplify_tolerance_m: float = Field(ge=0)


class ScenarioConfig(StrictModel):
    id: Literal["light", "moderate", "heavy", "extreme"]
    label: str = Field(min_length=1)
    mm_per_hr: float = Field(gt=0)
    assumption: str = Field(min_length=1)


class InundationConfig(StrictModel):
    mode: Literal["fixed_levels", "volume_balance"]
    fixed_water_levels_m: dict[str, float] | None
    runoff_coefficient: float = Field(ge=0, le=1)
    max_water_depth_m: float = Field(gt=0)


class TrainingConfig(StrictModel):
    random_seed: int
    spatial_block_size_m: float = Field(gt=0)
    allow_baseline_fallback: bool


class FloodlensConfig(StrictModel):
    area_of_interest: AreaOfInterestConfig
    paths: PathsConfig
    thresholds: ThresholdsConfig
    scoring: ScoringConfig
    terrain: TerrainConfig
    scenarios: list[ScenarioConfig]
    inundation: InundationConfig
    training: TrainingConfig

    @model_validator(mode="after")
    def validate_scenarios(self) -> "FloodlensConfig":
        expected_ids = ["light", "moderate", "heavy", "extreme"]
        ids = [scenario.id for scenario in self.scenarios]
        if ids != expected_ids:
            raise ValueError(f"scenarios must be ordered as {expected_ids}")
        rates = [scenario.mm_per_hr for scenario in self.scenarios]
        if rates != [7.5, 35.0, 65.0, 115.0]:
            raise ValueError("scenario rates must be 7.5, 35, 65, and 115 mm/hr")
        return self

    def setup_gaps(self) -> list[str]:
        return self.area_of_interest.missing_setup()


def load_config(path: str | Path) -> FloodlensConfig:
    """Load YAML and validate it against the strict pipeline configuration."""
    config_path = Path(path)
    try:
        with config_path.open(encoding="utf-8") as stream:
            raw_config = yaml.safe_load(stream)
    except yaml.YAMLError as error:
        raise ValueError(f"Invalid YAML in {config_path}: {error}") from error

    if not isinstance(raw_config, dict):
        raise ValueError(f"Configuration in {config_path} must be a YAML mapping.")

    return FloodlensConfig.model_validate(raw_config)
