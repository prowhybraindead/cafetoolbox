# Tool Registry Plan

## Mục tiêu

CafeToolbox cần một lớp registry thống nhất để quản lý toàn bộ tools của hệ thống, regardless việc tool đó:

- nằm trực tiếp trong `apps/` và chạy chung dashboard
- là tool lớn, khác techstack, deploy riêng qua subdomain
- cần hiển thị chung trong status page
- cần theo dõi health, uptime, last refresh, version và owner

Mục tiêu của kế hoạch này là tránh việc dashboard phải biết chi tiết triển khai bên trong của từng tool. Dashboard chỉ cần biết tool nào tồn tại, nó nằm ở đâu, và contract tối thiểu để đọc trạng thái hoặc mở sang trang quản trị riêng.

## Bối cảnh thiết kế

Hiện hệ thống đang có hai nhóm ứng dụng chính:

- `apps/dashboard`: nơi người dùng nội bộ quản lý tool, category, user, setting, và các tác vụ admin
- `apps/status`: nơi công khai trạng thái hệ thống, uptime, incident, và các biểu đồ lịch sử

Trong giai đoạn mở rộng, sẽ xuất hiện thêm:

- tools nhỏ, cùng stack, có thể sống ngay trong dashboard app
- tools lớn, khác stack, ví dụ Python service riêng, deploy riêng ở subdomain khác

Kết luận kiến trúc:

- tool nhỏ: ưu tiên chạy như một route/module trong dashboard app
- tool lớn: coi như service độc lập, quản lý qua registry + API contract + subdomain

## Nguyên tắc

1. Dashboard không import code của tool external.
2. Dashboard chỉ giao tiếp qua HTTP API hoặc metadata registry.
3. Status page chỉ đọc dữ liệu công khai hoặc dữ liệu đã chuẩn hóa từ Supabase.
4. Mỗi tool phải có một identity rõ ràng, dù chạy local hay external.
5. Uptime/history phải gắn với một định danh thống nhất là `tool_id`.

## Phân loại tool

### Local tool

Tool nằm trong dashboard app, dùng chung codebase, cùng auth/session và cùng deploy unit.

Ví dụ:

- tool CRUD nội bộ
- screen quản lý content nhỏ
- utility page chỉ dành cho admin

Đặc điểm:

- `kind = local`
- `base_url` thường là route nội bộ, ví dụ `/dashboard/tools/foo`
- không cần backend riêng
- không cần subdomain riêng

### External tool

Tool lớn, độc lập, có thể viết bằng Python, Node, Go, hoặc stack khác.

Ví dụ:

- Python pipeline app
- processing worker service
- specialized admin backend

Đặc điểm:

- `kind = external`
- `base_url` là subdomain hoặc domain riêng
- có backend riêng
- dashboard chỉ quản lý từ xa qua API

## Bảng registry đề xuất

### `tools`

Bảng này là nguồn sự thật để dashboard và status page biết hệ thống có những tool nào.

Các cột đề xuất:

- `id`: UUID
- `slug`: mã định danh ngắn, ổn định, dùng làm khóa hiển thị
- `name`: tên hiển thị
- `kind`: `local | external`
- `stack`: `nextjs | python | node | rust | other`
- `base_url`: URL chính của tool
- `admin_url`: URL quản trị nếu có
- `health_url`: URL health check nếu có
- `api_base_url`: base URL cho API quản trị hoặc dữ liệu
- `owner`: nhóm hoặc người phụ trách
- `description`: mô tả ngắn
- `enabled`: bật/tắt hiển thị
- `sort_order`: thứ tự hiển thị
- `created_at`, `updated_at`

Thuộc tính nên có thêm nếu cần:

- `visibility`: internal/public/limited
- `deploy_target`: local/subdomain/external-host
- `support_contact`
- `version_hint`
- `tags`

## Quan hệ với uptime/history

Mỗi tool trong registry cần được nối với các bảng theo dõi trạng thái.

Đề xuất chuẩn:

- `tool_heartbeats`: log từng lần check
- `tool_uptime_daily`: aggregate theo ngày
- `tool_incidents`: incident gắn với tool

