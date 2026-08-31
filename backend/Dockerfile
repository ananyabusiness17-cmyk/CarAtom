# syntax=docker/dockerfile:1
# Build context: repository root
FROM python:3.12.8-slim-bookworm

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_NO_CACHE=1

COPY --from=ghcr.io/astral-sh/uv:0.6.14 /uv /usr/local/bin/uv
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./

RUN uv sync --frozen --no-dev \
    && groupadd --gid 10001 caratom \
    && useradd --uid 10001 --gid caratom --home-dir /app --no-create-home caratom \
    && chown -R caratom:caratom /app

USER caratom
ENV PORT=8000
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
