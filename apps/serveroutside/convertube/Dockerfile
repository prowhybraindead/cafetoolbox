FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -m -u 10001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8899
ENV HOST=0.0.0.0
ENV PORT=8899
ENV MAX_CONCURRENT_JOBS=1
ENV MAX_QUEUE_SIZE=50
ENV JOB_TTL_SECONDS=3600
ENV DOWNLOAD_TIMEOUT_SECONDS=300
ENV PYTHONUNBUFFERED=1

CMD ["sh", "-c", "gunicorn -w 1 -k gthread --threads 8 -b 0.0.0.0:${PORT:-8899} app:app"]
