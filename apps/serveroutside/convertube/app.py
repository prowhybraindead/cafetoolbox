import os
import uuid
import glob
import json
import subprocess
import threading
import time
import base64
import hmac
import hashlib
from collections import deque
from functools import wraps
from flask import Flask, request, jsonify, send_file, render_template, redirect, make_response


APP_DIR = os.path.dirname(__file__)


def load_env_defaults():
    # Load local env files for non-container runs while preserving real process env.
    for filename in (".env.local", ".env"):
        env_path = os.path.join(APP_DIR, filename)
        if not os.path.exists(env_path):
            continue

        with open(env_path, "r", encoding="utf-8") as fh:
            for raw_line in fh:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue

                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip()
                if not key:
                    continue

                if (value.startswith('"') and value.endswith('"')) or (
                    value.startswith("'") and value.endswith("'")
                ):
                    value = value[1:-1]

                os.environ.setdefault(key, value)


load_env_defaults()

app = Flask(__name__)
DOWNLOAD_DIR = os.path.join(APP_DIR, "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

jobs = {}
APP_NAME = "Convertube"
APP_SLUG = "convertube"
APP_VERSION = os.environ.get("CONVERTUBE_VERSION", "0.1.0")
PUBLIC_BASE_URL = os.environ.get("CONVERTUBE_PUBLIC_BASE_URL", "http://localhost:25914")
PUBLIC_HEALTH_URL = os.environ.get("CONVERTUBE_HEALTH_URL", f"{PUBLIC_BASE_URL.rstrip('/')}/health")
ORIGIN_BASE_URL = os.environ.get("CONVERTUBE_ORIGIN_BASE_URL", "").strip()
ORIGIN_HEALTH_URL = os.environ.get("CONVERTUBE_ORIGIN_HEALTH_URL", "").strip()
PUBLIC_BASE_URL_ALIASES = [
    item.strip()
    for item in os.environ.get("CONVERTUBE_PUBLIC_BASE_URL_ALIASES", "").split(",")
    if item.strip()
]
DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "").strip()
ACCESS_COOKIE_NAME = "ctb_tool_access"
ACCESS_COOKIE_TTL_SECONDS = int(os.environ.get("ACCESS_COOKIE_TTL_SECONDS", "43200"))
DOWNLOAD_TIMEOUT_SECONDS = int(os.environ.get("DOWNLOAD_TIMEOUT_SECONDS", "300"))
JOB_TTL_SECONDS = int(os.environ.get("JOB_TTL_SECONDS", "3600"))
MAX_CONCURRENT_JOBS = int(os.environ.get("MAX_CONCURRENT_JOBS", "1"))
MAX_QUEUE_SIZE = int(os.environ.get("MAX_QUEUE_SIZE", "50"))
MAX_JOBS_MEMORY = int(os.environ.get("MAX_JOBS_MEMORY", "200"))
jobs_lock = threading.Lock()
queue_condition = threading.Condition(jobs_lock)
job_queue = deque()


def dedupe_urls(urls):
    seen = set()
    result = []

    for value in urls:
        item = (value or "").strip()
        if not item or item in seen:
            continue
        seen.add(item)
        result.append(item)

    return result


def resolve_dashboard_url():
    if DASHBOARD_URL:
        return DASHBOARD_URL

    # Production-safe fallback for cafetoolbox subdomains.
    host = (request.host or "").split(":")[0].lower()
    if host.endswith(".cafetoolbox.app"):
        return "https://cafetoolbox.app"

    return "http://localhost:3000"


def now_ts():
    return int(time.time())


def base64url_decode(value):
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("utf-8"))


