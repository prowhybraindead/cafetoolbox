import { logger } from "./logger.mjs";

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    query.set(key, String(value));
  }

  return query.toString();
}

export class SupabaseRestClient {
  constructor({ supabaseUrl, serviceRoleKey }) {
    this.baseUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
    this.headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
  }

  async request(path, { method = "GET", query, body, headers = {} } = {}) {
    const queryText = query ? `?${buildQuery(query)}` : "";
    const response = await fetch(`${this.baseUrl}/${path}${queryText}`, {
      method,
      headers: {
        ...this.headers,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase request failed (${method} ${path}): ${response.status} ${text}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async getEnabledServiceConfigs() {
    const rows = await this.request("service_health_config", {
      query: {
        select: "service_id,health_check_url,method,expected_status_code,timeout_ms,check_interval_seconds,enabled",
        enabled: "eq.true",
        order: "service_id.asc",
      },
    });

    return Array.isArray(rows) ? rows : [];
  }

  async insertHeartbeat(payload) {
    const rows = await this.request("service_heartbeats", {
      method: "POST",
      body: [payload],
    });

    return Array.isArray(rows) ? rows[0] : rows;
  }

  async getRecentHeartbeats(serviceId, limit) {
    const checkedAtRows = await this.tryGetRecentHeartbeats(serviceId, limit, "checked_at");
    if (checkedAtRows !== null) {
      return checkedAtRows;
    }

    const createdAtRows = await this.tryGetRecentHeartbeats(serviceId, limit, "created_at");
    if (createdAtRows !== null) {
      return createdAtRows;
    }

    return [];
  }

  async tryGetRecentHeartbeats(serviceId, limit, orderColumn) {
    try {
      const rows = await this.request("service_heartbeats", {
        query: {
          select: "id,service_id,is_healthy,response_time_ms,http_status,error_message,checked_at",
          service_id: `eq.${serviceId}`,
          order: `${orderColumn}.desc`,
          limit,
        },
      });

      return Array.isArray(rows) ? rows : [];
    } catch {
      return null;
    }
  }

  async getOpenIncidents() {
    const rows = await this.request("incidents", {
      query: {
        select: "id,title,status,started_at,resolved_at,services_affected,updated_at",
        status: "not.eq.resolved",
        order: "started_at.desc",
      },
    });

    return Array.isArray(rows) ? rows : [];
  }

  async createIncident(payload) {
    const rows = await this.request("incidents", {
      method: "POST",
      body: [payload],
    });

    return Array.isArray(rows) ? rows[0] : rows;
  }

  async updateIncident(incidentId, patch) {
    const rows = await this.request("incidents", {
      method: "PATCH",
      query: {
        id: `eq.${incidentId}`,
      },
      body: patch,
    });

    return Array.isArray(rows) ? rows[0] : rows;
  }

  async addIncidentUpdate(payload) {
    await this.request("incident_updates", {
      method: "POST",
      body: [payload],
    });
  }

  async updateService(serviceId, patch) {
    await this.request("services", {
      method: "PATCH",
      query: {
        id: `eq.${serviceId}`,
      },
      body: patch,
    });
  }

  async getServices() {
    const rows = await this.request("services", {
      query: {
        select: "id,name,status",
        order: "name.asc",
      },
    });

    return Array.isArray(rows) ? rows : [];
  }

  async getHeartbeatsForWindow(serviceId, startIso, endIso) {
    const checkedAtRows = await this.tryGetHeartbeatsByTimestamp(
      serviceId,
      startIso,
      endIso,
      "checked_at"
    );

    if (checkedAtRows !== null) {
      return checkedAtRows;
    }

    logger.warn("checked_at column unavailable, falling back to created_at for aggregation", { serviceId });

    const createdAtRows = await this.tryGetHeartbeatsByTimestamp(
      serviceId,
      startIso,
      endIso,
      "created_at"
    );

    return createdAtRows || [];
  }

  async tryGetHeartbeatsByTimestamp(serviceId, startIso, endIso, columnName) {
    try {
      const rows = await this.request("service_heartbeats", {
        query: {
          select: "is_healthy,response_time_ms",
          service_id: `eq.${serviceId}`,
          and: `(${columnName}.gte.${startIso},${columnName}.lt.${endIso})`,
          order: `${columnName}.asc`,
        },
      });

      return Array.isArray(rows) ? rows : [];
    } catch {
      return null;
    }
  }

  async upsertDailyAggregate(payload) {
    await this.request("service_uptime_daily", {
      method: "POST",
      query: {
        on_conflict: "service_uuid,date",
      },
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: [payload],
    });
  }
}
