import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Github,
  Signal,
  Siren,
  TimerReset,
} from "lucide-react";
import { createServerClient } from "@cafetoolbox/supabase";
import { BrandMark } from "@cafetoolbox/ui";
import { TimezoneClocks } from "../components/timezone-clocks";
import { UptimeChart } from "../components/uptime-chart";
import { AutoRefresh } from "../components/auto-refresh";
import { LastRefresh } from "../components/last-refresh";
import { StatusThemeToggle } from "../components/status-theme-toggle";

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

type ServiceWithHealth = ServiceRow & {
  uptime_24h: number;
  is_healthy: boolean;
  last_checked_at: string | null;
  response_time_ms: number | null;
};

type IncidentRow = {
  id: string;
  title: string;
  status: "investigating" | "identified" | "major_outage" | "monitoring" | "resolved";
  started_at: string;
  resolved_at: string | null;
  services_affected: string[] | null;
  updated_at?: string | null;
};

type IncidentUpdateRow = {
  id: string;
  incident_id: string;
  body: string;
  status: "investigating" | "identified" | "major_outage" | "monitoring" | "resolved";
  created_at: string;
};

type ServiceStatusKey = ServiceRow["status"];

const serviceStatusCopy: Record<
  ServiceStatusKey,
  {
    label: string;
    badge: string;
    dot: string;
  }
> = {
  operational: {
    label: "Hoạt động",
    badge: "border-green-500/35 bg-green-500/10 text-green-600",
    dot: "bg-green-500",
  },
  degraded: {
    label: "Giảm hiệu suất",
    badge: "border-yellow-500/35 bg-yellow-500/10 text-yellow-700",
    dot: "bg-yellow-500",
  },
  partial_outage: {
    label: "Sự cố cục bộ",
    badge: "border-orange-500/35 bg-orange-500/10 text-orange-600",
    dot: "bg-orange-500",
  },
  major_outage: {
    label: "Sự cố lớn",
    badge: "border-red-500/35 bg-red-500/10 text-red-600",
    dot: "bg-red-500",
  },
};