Nếu muốn giữ nguyên cấu trúc hiện tại, có thể làm bước chuyển đổi dần:

- `services` trở thành registry chính, hoặc
- `tools` mới trở thành registry chính, rồi `services` là lớp tương thích

Khuyến nghị thực tế:

- tạo bảng `tools` làm registry canonical
- map các bảng uptime hiện có sang `tool_id`
- giữ backward compatibility trong một giai đoạn chuyển tiếp

## Cách dashboard dùng registry

Dashboard nên đọc `tools` để biết:

- tool nào cần hiển thị
- tool nào local
- tool nào external
- tool nào có health endpoint
- tool nào có admin URL

Luồng gợi ý:

1. Dashboard query bảng `tools`
2. Với tool `local`, dashboard render route nội bộ hoặc link tới module tương ứng
3. Với tool `external`, dashboard render card kèm link subdomain và trạng thái health
4. Nếu dashboard có quyền admin, gọi API remote của tool qua `api_base_url`
5. Status page dùng cùng registry để render danh sách công khai

## Cách status page dùng registry

Status page không nên tự suy đoán tool từ code dashboard.
Nó nên đọc dữ liệu đã chuẩn hóa từ Supabase:

- danh sách tool public/internal được phép hiển thị
- health status
- uptime 1d/7d/30d
- last check time
- incident gần nhất

Mỗi tool hiển thị như một card chuẩn hóa:

- tên tool
- trạng thái hiện tại
- uptime 24h hoặc 1d
- chart 1d/7d/30d
- link sang subdomain hoặc route nội bộ
- last refresh

## API contract tối thiểu cho external tools

Mỗi external tool nên cung cấp các endpoint tối thiểu sau:

- `GET /health`
- `GET /status`
- `GET /meta`
- `GET /metrics/summary`
- `POST /admin/*` nếu dashboard cần điều khiển

Ý nghĩa:

- `health`: xác nhận tool sống và version hiện tại
- `status`: trạng thái nghiệp vụ cao hơn, ví dụ degraded/maintenance
- `meta`: metadata chuẩn hóa
- `metrics/summary`: số liệu để status page hoặc dashboard đọc
- `admin/*`: hành động điều khiển từ xa nếu cần

Nếu tool Python lớn của bạn có backend riêng, đây là lớp giao tiếp nên giữ ổn định.

## Xác thực và domain

Vì tools của bạn có thể cùng domain nhưng khác subdomain, có 3 phương án auth:

1. Shared cookie domain
   - phù hợp khi tất cả cùng domain chính
   - đơn giản cho SSO nội bộ

2. Central JWT/SSO
   - dashboard cấp token ngắn hạn cho tool external
   - hợp cho tool khác stack hoặc host khác

3. Token per tool
   - mỗi tool có secret riêng
   - phù hợp khi bạn muốn cô lập mạnh hơn

Khuyến nghị:

- nội bộ cùng domain: dùng shared auth hoặc SSO
- external tool quan trọng: thêm token riêng cho API quản trị

## UI dashboard đề xuất

Dashboard nên có một màn hình control plane gồm:

- danh sách tools theo nhóm local/external
- trạng thái hiện tại
- link mở tool
- link mở admin
- health badge
- version badge
- owner badge
- filter theo stack/kind/enabled

Đối với tool external, dashboard chỉ đóng vai trò trung tâm điều phối.
Đối với tool local, dashboard có thể render trực tiếp UI.

## Phân ranh rõ giữa local tool và external tool

### Local tool nên dùng khi

- chức năng nhỏ
- cùng data model với dashboard
- ít hoặc không có yêu cầu scale riêng
- không cần deploy độc lập

### External tool nên dùng khi

- codebase lớn
- stack khác biệt, ví dụ Python
- cần scale riêng
- cần deploy riêng
- có vòng đời độc lập
- có health/incident riêng

Điểm này rất quan trọng để tránh biến dashboard thành monolith khó bảo trì.

## Lộ trình triển khai

### Phase 1: Registry

- tạo bảng `tools`
- seed danh sách tool hiện có
- map tool nội bộ và external vào cùng registry

