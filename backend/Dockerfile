# FloodLens Backend Production Dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies if required for rasterio/geospatial libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt /app/backend-requirements.txt
COPY ml-model/requirements.txt /app/ml-requirements.txt
RUN pip install --no-cache-dir -r /app/backend-requirements.txt -r /app/ml-requirements.txt

# Copy ML model package and install it
COPY ml-model /app/ml-model
RUN pip install --no-cache-dir -e /app/ml-model

# Copy Backend application
COPY backend /app/backend

WORKDIR /app/backend

ENV PYTHONUNBUFFERED=1
ENV APP_ENV=production
ENV LOG_LEVEL=INFO
ENV MODEL_CONFIG_PATH=/app/ml-model/config.yaml

EXPOSE 8000

# Health check using FastAPI /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
