import { logger } from "./logger.js";

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
    this.timeoutMs = Number.parseInt(process.env.SUPABASE_HTTP_TIMEOUT_MS || "15000", 10) || 15000;
    this.headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      "User-Agent": "CafeToolbox-Monitoring/2.0",
    };
  }

  async request(path, { method = "GET", query, body, headers = {} } = {}) {
    const queryText = query ? `?${buildQuery(query)}` : "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;

    try {
      response = await fetch(`${this.baseUrl}/${path}${queryText}`, {
        method,
        headers: {
          ...this.headers,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      throw new Error(
        isAbort
          ? `Supabase request timeout (${method} ${path}) after ${this.timeoutMs}ms`
          : `Supabase request failed (${method} ${path}): ${error?.message || error}`
      );
    } finally {
      clearTimeout(timeout);
    }

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

  async getOpenIncidentsForService(serviceId) {
    const rows = await this.request("incidents", {
      query: {
        select: "id,title,status,started_at,resolved_at,services_affected,updated_at",
        status: "not.eq.resolved",
        services_affected: `cs.{${serviceId}}`,
        order: "started_at.asc",
      },
    });

    return Array.isArray(rows) ? rows : [];
  }

  async getLatestResolvedIncidentForService(serviceId) {
    const rows = await this.request("incidents", {
      query: {
        select: "id,resolved_at,started_at",
        status: "eq.resolved",
        services_affected: `cs.{${serviceId}}`,
        order: "resolved_at.desc",
        limit: 1,
      },
    });

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
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

    logger.warn("checked_at unavailable, using created_at for aggregation", { serviceId });

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

  /**
   * Fetch daily uptime rows for a service within a UTC date range.
   * @param {string} serviceId - Service UUID
   * @param {string} startDateStr - UTC date string "YYYY-MM-DD" (inclusive)
   * @param {string} endDateStr   - UTC date string "YYYY-MM-DD" (exclusive)
   * @returns {Promise<Array<{ date: string, uptime_percentage: number|null }>>}
   */
  async getDailyUptimeRows(serviceId, startDateStr, endDateStr) {
    const rows = await this.request("service_uptime_daily", {
      query: {
        select: "date,uptime_percentage",
        service_uuid: `eq.${serviceId}`,
        and: `(date.gte.${startDateStr},date.lt.${endDateStr})`,
        order: "date.asc",
      },
    });

    return Array.isArray(rows) ? rows : [];
  }

  /**
   * Upsert a worker heartbeat row (on_conflict = worker_name).
   * @param {string} workerName
   * @param {string} lastSeenAt - UTC ISO string
   */
  async upsertWorkerHeartbeat(workerName, lastSeenAt) {
    try {
      await this.request("worker_heartbeats", {
        method: "POST",
        query: {
          on_conflict: "worker_name",
        },
        headers: {
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: [
          {
            worker_name: workerName,
            last_seen_at: lastSeenAt,
            status: "healthy",
          },
        ],
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("worker_heartbeats") && msg.includes("404")) {
        return;
      }
      throw error;
    }
  }

  /**
   * Fetch the latest heartbeat record for a named worker.
   * @param {string} workerName
   * @returns {Promise<{ worker_name: string, last_seen_at: string, status: string }|null>}
   */
  async getWorkerHeartbeat(workerName) {
    try {
      const rows = await this.request("worker_heartbeats", {
        query: {
          select: "worker_name,last_seen_at,status",
          worker_name: `eq.${workerName}`,
          limit: 1,
        },
      });

      return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes("worker_heartbeats") || !msg.includes("404")) {
        throw error;
      }

      // Backward-compat fallback for deployments without worker_heartbeats.
      const rows = await this.request("service_heartbeats", {
        query: {
          select: "checked_at",
          order: "checked_at.desc",
          limit: 1,
        },
      });

      if (!Array.isArray(rows) || rows.length === 0 || !rows[0].checked_at) {
        return null;
      }

      return {
        worker_name: workerName,
        last_seen_at: rows[0].checked_at,
        status: "healthy",
      };
    }
  }
}
