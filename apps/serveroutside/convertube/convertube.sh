#!/bin/bash
set -e
cd "$(dirname "$0")"

missing=""

if ! command -v python3 &> /dev/null; then
    missing="$missing python3"
fi

if ! command -v ffmpeg &> /dev/null; then
    missing="$missing ffmpeg"
fi

if [ -n "$missing" ]; then
    echo "Missing required tools:$missing"
    echo ""
    if command -v brew &> /dev/null; then
        echo "Install with:  brew install$missing"
    elif command -v apt &> /dev/null; then
        echo "Install with:  sudo apt install$missing"
    else
        echo "Please install:$missing"
    fi
    exit 1
fi

if [ ! -d "venv" ]; then
    echo "Setting up virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
python -m pip install --disable-pip-version-check -U pip
python -m pip install --disable-pip-version-check -r requirements.txt

PORT="${PORT:-8899}"
export PORT

echo ""
echo "  Convertube is running at http://localhost:$PORT"
echo ""
python3 app.py
