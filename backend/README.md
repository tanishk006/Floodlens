# FloodLens backend

Minimal FastAPI scaffold. It includes environment-backed settings, typed health
response and error schemas, centralized API error handling, and no flood-risk
business logic or external data integrations yet.

## Setup

Requires Python 3.11. From this directory:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The health endpoint is `GET /api/health`. Error responses use one of the
explicit states: `invalid_input`, `outside_coverage`, `insufficient_data`,
`data_unavailable`, or `internal_error`. Internal failures return a generic
message; details are logged server-side.

Run tests and lint from this directory:

```bash
pytest
ruff check .
```

No AWS integration, database, route analysis, or flood-risk score is currently
implemented.