def verify_access_token(token):
    secret = os.environ.get("DASHBOARD_TOOL_SHARED_SECRET", "")
    if not secret or not token or "." not in token:
        return None

    payload_b64, sig_b64 = token.split(".", 1)
    expected_sig = hmac.new(secret.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()

    try:
        actual_sig = base64url_decode(sig_b64)
    except Exception:
        return None

    if not hmac.compare_digest(expected_sig, actual_sig):
        return None

    try:
        payload = json.loads(base64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        return None

    exp = int(payload.get("exp", 0) or 0)
    aud = payload.get("aud")
    tool = payload.get("tool")
    if exp <= now_ts():
        return None
    if aud != APP_SLUG or tool != APP_SLUG:
        return None

    return payload


def get_valid_claims():
    cookie_token = request.cookies.get(ACCESS_COOKIE_NAME)
    claims = verify_access_token(cookie_token)
    if claims:
        return claims

    access_token = request.args.get("access_token", "")
    claims = verify_access_token(access_token)
    
    # If token from query param is valid, set it as cookie for future requests
    if claims:
        response = make_response()
        response.set_cookie(
            ACCESS_COOKIE_NAME,
            access_token,
            max_age=ACCESS_COOKIE_TTL_SECONDS,
            httponly=True,
            secure=os.environ.get("CONVERTUBE_SECURE_COOKIE", "").lower() == "true",
            samesite="Lax"
        )
        # Store response in thread-local to apply later
        request._ctb_set_cookie = response
    
    return claims


def require_internal_access(api=False):
    def decorator(func):
        @wraps(func)
        def wrapped(*args, **kwargs):
            claims = get_valid_claims()
            if not claims:
                if api:
                    return jsonify({"error": "Unauthorized. Please launch from dashboard."}), 401
                # For page requests, redirect to dashboard login
                login_url = f"{resolve_dashboard_url().rstrip('/')}/login"
                return redirect(login_url)
            
            result = func(*args, **kwargs)
            
            # Apply cookie if it was set during token extraction
            if hasattr(request, '_ctb_set_cookie'):
                cookie_response = request._ctb_set_cookie
                if isinstance(result, tuple):
                    # If function returns tuple (response, status_code), we need to wrap it
                    response = make_response(result[0])
                    response.status_code = result[1] if len(result) > 1 else 200
                else:
                    response = make_response(result)
                
                # Copy cookie headers from prepared response
                for header, value in cookie_response.headers:
                    if header.lower() == 'set-cookie':
                        response.headers.add(header, value)
                return response
            
            return result

        return wrapped

    return decorator


def active_jobs_count():
    with jobs_lock:
        return sum(1 for job in jobs.values() if job.get("status") == "downloading")


def queue_position_of(job_id):
    with jobs_lock:
        for idx, queued_job_id in enumerate(job_queue):
            if queued_job_id == job_id:
                return idx + 1
    return None


def cleanup_jobs():
    ts = now_ts()
    remove_ids = []

    with jobs_lock:
        for job_id, job in jobs.items():
            expires_at = job.get("expires_at")
            if expires_at and expires_at <= ts:
                file_path = job.get("file")
                if file_path and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except OSError:
                        pass
                remove_ids.append(job_id)

        for job_id in remove_ids:
            jobs.pop(job_id, None)

        # Keep memory bounded even with long TTL.
        if len(jobs) > MAX_JOBS_MEMORY:
            ordered = sorted(jobs.items(), key=lambda item: item[1].get("updated_at", 0))
            trim_count = len(jobs) - MAX_JOBS_MEMORY
            for job_id, job in ordered[:trim_count]:
                file_path = job.get("file")
                if file_path and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except OSError:
                        pass
                jobs.pop(job_id, None)


def run_download(job_id):
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            return

        url = job.get("url", "")
        format_choice = job.get("format", "video")
        format_id = job.get("format_id")

    out_template = os.path.join(DOWNLOAD_DIR, f"{job_id}.%(ext)s")

    cmd = ["yt-dlp", "--no-playlist", "-o", out_template]

    if format_choice == "audio":
        cmd += ["-x", "--audio-format", "mp3"]
    elif format_id:
        cmd += ["-f", f"{format_id}+bestaudio/best", "--merge-output-format", "mp4"]
    else:
        cmd += ["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4"]

    cmd.append(url)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=DOWNLOAD_TIMEOUT_SECONDS)
        if result.returncode != 0:
            with jobs_lock:
                if job_id in jobs:
                    jobs[job_id]["status"] = "error"
                    jobs[job_id]["error"] = result.stderr.strip().split("\n")[-1]
                    jobs[job_id]["updated_at"] = now_ts()
                    jobs[job_id]["expires_at"] = now_ts() + JOB_TTL_SECONDS
            return

        files = glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}.*"))
        if not files:
            with jobs_lock:
                if job_id in jobs:
                    jobs[job_id]["status"] = "error"
                    jobs[job_id]["error"] = "Download completed but no file was found"
                    jobs[job_id]["updated_at"] = now_ts()
                    jobs[job_id]["expires_at"] = now_ts() + JOB_TTL_SECONDS
            return

        if format_choice == "audio":
            target = [f for f in files if f.endswith(".mp3")]
            chosen = target[0] if target else files[0]
        else:
            target = [f for f in files if f.endswith(".mp4")]
            chosen = target[0] if target else files[0]

        for f in files:
            if f != chosen:
                try:
                    os.remove(f)
                except OSError:
                    pass

        ext = os.path.splitext(chosen)[1]
        with jobs_lock:
            title = jobs.get(job_id, {}).get("title", "").strip()
        # Sanitize title for filename
        if title:
            safe_title = "".join(c for c in title if c not in r'\/:*?"<>|').strip()[:20].strip()
            filename = f"{safe_title}{ext}" if safe_title else os.path.basename(chosen)
        else:
            filename = os.path.basename(chosen)

        with jobs_lock:
            if job_id in jobs:
                jobs[job_id]["status"] = "done"
                jobs[job_id]["file"] = chosen
                jobs[job_id]["filename"] = filename
                jobs[job_id]["updated_at"] = now_ts()
                jobs[job_id]["expires_at"] = now_ts() + JOB_TTL_SECONDS
    except subprocess.TimeoutExpired:
        with jobs_lock:
            if job_id in jobs:
                jobs[job_id]["status"] = "error"
                jobs[job_id]["error"] = "Download timed out"
                jobs[job_id]["updated_at"] = now_ts()
                jobs[job_id]["expires_at"] = now_ts() + JOB_TTL_SECONDS
    except Exception as e:
        with jobs_lock:
            if job_id in jobs:
                jobs[job_id]["status"] = "error"
                jobs[job_id]["error"] = str(e)
                jobs[job_id]["updated_at"] = now_ts()
                jobs[job_id]["expires_at"] = now_ts() + JOB_TTL_SECONDS