const incidentStatusCopy = {
  investigating: {
    label: "Đang điều tra",
    tone: "text-orange-600",
    dot: "bg-orange-500",
  },
  identified: {
    label: "Đã xác định",
    tone: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  major_outage: {
    label: "Sự cố lớn",
    tone: "text-red-600",
    dot: "bg-red-500",
  },
  monitoring: {
    label: "Đang theo dõi",
    tone: "text-blue-600",
    dot: "bg-blue-500",
  },
  resolved: {
    label: "Đã khắc phục",
    tone: "text-green-600",
    dot: "bg-green-500",
  },
} as const;

const overallStatusCopy = {
  no_data: {
    label: "Chưa có dữ liệu",
    chip: "border-charcoal/20 bg-charcoal/10 text-[var(--status-muted)]",
    glow: "from-charcoal/10 via-charcoal/5 to-transparent",
    icon: Signal,
  },
  operational: {
    label: "Toàn hệ thống ổn định",
    chip: "border-green-500/35 bg-green-500/10 text-green-600",
    glow: "from-green-500/20 via-green-500/8 to-transparent",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Có suy giảm hiệu suất",
    chip: "border-yellow-500/35 bg-yellow-500/10 text-yellow-700",
    glow: "from-yellow-500/18 via-yellow-500/6 to-transparent",
    icon: Clock3,
  },
  partial_outage: {
    label: "Đang có sự cố cục bộ",
    chip: "border-orange-500/35 bg-orange-500/10 text-orange-600",
    glow: "from-orange-500/18 via-orange-500/6 to-transparent",
    icon: AlertTriangle,
  },
  major_outage: {
    label: "Sự cố lớn đang diễn ra",
    chip: "border-red-500/35 bg-red-500/10 text-red-600",
    glow: "from-red-500/20 via-red-500/8 to-transparent",
    icon: Siren,
  },
} as const;

function getIncidentStatusDisplay(status: IncidentRow["status"]) {
  return incidentStatusCopy[status] || incidentStatusCopy.investigating;
}

function formatPercent(value: number) {
  return `${Math.max(0, value).toFixed(2)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Chưa cập nhật";

  return (
    new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value)) + " (UTC)"
  );
}

function resolveServiceStatus(service: ServiceWithHealth): ServiceStatusKey {
  if (service.status === "major_outage" || service.status === "partial_outage") {
    return service.status;
  }

  if (!service.is_healthy) {
    return "degraded";
  }

  return "operational";
}

function pickOverallState(services: ServiceWithHealth[], incidents: IncidentRow[]) {
  if (services.length === 0) {
    return overallStatusCopy.no_data;
  }

  const hasMajorIncident = incidents.some(
    (incident) => incident.status === "major_outage" && !incident.resolved_at
  );

  if (hasMajorIncident || services.some((service) => resolveServiceStatus(service) === "major_outage")) {
    return overallStatusCopy.major_outage;
  }

  if (services.some((service) => resolveServiceStatus(service) === "partial_outage")) {
    return overallStatusCopy.partial_outage;
  }

  const hasOpenIncident = incidents.some((incident) => incident.status !== "resolved");
  const hasDegradedService = services.some((service) => resolveServiceStatus(service) === "degraded");

  if (hasOpenIncident || hasDegradedService) {
    return overallStatusCopy.degraded;
  }

  return overallStatusCopy.operational;
}

export default async function StatusPage() {
  const supabase = await createServerClient();

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
      .limit(24),
  ]);

  const services = (servicesResult.data ?? []) as ServiceRow[];
  const incidents = (incidentsResult.data ?? []) as IncidentRow[];
  const updates = (updatesResult.data ?? []) as IncidentUpdateRow[];

  const servicesWithHealth = await Promise.all(
    services.map(async (service) => {
      const { data: healthData, error: healthError } = await supabase
        .rpc("get_service_health_status", {
          service_uuid: service.id,
        })
        .single();

      if (healthError) {
        console.warn(`[status-page] Health check error for ${service.name}:`, healthError);
        return {
          ...service,
          uptime_24h: Number(service.uptime ?? 100),
          is_healthy: service.status === "operational",
          last_checked_at: null,
          response_time_ms: null,
        } satisfies ServiceWithHealth;
      }

      const health = healthData as ServiceHealthRow | null;
      return {
        ...service,
        uptime_24h: health?.uptime_24h ?? Number(service.uptime ?? 100),
        is_healthy: health?.is_healthy ?? service.status === "operational",
        last_checked_at: health?.last_checked_at ?? null,
        response_time_ms: health?.last_response_time_ms ?? null,
      } satisfies ServiceWithHealth;
    })
  );

  const averageUptime =
    servicesWithHealth.length > 0
      ? servicesWithHealth.reduce((total, service) => total + Number(service.uptime_24h ?? 0), 0) /
        servicesWithHealth.length
      : 0;

  const operationalServices = servicesWithHealth.filter((service) => service.is_healthy).length;
  const openIncidents = incidents.filter((incident) => incident.status !== "resolved").length;
  const overallState = pickOverallState(servicesWithHealth, incidents);
  const OverallIcon = overallState.icon;

  const updatesByIncident = updates.reduce<Record<string, IncidentUpdateRow[]>>((acc, update) => {
    if (!acc[update.incident_id]) {
      acc[update.incident_id] = [];
    }
    acc[update.incident_id].push(update);
    return acc;
  }, {});

  const recentTimestamps = [
    ...servicesWithHealth.filter((service) => service.last_checked_at).map((service) => service.last_checked_at),
    ...incidents.map((incident) => incident.updated_at ?? incident.resolved_at ?? incident.started_at),
    ...updates.map((update) => update.created_at),
  ].filter((value): value is string => Boolean(value));

  const lastUpdatedAt =
    recentTimestamps.length > 0
      ? recentTimestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

  return (
    <main className="status-page">
      <div className="status-content mx-auto max-w-7xl px-6 py-10 lg:py-12">
        <header className="status-card rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-charcoal p-1.5 shadow-[0_10px_30px_rgba(18,18,18,0.2)]">
                  <BrandMark className="h-11 w-11 rounded-xl" size={44} variant="on-dark" />
                </div>
                <div>
                  <p className="status-kicker text-xs font-medium uppercase">Public Status</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                    CafeToolbox Reliability
                  </h1>
                </div>
              </div>

              <div
                className={`rounded-2xl border border-[var(--status-border-soft)] bg-gradient-to-br ${overallState.glow} p-4`}
              >
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${overallState.chip}`}
                >
                  <OverallIcon className="h-4 w-4" />
                  {overallState.label}
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--status-muted)]">
                  Trang trạng thái công khai lấy dữ liệu trực tiếp từ service heartbeat và incident logs. Mọi thời
                  gian hiển thị theo UTC để dễ đối chiếu giữa đội vận hành và người dùng.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusThemeToggle />
              <a
                href="https://github.com/prowhybraindead/cafetoolbox"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--status-border)] bg-[var(--status-bg-strong)] px-3.5 py-2 text-xs font-medium transition-colors hover:border-neon/70 hover:text-neon"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="status-card-soft rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--status-muted)]">Uptime Trung Bình 24h</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{formatPercent(averageUptime)}</p>
            </article>
            <article className="status-card-soft rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--status-muted)]">Dịch Vụ Healthy</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {operationalServices}/{servicesWithHealth.length || 0}
              </p>
            </article>
            <article className="status-card-soft rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--status-muted)]">Incident Đang Mở</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{openIncidents}</p>
            </article>
            <article className="status-card-soft rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--status-muted)]">Cập Nhật Gần Nhất</p>
              <p className="mt-2 text-sm font-medium leading-6">{formatDateTime(lastUpdatedAt)}</p>
            </article>
          </div>
        </header>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="status-card rounded-3xl p-6 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Dịch vụ và Uptime</h2>
                <p className="mt-1 text-sm text-[var(--status-muted)]">
                  Theo dõi uptime 24h, 7 ngày, 30 ngày theo từng service.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-border-soft)] bg-[var(--status-bg-strong)] px-3 py-1 text-xs text-[var(--status-muted)]">
                <Activity className="h-3.5 w-3.5" />
                {servicesWithHealth.length} services
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {servicesWithHealth.length > 0 ? (
                servicesWithHealth.map((service) => {
                  const serviceStatus = resolveServiceStatus(service);
                  const statusInfo = serviceStatusCopy[serviceStatus];

                  return (
                    <article key={service.id} className="status-card-soft rounded-2xl p-4">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${statusInfo.dot}`} />
                            <h3 className="text-base font-semibold">{service.name}</h3>
                          </div>
                          <p className="mt-1 text-sm text-[var(--status-muted)]">
                            Uptime 24h: {formatPercent(Number(service.uptime_24h ?? 0))}
                            {service.response_time_ms ? ` · ${service.response_time_ms}ms` : ""}
                          </p>
                          {service.last_checked_at ? (
                            <p className="mt-1 text-xs text-[var(--status-muted)]">
                              Last check: {formatDateTime(service.last_checked_at)}
                            </p>
                          ) : null}
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusInfo.badge}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <UptimeChart serviceId={service.id} />
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--status-border-soft)] p-8 text-center text-sm text-[var(--status-muted)]">
                  Chưa có service nào được cấu hình.
                </div>
              )}
            </div>
          </div>

          <aside className="status-card rounded-3xl p-6 md:p-7">
            <h2 className="text-xl font-semibold tracking-tight">Incident Timeline</h2>
            <p className="mt-1 text-sm text-[var(--status-muted)]">
              Tiến trình xử lý sự cố gần đây, ưu tiên thông tin update mới nhất.
            </p>

            <div className="mt-5 max-h-[920px] space-y-4 overflow-y-auto pr-1">
              {incidents.length > 0 ? (
                incidents.map((incident) => {
                  const incidentStatus = getIncidentStatusDisplay(incident.status);
                  const incidentUpdates = updatesByIncident[incident.id] ?? [];

                  return (
                    <article key={incident.id} className="status-card-soft rounded-2xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold leading-6">{incident.title}</h3>
                          <p className="text-xs text-[var(--status-muted)]">
                            Bắt đầu: {formatDateTime(incident.started_at)}
                            {incident.resolved_at ? ` · Khôi phục: ${formatDateTime(incident.resolved_at)}` : ""}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${incidentStatus.tone}`}>
                          <span className={`h-2 w-2 rounded-full ${incidentStatus.dot}`} />
                          {incidentStatus.label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(incident.services_affected ?? []).length > 0 ? (
                          (incident.services_affected ?? []).map((serviceName) => (
                            <span
                              key={serviceName}
                              className="inline-flex rounded-full border border-[var(--status-border-soft)] bg-[var(--status-bg-soft)] px-2.5 py-1 text-xs text-[var(--status-muted)]"
                            >
                              {serviceName}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex rounded-full border border-[var(--status-border-soft)] bg-[var(--status-bg-soft)] px-2.5 py-1 text-xs text-[var(--status-muted)]">
                            Không có service affected
                          </span>
                        )}
                      </div>

                      {incidentUpdates.length > 0 ? (
                        <div className="mt-4 border-t status-divider pt-4">
                          <div className="space-y-3">
                            {incidentUpdates.slice(0, 3).map((update) => {
                              const updateStatus = getIncidentStatusDisplay(update.status);
                              return (
                                <div key={update.id} className="flex gap-2.5">
                                  <span
                                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${updateStatus.dot}`}
                                    aria-hidden
                                  />
                                  <div>
                                    <p className="text-sm leading-6">{update.body}</p>
                                    <p className="text-xs text-[var(--status-muted)]">{formatDateTime(update.created_at)}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--status-border-soft)] p-8 text-center">
                  <CheckCircle2 className="mx-auto h-9 w-9 text-green-500" />
                  <p className="mt-3 text-sm text-[var(--status-muted)]">Không có incident nào gần đây.</p>
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="status-card rounded-3xl p-6 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Đồng hồ múi giờ</h2>
                <p className="mt-1 text-sm text-[var(--status-muted)]">
                  So sánh nhanh thời gian giữa Vercel, UTC và Việt Nam.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-border-soft)] bg-[var(--status-bg-strong)] px-3 py-1 text-xs text-[var(--status-muted)]">
                <Clock3 className="h-3.5 w-3.5" />
                Time sync
              </span>
            </div>
            <div className="mt-5">
              <TimezoneClocks />
            </div>
          </article>

          <article className="status-card rounded-3xl p-6 md:p-7">
            <h2 className="text-xl font-semibold tracking-tight">Monitoring Flow</h2>
            <p className="mt-1 text-sm text-[var(--status-muted)]">
              Cách dữ liệu được tổng hợp trước khi hiển thị lên status page.
            </p>

            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--status-muted)]">
              <p className="status-card-soft rounded-xl p-3">
                1. Worker chạy health check mỗi 30 giây và ghi vào <span className="font-mono">service_heartbeats</span>.
              </p>
              <p className="status-card-soft rounded-xl p-3">
                2. View 24h đọc dữ liệu heartbeat theo giờ; 7d/30d dùng bảng tổng hợp{" "}
                <span className="font-mono">service_uptime_daily</span>.
              </p>
              <p className="status-card-soft rounded-xl p-3">
                3. Khi có lỗi kéo dài, incident sẽ được tạo và cập nhật timeline công khai.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <AutoRefresh />
              <LastRefresh />
            </div>
          </article>
        </section>

        <footer className="mt-8 border-t status-divider pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--status-muted)]">
            <span>Public status page for CafeToolbox</span>
            <span className="inline-flex items-center gap-1">
              <TimerReset className="h-3.5 w-3.5" />
              Refresh interval: 60s
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
