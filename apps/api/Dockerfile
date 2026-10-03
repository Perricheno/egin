FROM python:3.12-slim AS dependencies
WORKDIR /deps
COPY apps/api/requirements.lock ./requirements.lock
COPY .wheelhouse /wheelhouse
RUN python -m venv /opt/venv && if ls /wheelhouse/*.whl >/dev/null 2>&1; then /opt/venv/bin/pip install --no-index --find-links=/wheelhouse -r requirements.lock; else /opt/venv/bin/pip install --timeout 90 --retries 8 -r requirements.lock; fi

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/opt/venv/bin:$PATH"
COPY --from=dependencies /opt/venv /opt/venv
WORKDIR /workspace/apps/api
COPY apps/api ./
COPY scripts /workspace/scripts
COPY packages /workspace/packages
RUN apt-get update && apt-get install -y --no-install-recommends libexpat1 && rm -rf /var/lib/apt/lists/*
EXPOSE 8000
