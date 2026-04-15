# Backend Track Checkpoint (Convertube Service)

Thu muc nay dung cho backend Convertube da tach khoi dashboard UI.

## Trang thai hien tai

- Backend da duoc move vao: `apps/serveroutside/convertube` (2026-04-15).
- Folder cu `apps/convertube` da duoc bo.

## Viec da lam trong lan move

1. Move code: `apps/convertube` -> `apps/serveroutside/convertube`.
2. Don dep nested git va pycache trong folder backend.
3. Cap nhat tham chieu docs/changelog/checkpoint.
4. Them script root de chay local:
- `pnpm convertube:dev`
5. Runtime contract giu nguyen:
- `GET /health`
- `GET /status`
- `GET /meta`

## Luu y

- Khong commit gia tri secret trong env files.
- Chi tai lieu hoa ten bien env.
