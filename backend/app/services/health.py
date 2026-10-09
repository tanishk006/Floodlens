"""Health service."""

from app.core.config import Settings
from app.schemas.health import HealthResponse


def get_health(settings: Settings) -> HealthResponse:
    """Build a health response without exposing host or runtime details."""
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
    )
