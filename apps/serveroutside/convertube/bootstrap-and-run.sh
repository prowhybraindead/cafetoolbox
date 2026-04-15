#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "[convertube] python3 is required."
  exit 1
fi

AUTO_INSTALL_SYSTEM_DEPS="${CONVERTUBE_AUTO_INSTALL_SYSTEM_DEPS:-false}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  if [ "$AUTO_INSTALL_SYSTEM_DEPS" = "true" ]; then
    if command -v apt-get >/dev/null 2>&1; then
      echo "[convertube] ffmpeg not found, installing via apt-get..."
      apt-get update && apt-get install -y --no-install-recommends ffmpeg
    elif command -v apk >/dev/null 2>&1; then
      echo "[convertube] ffmpeg not found, installing via apk..."
      apk add --no-cache ffmpeg
    else
      echo "[convertube] ffmpeg missing and no supported package manager found."
      exit 1
    fi
  else
    echo "[convertube] ffmpeg is missing. Set CONVERTUBE_AUTO_INSTALL_SYSTEM_DEPS=true to auto-install (if host supports)."
    exit 1
  fi
fi

if [ ! -d "venv" ]; then
  echo "[convertube] creating venv..."
  python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate

echo "[convertube] installing/updating python requirements..."
python -m pip install --disable-pip-version-check -U pip
python -m pip install --disable-pip-version-check -r requirements.txt

echo "[convertube] starting app..."
exec python app.py