def queue_worker_loop():
    while True:
        next_job_id = None
        with queue_condition:
            while not job_queue:
                queue_condition.wait()

            next_job_id = job_queue.popleft()
            job = jobs.get(next_job_id)
            if not job:
                continue

            job["status"] = "downloading"
            job["updated_at"] = now_ts()
            job["started_at"] = now_ts()

        run_download(next_job_id)


worker_threads = []
for _ in range(max(1, MAX_CONCURRENT_JOBS)):
    t = threading.Thread(target=queue_worker_loop, daemon=True)
    t.start()
    worker_threads.append(t)


@app.route("/")
@require_internal_access(api=False)
def index():
    cleanup_jobs()
    token = request.args.get("access_token", "")
    claims = verify_access_token(token)
    if claims:
        response = make_response(redirect("/"))
        response.set_cookie(
            ACCESS_COOKIE_NAME,
            token,
            max_age=ACCESS_COOKIE_TTL_SECONDS,
            httponly=True,
            secure=request.is_secure,
            samesite="Lax",
        )
        return response

    return render_template("index.html")


@app.route("/health")
def health():
    cleanup_jobs()
    return jsonify({
        "ok": True,
        "service": APP_SLUG,
        "name": APP_NAME,
        "version": APP_VERSION,
        "active_jobs": active_jobs_count(),
        "max_concurrent_jobs": MAX_CONCURRENT_JOBS,
        "job_ttl_seconds": JOB_TTL_SECONDS,
    })


@app.route("/status")
def status():
    cleanup_jobs()
    with jobs_lock:
        active_jobs = sum(1 for job in jobs.values() if job.get("status") == "downloading")
        queued_jobs = len(job_queue)
        failed_jobs = sum(1 for job in jobs.values() if job.get("status") == "error")
        total_jobs = len(jobs)
    return jsonify({
        "status": "operational",
        "active_jobs": active_jobs,
        "queued_jobs": queued_jobs,
        "failed_jobs": failed_jobs,
        "total_jobs": total_jobs,
    })


