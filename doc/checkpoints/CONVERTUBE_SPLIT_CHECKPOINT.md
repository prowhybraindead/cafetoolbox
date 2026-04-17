# Checkpoint: Convertube Frontend/Backend Split

Ngay tao: 2026-04-15
Trang thai: Phase 1 + Phase 2 + move backend folder da hoan thanh (2026-04-15).

## Muc tieu da chot

- Frontend Convertube chay trong dashboard tai route: `/tools/convertube`.
- Service Convertube giu vai tro backend API (Flask) va tach ro khoi dashboard.
- Bo iframe/cross-domain cho luong su dung thuong ngay.

## Da hoan thanh trong session nay

1. Sua redirect login trong Convertube:
- `apps/serveroutside/convertube/app.py` da doi tu `.../auth/login` -> `.../login`.

2. Gia co env loading cho Convertube:
- `apps/serveroutside/convertube/app.py` da co doc `.env.local`/`.env` (khong ghi de env runtime).
- Fallback dashboard URL an toan hon khi chay tren domain `*.cafetoolbox.app`.

3. Da tao folder scaffold cho phase split:
- `apps/dashboard/src/app/tools/convertube/`
- `apps/serveroutside/convertube/`

4. Da lam sach note migration:
- `packages/supabase/migrations/0017_seed_convertube_service.sql` cap nhat comment cho ro y nghia URL.

## Da hoan thanh tiep (2026-04-15)

1. Frontend dashboard:
- Da tao `apps/dashboard/src/app/tools/convertube/page.tsx`.
- Da port luong UI chinh vao dashboard route:
  - parse nhieu URL
  - chon MP4/MP3
  - doc info video
  - queue download + poll status + save file.

2. Dashboard API proxy layer:
- Da tao route server-side:
  - `POST /api/tools/convertube/info`
  - `POST /api/tools/convertube/download`
  - `GET /api/tools/convertube/status/[jobId]`
  - `GET /api/tools/convertube/file/[jobId]`
- Proxy route dung server env + shared secret, khong expose secret o browser.

## Da hoan thanh them (2026-04-15)

1. Backend Convertube service:
- Da move code tu `apps/convertube` sang `apps/serveroutside/convertube`.
- Da bo folder cu `apps/convertube`.
- Da cap nhat docs va root script local (`pnpm convertube:dev`).

## Chua lam (de session moi neu can)

1. Tool registry + launch behavior:
- Neu Convertube da embed trong dashboard, co the bo flow redirect sang domain Convertube cho use case UI.
- Giu `health_url` external de monitoring van check service backend.

## Cac file can doc truoc khi tiep tuc

- `RULES.md`
- `doc/TOOL_REGISTRY_PLAN.md`
- `doc/CONVERTUBE_STATUS_ONBOARDING.md`
- `apps/serveroutside/convertube/app.py`
- `packages/supabase/migrations/0017_seed_convertube_service.sql`

## Acceptance criteria cho phase split

1. User truy cap `/tools/convertube` khi da login thi su dung duoc day du workflow.
2. Khong con can iframe vao `convertube.cafetoolbox.app:25914` cho UI chinh.
3. Backend Convertube van co `/health`, `/status`, `/meta` hoat dong cho monitoring.
4. Status page van doc dung uptime/health cua Convertube tu `service_health_config`.

## Resume prompt (copy cho session moi)

"Tiep tuc theo doc/checkpoints/CONVERTUBE_SPLIT_CHECKPOINT.md. Tinh chinh launch behavior va hardening deploy cho convertube backend path apps/serveroutside/convertube."
