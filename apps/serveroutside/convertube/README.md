# Convertube

A self-hosted video and audio downloader for CafeToolbox. Paste links from YouTube, TikTok, Instagram, Twitter/X, and 1000+ other sites, then download as MP4 or MP3.

![Python](https://img.shields.io/badge/python-3.8+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

[Preview video](https://github.com/user-attachments/assets/419d3e50-c933-444b-8cab-a9724986ba05)

![Convertube MP3 Mode](assets/preview-mp3.png)

## Features

- Download videos from 1000+ supported sites (via [yt-dlp](https://github.com/yt-dlp/yt-dlp))
- MP4 video or MP3 audio extraction
- Quality/resolution picker
- Bulk downloads — paste multiple URLs at once
- Automatic URL deduplication
- Clean, responsive UI — no frameworks, no build step
- Single Python file backend (~150 lines)

## Quick Start

```bash
brew install yt-dlp ffmpeg    # or apt install ffmpeg && pip install yt-dlp
cd apps/serveroutside/convertube
./convertube.sh
```

Open [http://localhost:25914](http://localhost:25914) for local/panel testing.

Or run from workspace root:

```bash
pnpm convertube:dev
```

For hosting bootstrap (auto install python deps + optional ffmpeg install):

```bash
cd apps/serveroutside/convertube
./bootstrap-and-run.sh
```

Or with Docker:

```bash
docker build -t convertube . && docker run -p 8899:8899 convertube
```

## Production Hosting

Convertube is suitable as an external tool service in CafeToolbox.

### Required runtime tools

- Python 3.10+
- ffmpeg
- yt-dlp

### Environment variables

```env
HOST=0.0.0.0
PORT=8899

# Runtime hardening
MAX_CONCURRENT_JOBS=2
MAX_QUEUE_SIZE=50
JOB_TTL_SECONDS=3600
DOWNLOAD_FILE_TTL_SECONDS=3600
DOWNLOAD_TIMEOUT_SECONDS=300
MAX_JOBS_MEMORY=200
ENABLE_BACKGROUND_CLEANUP=true
BACKGROUND_CLEANUP_INTERVAL_SECONDS=600
# Optional daily cleanup trigger by UTC hour (0-23), -1 to disable.
CLEANUP_DAILY_HOUR_UTC=-1

# Optional metadata
CONVERTUBE_VERSION=0.1.0

# Auto-install missing Python deps (yt-dlp module) on startup
CONVERTUBE_AUTO_INSTALL_PY_DEPS=true

# Optional yt-dlp binary override
YTDLP_BIN=

# Used by bootstrap script to auto-install ffmpeg (if host allows apt/apk)
CONVERTUBE_AUTO_INSTALL_SYSTEM_DEPS=false

# Must match dashboard secret for launch token signing
DASHBOARD_TOOL_SHARED_SECRET=change-me
ACCESS_COOKIE_TTL_SECONDS=43200

# Public URLs for hosted deployment
# CNAME / public URL (primary)
CONVERTUBE_PUBLIC_BASE_URL=http://convertube.cafetoolbox.app:25914
CONVERTUBE_HEALTH_URL=http://convertube.cafetoolbox.app:25914/health

# Origin / direct host URL (fallback)
CONVERTUBE_ORIGIN_BASE_URL=http://mbasic7.pikamc.vn:25914
CONVERTUBE_ORIGIN_HEALTH_URL=http://mbasic7.pikamc.vn:25914/health

# Optional comma-separated aliases
CONVERTUBE_PUBLIC_BASE_URL_ALIASES=http://mbasic7.pikamc.vn:25914
```

### Health endpoints (for dashboard/status integration)

- `GET /health`
- `GET /status`
- `GET /meta`

`/health` and `/meta` include dependency status (`yt_dlp_ready`, `ffmpeg_ready`) to help diagnostics.

If `ffmpeg` is missing on low-cost hosting:
- MP4 download still works via single-stream fallback (`best[ext=mp4]/best`).
- MP3 extraction returns clear error (`ffmpeg is required for MP3 extraction`).

### Queue behavior

- Convertube can run one download at a time with queueing.
- Set `MAX_CONCURRENT_JOBS=1` to force strict single-processing mode.
- New requests are accepted into queue until `MAX_QUEUE_SIZE` is reached.
- When queue is full, API returns `429 Queue is full`.

### Dashboard-gated access (internal use)

- Convertube can be configured to only accept requests launched from dashboard.
- Dashboard signs a short-lived access token and redirects user to Convertube.
- Convertube validates token, sets internal cookie session, and blocks direct anonymous access.
- The deployed public URL is controlled by `CONVERTUBE_PUBLIC_BASE_URL` and `CONVERTUBE_HEALTH_URL`.
- You can publish both CNAME + origin host using:
  - `CONVERTUBE_ORIGIN_BASE_URL`
  - `CONVERTUBE_ORIGIN_HEALTH_URL`
  - `CONVERTUBE_PUBLIC_BASE_URL_ALIASES`
- `/meta` now returns both `public_base_url` (primary) and `public_base_urls` (all known aliases).

### Docker (recommended)

```bash
docker build -t convertube .
docker run -d --name convertube \
  -p 8899:8899 \
  -e MAX_CONCURRENT_JOBS=2 \
  -e MAX_QUEUE_SIZE=50 \
  -e JOB_TTL_SECONDS=3600 \
  -e DOWNLOAD_TIMEOUT_SECONDS=300 \
  -v convertube_downloads:/app/downloads \
  --restart unless-stopped \
  convertube
```

### Reverse proxy notes

- Put Nginx/Caddy/Traefik in front of Convertube.
- Enforce HTTPS at proxy layer.
- Set request body/timeouts high enough for long media fetch operations.

### Suggested hosting specs

- Small usage (1-2 concurrent downloads): 1 vCPU, 2 GB RAM, 20-30 GB SSD.
- Medium usage (3-5 concurrent downloads): 2 vCPU, 4 GB RAM, 60-100 GB SSD.
- Heavy usage (6-10 concurrent downloads): 4 vCPU, 8 GB RAM, 150-250 GB SSD.

If you enforce one-at-a-time downloads (`MAX_CONCURRENT_JOBS=1`), the small tier above is sufficient for most private usage.

Disk sizing rule of thumb:

- Reserve at least 10x your average single-file size as temporary buffer.
- Example: if average file is 300 MB, keep 3-5 GB free buffer minimum at all times.

## Usage

1. Paste one or more video URLs into the input box
2. Choose **MP4** (video) or **MP3** (audio)
3. Click **Fetch** to load video info and thumbnails
4. Select quality/resolution if available
5. Click **Download** on individual videos, or **Download All**

## Supported Sites

Anything [yt-dlp supports](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md), including:

YouTube, TikTok, Instagram, Twitter/X, Reddit, Facebook, Vimeo, Twitch, Dailymotion, SoundCloud, Loom, Streamable, Pinterest, Tumblr, Threads, LinkedIn, and many more.

## Stack

- **Backend:** Python + Flask
- **Frontend:** Vanilla HTML/CSS/JS (single file, no build step)
- **Download engine:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [ffmpeg](https://ffmpeg.org/)
- **Dependencies:** 2 (Flask, yt-dlp)

## Disclaimer

This tool is intended for personal use only. Please respect copyright laws and the terms of service of the platforms you download from. The developers are not responsible for any misuse of this tool.

## License

[MIT](LICENSE)
