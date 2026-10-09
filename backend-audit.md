# Backend audit

**Checked:** 2026-10-09  
**Status:** Minimal FastAPI scaffold. No flood-risk service or external
integration is implemented.

## Current state

The backend lives in `backend/`. It has an environment-backed settings model,
a health endpoint, Pydantic response/error schemas, service-layer health logic,
and centralized exception handlers. The only route is `GET /api/health`.

There is no flood scoring, route comparison, dataset retrieval, storage layer,
database, or API integration with the frontend or ML package. Although boto3
and moto are declared dependencies, there is no AWS code or S3 test. No
`.env` file is present; `.env.example` contains local defaults.

## File inventory

| File | Current contents and purpose |
| --- | --- |
| `backend/requirements.txt` | Pinned versions of FastAPI, Pydantic v2, pydantic-settings, python-dotenv, Uvicorn, httpx, boto3, moto S3 extras, pytest, and Ruff. |
| `backend/.env.example` | Example values for `APP_NAME`, `APP_ENV`, and `LOG_LEVEL`; contains no credentials. |
| `backend/.gitignore` | Excludes local `.env`, virtual environments, Python bytecode/caches, and build artifacts. |
| `backend/pyproject.toml` | Pytest test path and Ruff Python 3.11 target, 88-character line length, and E/F/I lint rules. |
| `backend/README.md` | Setup and run instructions, health path, error-state names, and explicit note that risk logic and AWS integration are not implemented. |
| `backend/app/__init__.py` | Marks the app package. |
| `backend/app/main.py` | FastAPI app factory; mounts the health router; handles service errors, request validation errors, HTTP errors, and unexpected errors; returns typed generic error payloads and logs internal details server-side. |
| `backend/app/core/__init__.py` | Marks the core package. |
| `backend/app/core/config.py` | Pydantic Settings configuration sourced from environment/`.env`, with cached settings accessor and defaults for app name/environment/log level. |
| `backend/app/api/__init__.py` | Marks the API package. |
| `backend/app/api/routes/__init__.py` | Marks the route package. |
| `backend/app/api/routes/health.py` | Thin `/health` router; delegates response construction to the service and specifies a response model. |
| `backend/app/schemas/__init__.py` | Marks the schema package. |
| `backend/app/schemas/health.py` | Strict health response schema with literal `ok` status, service name, and environment. |
| `backend/app/schemas/errors.py` | Enumerates `invalid_input`, `outside_coverage`, `insufficient_data`, `data_unavailable`, and `internal_error`; defines a strict typed error response. |
| `backend/app/services/__init__.py` | Marks the service package. |
| `backend/app/services/health.py` | Health response construction from settings. |
| `backend/app/services/errors.py` | Typed service error and default HTTP mappings for all five states. |
| `backend/tests/test_health.py` | Tests typed health response, stable unknown-route error response, and generic handling without exception-detail leakage. |
| `backend/tests/test_service_errors.py` | Parametrized tests of service-state HTTP mappings and service error fields. |

## Error-state behavior

All five state names exist in schemas and the service mapping. The current
health-only API has no domain operation that emits `outside_coverage`,
`insufficient_data`, or `data_unavailable`; their definitions are scaffolding,
not evidence of implemented flood-data behavior. Generic 4xx HTTP errors are
currently represented as `invalid_input`; 503 maps to `data_unavailable`; other
5xx errors map to `internal_error`.

Error responses omit stack traces. Unexpected exceptions are logged and return
the generic message **“An internal error occurred.”**

## Validation observed

Commands run from `backend/`:

```text
pytest -q
8 passed, 7 warnings in 1.51s

ruff check .
All checks passed!
```

The tests ran using the available Python 3.14 environment rather than the
documented target Python 3.11. The warnings are deprecations emitted by the
installed Starlette/FastAPI stack; they are not test failures.

## Missing work

- Add typed request/response schemas and service logic when specific backend
  features and data contracts are agreed.
- Implement state-specific behavior for real data and coverage operations.
- Add integration tests for any future dependencies or services.
- AWS is not integrated or tested; package presence alone is not an integration
  claim.
- No endpoint currently consumes or serves the ML model or frontend data.

