import { logger } from "./logger.mjs";

function countConsecutive(heartbeats, targetHealthy) {
  let streak = 0;

  for (const beat of heartbeats) {
    if (beat.is_healthy === targetHealthy) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

function computeServiceStatus(isHealthy, failureStreak, thresholds) {
  if (isHealthy) {
    return "operational";
  }

  if (failureStreak >= thresholds.incidentMajorThreshold) {
    return "major_outage";
  }

  if (failureStreak >= thresholds.incidentIdentifiedThreshold) {
    return "partial_outage";
  }

  return "degraded";
}

function computeIncidentStatus(failureStreak, thresholds) {
  if (failureStreak >= thresholds.incidentIdentifiedThreshold) {
    return "identified";
  }

  return "investigating";
}

function findIncidentForService(openIncidents, serviceId) {
  return openIncidents.find((incident) =>
    Array.isArray(incident.services_affected) && incident.services_affected.includes(serviceId)
  );
}

export class IncidentEngine {
  constructor({ db, notifier, thresholds }) {
    this.db = db;
    this.notifier = notifier;
    this.thresholds = thresholds;
  }

  async processHeartbeat(service, recentHeartbeats) {
    if (!recentHeartbeats.length) {
      return;
    }

    const latest = recentHeartbeats[0];
    const failureStreak = countConsecutive(recentHeartbeats, false);
    const successStreak = countConsecutive(recentHeartbeats, true);

    const serviceStatus = computeServiceStatus(latest.is_healthy, failureStreak, this.thresholds);
    await this.db.updateService(service.id, { status: serviceStatus });

    const openIncidents = await this.db.getOpenIncidents();
    const currentIncident = findIncidentForService(openIncidents, service.id);

    if (!latest.is_healthy) {
      await this.handleFailure(service, currentIncident, failureStreak, latest);
      return;
    }

    await this.handleRecovery(service, currentIncident, successStreak, latest);
  }

  async handleFailure(service, currentIncident, failureStreak, latest) {
    if (!currentIncident) {
      if (failureStreak < this.thresholds.incidentFailureThreshold) {
        return;
      }

      const incident = await this.db.createIncident({
        title: `[AUTO] ${service.name} is experiencing failures`,
        status: "investigating",
        started_at: new Date().toISOString(),
        services_affected: [service.id],
      });

      await this.db.addIncidentUpdate({
        incident_id: incident.id,
        status: "investigating",
        body: `Automatic trigger after ${failureStreak} consecutive failed checks. Last error: ${latest.error_message || "unknown"}`,
      });

      logger.warn("Incident auto-created", { serviceId: service.id, incidentId: incident.id, failureStreak });

      void this.notifier.notify("incident_created", {
        message: `Incident opened for ${service.name} after ${failureStreak} consecutive failures.`,
        service,
        incident,
        failureStreak,
      });
      return;
    }

    const nextStatus = computeIncidentStatus(failureStreak, this.thresholds);
    if (currentIncident.status === nextStatus) {
      return;
    }

    const updated = await this.db.updateIncident(currentIncident.id, {
      status: nextStatus,
    });

    await this.db.addIncidentUpdate({
      incident_id: currentIncident.id,
      status: nextStatus,
      body: `Automatic escalation after ${failureStreak} consecutive failed checks. Current state: ${nextStatus}.`,
    });

    logger.warn("Incident auto-escalated", {
      serviceId: service.id,
      incidentId: currentIncident.id,
      failureStreak,
      nextStatus,
    });

    void this.notifier.notify("incident_updated", {
      message: `Incident for ${service.name} escalated to ${nextStatus}.`,
      service,
      incident: updated || currentIncident,
      failureStreak,
    });
  }

  async handleRecovery(service, currentIncident, successStreak) {
    if (!currentIncident) {
      return;
    }

    if (successStreak < this.thresholds.incidentRecoveryThreshold) {
      return;
    }

    const resolvedAt = new Date().toISOString();
    const resolved = await this.db.updateIncident(currentIncident.id, {
      status: "resolved",
      resolved_at: resolvedAt,
    });

    await this.db.addIncidentUpdate({
      incident_id: currentIncident.id,
      status: "resolved",
      body: `Automatic recovery after ${successStreak} consecutive healthy checks.`,
    });

    logger.info("Incident auto-resolved", {
      serviceId: service.id,
      incidentId: currentIncident.id,
      successStreak,
    });

    void this.notifier.notify("incident_resolved", {
      message: `Incident for ${service.name} resolved after ${successStreak} healthy checks.`,
      service,
      incident: resolved || currentIncident,
      failureStreak: 0,
    });
  }
}
