import { AlertTriangle, CheckCircle, Clock3, Github, Signal } from "lucide-react";
import { createServerClient } from "@cafetoolbox/supabase";
import { BrandMark } from "@cafetoolbox/ui";
import { TimezoneClocks } from "../components/timezone-clocks";

type ServiceRow = {
  id: string;
  name: string;
  status: "operational" | "degraded" | "partial_outage" | "major_outage";
  uptime: number | string | null;
  updated_at?: string | null;
};

type ServiceHealthRow = {
  is_healthy: boolean;
  last_checked_at: string;
  last_response_time_ms: number | null;
  uptime_24h: number;
  consecutive_failures: number;
};

type IncidentRow = {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  started_at: string;
  resolved_at: string | null;
  services_affected: string[] | null;
  updated_at?: string | null;
};

type IncidentUpdateRow = {
  id: string;
  incident_id: string;
  body: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  created_at: string;
};

const serviceStatusCopy = {
  operational: {
    label: "Hoạt động",
    tone: "text-green-600",
    badge: "bg-green-50 text-green-700 border-green-200",
    bar: "bg-green-500",
  },
  degraded: {
    label: "Giảm hiệu suất",
    tone: "text-yellow-700",
    badge: "bg-yellow-50 text-yellow-800 border-yellow-200",
    bar: "bg-yellow-500",
  },
  partial_outage: {
    label: "Sự cố cục bộ",
    tone: "text-orange-600",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    bar: "bg-orange-500",
  },
  major_outage: {
    label: "Sự cố lớn",
    tone: "text-red-600",
    badge: "bg-red-50 text-red-700 border-red-200",
    bar: "bg-red-500",
  },
} as const;

const incidentStatusCopy = {
  investigating: { label: "Đang điều tra", tone: "text-orange-600" },
  identified: { label: "Đã xác định", tone: "text-yellow-700" },
  monitoring: { label: "Đang theo dõi", tone: "text-blue-600" },
  resolved: { label: "Đã khắc phục", tone: "text-green-600" },
} as const;

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Chưa cập nhật";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value)) + " (UTC)";
}

function pickOverallState(services: ServiceRow[], incidents: IncidentRow[]) {
  if (services.length === 0) {
    return {
      label: "Chưa có dữ liệu",
      tone: "text-charcoalMuted",
      badge: "bg-charcoal/5 text-charcoalMuted border-borderLight",
      icon: Signal,
    };
  }

  if (services.some((service) => service.status === "major_outage")) {
    return {
      label: "Sự cố lớn",
      tone: "text-red-600",
      badge: "bg-red-50 text-red-700 border-red-200",
      icon: AlertTriangle,
    };
  }

  if (services.some((service) => service.status === "partial_outage")) {
    return {
      label: "Sự cố cục bộ",
      tone: "text-orange-600",
      badge: "bg-orange-50 text-orange-700 border-orange-200",
      icon: AlertTriangle,
    };
  }

  if (
    services.some((service) => service.status === "degraded") ||
    incidents.some((incident) => incident.status !== "resolved")
  ) {
    return {
      label: "Giảm hiệu suất",
      tone: "text-yellow-700",
      badge: "bg-yellow-50 text-yellow-800 border-yellow-200",
      icon: Clock3,
    };
  }

  return {
    label: "Hoạt động",
    tone: "text-green-600",
    badge: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle,
  };
}

