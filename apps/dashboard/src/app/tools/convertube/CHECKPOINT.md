# Frontend Track Checkpoint (Dashboard Convertube)

Cap nhat: 2026-04-15 - da hoan thanh implementation phase.

Muc tieu: tao frontend Convertube trong dashboard de tranh cross-domain iframe issues.

## Route target

- `/tools/convertube`
- File: `apps/dashboard/src/app/tools/convertube/page.tsx`

## Ke hoach implementation

1. Tao page UI (Server Component + Client Component neu can).
2. Tao API route proxy trong dashboard:
- `/api/tools/convertube/info`
- `/api/tools/convertube/download`
- `/api/tools/convertube/status/[jobId]`
3. Browser chi goi API dashboard, dashboard moi goi backend Convertube.
4. Gan error/loading state ro rang bang tieng Viet cho admin UX.

## Env names can document/use

- `CONVERTUBE_API_BASE_URL`
- `DASHBOARD_TOOL_SHARED_SECRET`
- `DASHBOARD_TOOL_TOKEN_TTL_SECONDS`

## Definition of done

- User da login dashboard thao tac Convertube hoan toan trong dashboard.
- Khong bi redirect sai host/port.
- Khong bi loi frame domain mismatch.

## Ket qua thuc te

- Da co route frontend: `/tools/convertube`.
- Da co API proxy dashboard -> convertube backend:
  - `/api/tools/convertube/info`
  - `/api/tools/convertube/download`
  - `/api/tools/convertube/status/[jobId]`
  - `/api/tools/convertube/file/[jobId]`
