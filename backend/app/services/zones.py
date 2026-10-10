"""Service layer for candidate monitoring zones."""

from floodlens_ml.io import get_candidate_monitoring_zones
from floodlens_ml.schemas import CandidateZone


def list_candidate_zones() -> list[CandidateZone]:
    """Retrieve all candidate monitoring zones from the model catalog."""
    return get_candidate_monitoring_zones()


def find_candidate_zone_by_id(zone_id: str) -> CandidateZone | None:
    """Find a candidate monitoring zone by its stable identifier."""
    for zone in list_candidate_zones():
        if zone.id == zone_id:
            return zone
    return None
