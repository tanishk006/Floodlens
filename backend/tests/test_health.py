from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def test_health_response_uses_typed_schema() -> None:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        app_name="FloodLens test API",
        app_env="test",
        log_level="ERROR",
    )
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "FloodLens test API",
        "environment": "test",
    }


def test_unknown_route_uses_stable_error_schema() -> None:
    client = TestClient(create_app())

    response = client.get("/not-a-route")

    assert response.status_code == 404
    assert response.json() == {
        "status": "invalid_input",
        "message": "The requested resource was not found.",
    }


def test_unhandled_error_does_not_leak_exception_details() -> None:
    app = create_app()

    @app.get("/test-error")
    def raise_unexpected_error() -> None:
        raise RuntimeError("synthetic secret detail")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/test-error")

    assert response.status_code == 500
    assert response.json() == {
        "status": "internal_error",
        "message": "An internal error occurred.",
    }
    assert "synthetic secret detail" not in response.text
