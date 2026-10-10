"""Router for candidate monitoring zones."""

from fastapi import APIRouter

from app.schemas.zones import ZonesResponse
from app.services.zones import list_candidate_zones

router = APIRouter(prefix="/zones", tags=["zones"])


@router.get("", response_model=ZonesResponse)
def get_zones() -> ZonesResponse:
    """Return all ten candidate monitoring zones."""
    zones = list_candidate_zones()
    return ZonesResponse(zones=zones, total=len(zones))