### Phase 2: Status integration

- status page đọc registry
- hiển thị card tool từ bảng registry
- gắn health/uptime/history theo `tool_id`

### Phase 3: Dashboard control plane

- dashboard quản lý local tools trực tiếp
- dashboard hiển thị external tools như service cards
- thêm quick actions: open app, open admin, check health

### Phase 4: External tool onboarding

- chuẩn hóa contract cho Python tool lớn
- tạo health endpoint và summary endpoint
- đưa tool vào registry

### Phase 5: Hardening

- thêm policy/permission theo owner hoặc kind
- bổ sung audit log cho action từ dashboard
- thêm versioning và deploy metadata

## Rủi ro cần tránh

- nhúng code external tool vào dashboard trực tiếp
- để status page phụ thuộc vào logic riêng của từng tool
- không có `tool_id` chuẩn hóa, dẫn đến dữ liệu uptime bị rời rạc
- mix lẫn UI quản trị local tool với external control flow
- để mỗi tool tự đặt chuẩn health riêng, khó tổng hợp

## Kết luận

Cấu trúc phù hợp nhất cho CafeToolbox là:

- dashboard quản lý local tools và hiển thị external tools
- status page đọc registry thống nhất để hiển thị uptime/history
- external tools, đặc biệt tool Python lớn, chạy backend riêng và giao tiếp qua API contract
- Supabase là lớp lưu registry + metrics + incident chung

Tài liệu này là nền tảng cho việc mở rộng hệ thống theo kiểu control plane + service registry, thay vì gắn logic tool trực tiếp vào dashboard.

## Appendix A: Convertube Onboarding (Python Tool)

`apps/serveroutside/convertube` là ví dụ điển hình cho external tool stack khác biệt trong hệ CafeToolbox.

Đề xuất onboarding:

1. Đăng ký tool vào bảng `tools`:
   - `slug = convertube`
   - `name = Convertube`
   - `kind = external`
   - `stack = python-flask`
   - `base_url = http://YOUR-CONVERTUBE-CNAME:25914` (primary CNAME)
   - `health_url = http://YOUR-CONVERTUBE-CNAME:25914/health`
   - `api_base_url = http://YOUR-CONVERTUBE-CNAME:25914`
   - `origin_base_url = http://YOUR-CONVERTUBE-ORIGIN:25914` (direct host fallback)
   - `origin_health_url = http://YOUR-CONVERTUBE-ORIGIN:25914/health`
   - `enabled = true`

2. Contract endpoint tối thiểu của Convertube:
   - `GET /health`
   - `GET /status`
   - `GET /meta`
   - `POST /api/info`
   - `POST /api/download`
   - `GET /api/status/:jobId`

3. Cách dashboard sử dụng:
   - Hiển thị card tool từ registry.
   - Link `Open App` mở `base_url`.
   - Health badge đọc từ `health_url`.

4. Cách status app sử dụng:
   - Dùng `health_url` để hiện trạng thái sống/chết.
   - Giai đoạn sau thêm heartbeats/uptime qua backend monitoring nếu cần biểu đồ lịch sử.

5. Chính sách triển khai:
   - Có thể host bằng domain của hosting ở giai đoạn đầu.
   - Mục tiêu dài hạn là chuyển sang domain riêng của bạn để giảm phụ thuộc hạ tầng.

6. Bảo vệ truy cập nội bộ (dashboard-gated):
   - Dashboard phát access token ngắn hạn khi user nhấn mở tool.
   - Convertube chỉ cho truy cập UI/API khi token hợp lệ (sau đó lưu cookie phiên nội bộ).
   - Truy cập trực tiếp vào domain Convertube không qua dashboard sẽ bị chặn.
   - Biến môi trường bắt buộc phải đồng bộ:
     - Dashboard: `DASHBOARD_TOOL_SHARED_SECRET`, `DASHBOARD_TOOL_TOKEN_TTL_SECONDS`
     - Convertube: `DASHBOARD_TOOL_SHARED_SECRET`, `ACCESS_COOKIE_TTL_SECONDS`