@app.route("/meta")
def meta():
    public_base_urls = dedupe_urls([PUBLIC_BASE_URL, ORIGIN_BASE_URL, *PUBLIC_BASE_URL_ALIASES])
    health_urls = dedupe_urls([PUBLIC_HEALTH_URL, ORIGIN_HEALTH_URL])

    return jsonify({
        "slug": APP_SLUG,
        "name": APP_NAME,
        "stack": "python-flask",
        "version": APP_VERSION,
        "public_base_url": PUBLIC_BASE_URL,
        "public_base_urls": public_base_urls,
        "origin_base_url": ORIGIN_BASE_URL or None,
        "health_url": PUBLIC_HEALTH_URL,
        "health_urls": health_urls,
        "origin_health_url": ORIGIN_HEALTH_URL or None,
        "features": ["mp4", "mp3", "quality-picker", "bulk-download"],
    })


@app.route("/api/info", methods=["POST"])
@require_internal_access(api=True)
def get_info():
    cleanup_jobs()
    data = request.json
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    cmd = ["yt-dlp", "--no-playlist", "-j", url]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            return jsonify({"error": result.stderr.strip().split("\n")[-1]}), 400

        info = json.loads(result.stdout)

        # Build quality options — keep best format per resolution
        best_by_height = {}
        for f in info.get("formats", []):
            height = f.get("height")
            if height and f.get("vcodec", "none") != "none":
                tbr = f.get("tbr") or 0
                if height not in best_by_height or tbr > (best_by_height[height].get("tbr") or 0):
                    best_by_height[height] = f

        formats = []
        for height, f in best_by_height.items():
            formats.append({
                "id": f["format_id"],
                "label": f"{height}p",
                "height": height,
            })
        formats.sort(key=lambda x: x["height"], reverse=True)

        return jsonify({
            "title": info.get("title", ""),
            "thumbnail": info.get("thumbnail", ""),
            "duration": info.get("duration"),
            "uploader": info.get("uploader", ""),
            "formats": formats,
        })
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timed out fetching video info"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/download", methods=["POST"])
@require_internal_access(api=True)
def start_download():
    cleanup_jobs()
    data = request.json
    url = data.get("url", "").strip()
    format_choice = data.get("format", "video")
    format_id = data.get("format_id")
    title = data.get("title", "")

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    if not (url.startswith("http://") or url.startswith("https://")):
        return jsonify({"error": "Invalid URL"}), 400

    with jobs_lock:
        if len(job_queue) >= max(1, MAX_QUEUE_SIZE):
            return jsonify({
                "error": "Queue is full. Please retry later.",
                "max_queue_size": MAX_QUEUE_SIZE,
            }), 429

    job_id = uuid.uuid4().hex[:10]
    with queue_condition:
        jobs[job_id] = {
            "status": "queued",
            "url": url,
            "format": format_choice,
            "format_id": format_id,
            "title": title,
            "created_at": now_ts(),
            "updated_at": now_ts(),
            "expires_at": None,
        }
        job_queue.append(job_id)
        position = len(job_queue)
        queue_condition.notify()

    return jsonify({
        "job_id": job_id,
        "status": "queued",
        "queue_position": position,
    })


@app.route("/api/status/<job_id>")
@require_internal_access(api=True)
def check_status(job_id):
    cleanup_jobs()
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    queue_position = queue_position_of(job_id) if job.get("status") == "queued" else None
    return jsonify({
        "status": job["status"],
        "error": job.get("error"),
        "filename": job.get("filename"),
        "queue_position": queue_position,
    })


@app.route("/api/file/<job_id>")
@require_internal_access(api=True)
def download_file(job_id):
    cleanup_jobs()
    with jobs_lock:
        job = jobs.get(job_id)
    if not job or job["status"] != "done":
        return jsonify({"error": "File not ready"}), 404
    return send_file(job["file"], as_attachment=True, download_name=job["filename"])


def resolve_bind_port():
    # Support multiple hosting providers that expose port under different env names.
    candidates = [
        os.environ.get("PORT"),
        os.environ.get("SERVER_PORT"),
        os.environ.get("APP_PORT"),
        os.environ.get("LISTEN_PORT"),
    ]

    for value in candidates:
        if not value:
            continue
        try:
            return int(value)
        except ValueError:
            continue

    return 8899


if __name__ == "__main__":
    port = resolve_bind_port()
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"[convertube] binding to {host}:{port}")
    app.run(host=host, port=port)
