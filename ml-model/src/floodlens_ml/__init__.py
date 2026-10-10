"""FloodLens geospatial risk estimation and modeling package."""

from floodlens_ml.config import FloodlensConfig, load_config
from floodlens_ml.export import (
    build_candidate_zones_export_bundle,
    write_export_artifacts,
)
from floodlens_ml.io import (
    create_synthetic_test_features,
    get_candidate_monitoring_zones,
    validate_pipeline_prerequisites,
)
from floodlens_ml.predict import (
    evaluate_candidate_zone,
    predict_all_scenarios,
    predict_risk,
)
from floodlens_ml.schemas import (
    CandidateZone,
    FactorContribution,
    FeatureInput,
    RiskScoreResult,
    ScenarioInfo,
    ZoneExportBundle,
)
from floodlens_ml.scoring import calculate_risk_score

__version__ = "0.1.0"

__all__ = [
    "CandidateZone",
    "FactorContribution",
    "FeatureInput",
    "FloodlensConfig",
    "RiskScoreResult",
    "ScenarioInfo",
    "ZoneExportBundle",
    "__version__",
    "build_candidate_zones_export_bundle",
    "calculate_risk_score",
    "create_synthetic_test_features",
    "evaluate_candidate_zone",
    "get_candidate_monitoring_zones",
    "load_config",
    "predict_all_scenarios",
    "predict_risk",
    "validate_pipeline_prerequisites",
    "write_export_artifacts",
]
