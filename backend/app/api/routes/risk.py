"""Router for flood risk estimation."""

from fastapi import APIRouter, Depends
from floodlens_ml.schemas import RiskScoreResult

from app.core.config import Settings, get_settings
from app.schemas.risk import RiskEstimateRequest
from app.services.risk import estimate_risk_for_zone

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/estimate", response_model=RiskScoreResult)
def estimate_risk(
    request: RiskEstimateRequest,
    settings: Settings = Depends(get_settings),
) -> RiskScoreResult:
    """Estimate relative flood susceptibility for a candidate zone."""
    return estimate_risk_for_zone(request, settings)