export default async function StatusPage() {
  const supabase = await createServerClient();

  // Fetch services, incidents, and incident updates in parallel
  const [servicesResult, incidentsResult, updatesResult] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, status, uptime, updated_at")
      .order("name", { ascending: true }),
    supabase
      .from("incidents")
      .select("id, title, status, started_at, resolved_at, services_affected, updated_at")
      .order("started_at", { ascending: false })
      .limit(6),
    supabase
      .from("incident_updates")
      .select("id, incident_id, body, status, created_at")
      .order("created_at", { ascending: false })
      .limit(18),
  ]);

  const services = (servicesResult.data ?? []) as ServiceRow[];
  const incidents = (incidentsResult.data ?? []) as IncidentRow[];
  const updates = (updatesResult.data ?? []) as IncidentUpdateRow[];

  // Fetch real health status from heartbeats for each service
  const servicesWithHealth = await Promise.all(
    services.map(async (service) => {
      const { data: healthData, error: healthError } = await supabase
        .rpc("get_service_health_status", {
          service_uuid: service.id,
        } as any)
        .single();

      if (healthError) {
        console.warn(`[status-page] Health check error for ${service.name}:`, healthError);
        // Fallback: use seed uptime if RPC fails
        return {
          ...service,
          uptime_24h: Number(service.uptime ?? 100),
          is_healthy: service.status === "operational",
          last_checked_at: null,
          response_time_ms: null,
        };
      }

      const health = healthData as ServiceHealthRow | null;
      return {
        ...service,
        uptime_24h: health?.uptime_24h ?? Number(service.uptime ?? 100),
        is_healthy: health?.is_healthy ?? service.status === "operational",
        last_checked_at: health?.last_checked_at ?? null,
        response_time_ms: health?.last_response_time_ms ?? null,
      };
    })
  );

  // Calculate real average uptime from heartbeat data
  const averageUptime =
    servicesWithHealth.length > 0
      ? servicesWithHealth.reduce((total, service) => total + Number(service.uptime_24h ?? 0), 0) /
        servicesWithHealth.length
      : 0;

  const operationalServices = servicesWithHealth.filter((s) => s.is_healthy).length;
  const openIncidents = incidents.filter((incident) => incident.status !== "resolved").length;
  const overallState = pickOverallState(services, incidents);
  const OverallIcon = overallState.icon;

  const updatesByIncident = updates.reduce<Record<string, IncidentUpdateRow[]>>((accumulator, update) => {
    if (!accumulator[update.incident_id]) {
      accumulator[update.incident_id] = [];
    }

    accumulator[update.incident_id].push(update);
    return accumulator;
  }, {});

  // Collect recent timestamps from services (heartbeats), incidents, and updates
  const recentTimestamps = [
    ...servicesWithHealth.filter((s) => s.last_checked_at).map((s) => s.last_checked_at),
    ...incidents.map((incident) => incident.updated_at ?? incident.resolved_at ?? incident.started_at),
    ...updates.map((update) => update.created_at),
  ].filter((value): value is string => Boolean(value));

  const lastUpdatedAt =
    recentTimestamps.length > 0
      ? recentTimestamps.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0]
      : null;

  return (
    <main className="min-h-screen bg-cream text-charcoal">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(57,255,20,0.16),_transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-6 py-10 lg:py-12">
        <header className="flex flex-col gap-6 border-b border-borderLight pb-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-charcoal p-1.5 shadow-[0_10px_30px_rgba(18,18,18,0.15)] ring-1 ring-black/5">
              <BrandMark className="h-12 w-12 shrink-0 rounded-xl" size={48} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-charcoalMuted">Public Status</p>
              <h1 className="text-2xl font-semibold tracking-tight">CafeToolbox Status</h1>
            </div>
          </div>

          <a
            href="https://github.com/prowhybraindead/cafetoolbox"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-borderMain bg-white px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:border-neon"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-borderMain bg-white p-8 shadow-[0_20px_60px_rgba(26,26,26,0.05)]">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${overallState.badge}`}>
                <OverallIcon className="h-4 w-4" />
                {overallState.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-borderLight bg-charcoal/5 px-3 py-1 text-sm text-charcoalMuted">
                <Signal className="h-4 w-4" />
                Open for all
              </span>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-charcoalMuted">Uptime trung bình (24h)</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight">{formatPercent(averageUptime)}</p>
              </div>
              <div>
                <p className="text-sm text-charcoalMuted">Dịch vụ hoạt động</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight">{operationalServices}/{servicesWithHealth.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-charcoalMuted">Sự cố đang mở</p>
                <p className={`mt-2 text-4xl font-semibold tracking-tight ${overallState.tone}`}>{openIncidents}</p>
              </div>
            </div>

            <p className="mt-6 max-w-2xl text-sm leading-6 text-charcoalMuted">
              Trang này đọc trực tiếp dữ liệu công khai từ <span className="font-medium text-charcoal">services</span> và <span className="font-medium text-charcoal">service_heartbeats</span> (monitoring thực tế).
              Uptime được tính từ các lần kiểm tra health check trong 24 giờ qua. Incidents lịch sử của các sự cố được ghi nhận.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-borderMain bg-charcoal p-6 text-white">
              <p className="text-sm text-white/70">Trạng thái hiện tại</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-neon">{overallState.label}</p>
              <p className="mt-2 text-sm text-white/70">Cập nhật từ dữ liệu công khai, không yêu cầu đăng nhập.</p>
            </div>

            <div className="rounded-3xl border border-borderMain bg-white p-6">
              <p className="text-sm text-charcoalMuted">Cập nhật gần nhất</p>
              <p className="mt-3 text-lg font-semibold">{formatDateTime(lastUpdatedAt)}</p>
              <p className="mt-2 text-sm text-charcoalMuted">
                Khi service hoặc incident thay đổi trong Supabase, trang này sẽ phản ánh ngay ở lần tải tiếp theo.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-borderMain bg-white p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Uptime theo từng phần (24h)</h2>
              <p className="mt-2 text-sm text-charcoalMuted">
                Uptime được tính từ các lần health check qua heartbeat logs. Mỗi check được ghi lại và tính % uptime thực tế.
              </p>
            </div>
            <div className="rounded-full border border-borderLight bg-charcoal/5 px-3 py-1 text-sm text-charcoalMuted">
              {servicesWithHealth.length} services
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {servicesWithHealth.map((service) => {
              const statusKey = service.is_healthy ? "operational" : "degraded";
              const copy = serviceStatusCopy[statusKey];
              const uptimeValue = Number(service.uptime_24h ?? 0);

              return (
                <article key={service.id} className="rounded-2xl border border-borderLight p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{service.name}</h3>
                      <p className="mt-1 text-sm text-charcoalMuted">
                        Uptime 24h: {formatPercent(uptimeValue)}{service.response_time_ms ? ` · ${service.response_time_ms}ms` : ""}
                      </p>
                      {service.last_checked_at ? (
                        <p className="mt-1 text-xs text-charcoalMuted">
                          Kiểm tra lần cuối: {formatDateTime(service.last_checked_at)}
                        </p>
                      ) : null}
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${copy.badge}`}>
                      {copy.label}
                    </span>
                  </div>

                  <div className="mt-4 h-3 rounded-full bg-charcoal/10">
                    <div
                      className={`h-3 rounded-full ${copy.bar}`}
                      style={{ width: `${Math.min(Math.max(uptimeValue, 0), 100)}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-charcoalMuted">Trạng thái</span>
                    <span className={copy.tone}>{copy.label}</span>
                  </div>
                </article>
              );
            })}

            {servicesWithHealth.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-borderLight p-8 text-center text-charcoalMuted lg:col-span-2">
                Chưa có service nào được seed vào Supabase.
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-borderMain bg-white p-8">
            <h2 className="text-xl font-semibold tracking-tight">Sự cố gần đây</h2>
            <p className="mt-2 text-sm text-charcoalMuted">
              Dữ liệu này dùng để theo dõi lịch sử gián đoạn và tiến trình xử lý.
            </p>

            <div className="mt-6 space-y-4">
              {incidents.length > 0 ? (
                incidents.map((incident) => {
                  const incidentStatus = incidentStatusCopy[incident.status];
                  const incidentUpdates = updatesByIncident[incident.id] ?? [];

                  return (
                    <article key={incident.id} className="rounded-2xl border border-borderLight p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{incident.title}</h3>
                          <p className="mt-1 text-sm text-charcoalMuted">
                            Bắt đầu: {formatDateTime(incident.started_at)}
                            {incident.resolved_at ? ` · Khôi phục: ${formatDateTime(incident.resolved_at)}` : ""}
                          </p>
                        </div>
                        <span className={incidentStatus.tone}>{incidentStatus.label}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-charcoalMuted">
                        {(incident.services_affected ?? []).map((service) => (
                          <span key={service} className="rounded-full bg-charcoal/5 px-3 py-1">
                            {service}
                          </span>
                        ))}
                        {(incident.services_affected ?? []).length === 0 ? (
                          <span className="rounded-full bg-charcoal/5 px-3 py-1">Không có service affected</span>
                        ) : null}
                      </div>

                      {incidentUpdates.length > 0 ? (
                        <div className="mt-4 space-y-3 border-t border-borderLight pt-4">
                          {incidentUpdates.slice(0, 3).map((update) => (
                            <div key={update.id} className="flex gap-3">
                              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-neon" />
                              <div>
                                <p className="text-sm font-medium">{update.body}</p>
                                <p className="mt-1 text-xs text-charcoalMuted">{formatDateTime(update.created_at)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-borderLight p-8 text-center">
                  <CheckCircle className="mx-auto mb-4 h-10 w-10 text-neon" />
                  <p className="text-sm text-charcoalMuted">Không có sự cố nào được ghi nhận gần đây.</p>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-3xl border border-borderMain bg-charcoal p-8 text-white">
            <h2 className="text-xl font-semibold tracking-tight">Cách theo dõi uptime</h2>
            <div className="mt-5 space-y-4 text-sm text-white/75">
              <p>
                1. Mỗi service được lưu trong bảng <span className="text-neon">services</span> với trạng thái và uptime riêng.
              </p>
              <p>
                2. Các sự cố được lưu trong bảng <span className="text-neon">incidents</span> và được nối với phần cập nhật trong <span className="text-neon">incident_updates</span>.
              </p>
              <p>
                3. Status page đọc trực tiếp dữ liệu công khai, nên ai cũng xem được mà không cần đăng nhập.
              </p>
              <p>
                4. Nếu muốn uptime lịch sử theo ngày/giờ, bước tiếp theo là thêm bảng heartbeat hoặc snapshot riêng để lưu từng lần kiểm tra.
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-12 rounded-3xl border border-borderMain bg-white p-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Đồng hồ các múi giờ</h2>
            <p className="text-sm text-charcoalMuted">
              So sánh thời gian giữa server (Vercel), giờ chuẩn UTC và giờ Việt Nam (UTC+7). Tất cả thời gian trên trang đều hiển thị theo UTC.
            </p>
          </div>
          <div className="mt-6">
            <TimezoneClocks />
          </div>
        </section>

        <footer className="mt-12 border-t border-borderLight pt-6 text-sm text-charcoalMuted">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p>Public status page for CafeToolbox.</p>
            <p>Thời gian trên trang hiển thị theo UTC · Last refresh: {formatDateTime(new Date().toISOString())}</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
