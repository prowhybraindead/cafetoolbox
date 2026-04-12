import { logger } from "./logger.js";

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
  if (failureStreak >= thresholds.incidentMajorThreshold) {
    return "major_outage";
  }

  if (failureStreak >= thresholds.incidentIdentifiedThreshold) {
    return "identified";
  }

  return "investigating";
}

export class IncidentEngine {
  constructor({ db, notifier, thresholds }) {
    this.db = db;
    this.notifier = notifier;
    this.thresholds = thresholds;
  }

  async processHeartbeat(service, recentHeartbeats, cycleState) {
    if (!recentHeartbeats.length) {
      return;
    }

    const latest = recentHeartbeats[0];
    const failureStreak = countConsecutive(recentHeartbeats, false);
    const successStreak = countConsecutive(recentHeartbeats, true);

    const serviceStatus = computeServiceStatus(latest.is_healthy, failureStreak, this.thresholds);

    if (service.status !== serviceStatus) {
      await this.db.updateService(service.id, { status: serviceStatus });
      service.status = serviceStatus;
    }

    const currentIncident = cycleState.openIncidentByService.get(service.id) || null;

    if (!latest.is_healthy) {
      await this.handleFailure(service, currentIncident, failureStreak, latest, cycleState);
      return;
    }

    await this.handleRecovery(service, currentIncident, successStreak, cycleState);
  }

  async handleFailure(service, currentIncident, failureStreak, latest, cycleState) {
    if (!currentIncident) {
      if (failureStreak < this.thresholds.incidentFailureThreshold) {
        return;
      }

      const latestResolved = await this.db.getLatestResolvedIncidentForService(service.id);
      if (latestResolved?.resolved_at) {
        const elapsedSeconds =
          (Date.now() - new Date(latestResolved.resolved_at).getTime()) / 1000;
        if (elapsedSeconds < this.thresholds.incidentCooldownSeconds) {
          logger.warn("Incident creation skipped due to cooldown", {
            serviceId: service.id,
            cooldownSeconds: this.thresholds.incidentCooldownSeconds,
            elapsedSeconds: Number(elapsedSeconds.toFixed(2)),
          });
          return;
        }
      }

      const preExisting = await this.db.getOpenIncidentsForService(service.id);
      if (preExisting.length > 0) {
        cycleState.openIncidentByService.set(service.id, preExisting[0]);
        return;
      }

      const incident = await this.db.createIncident({
        title: `[AUTO] ${service.name} is experiencing failures`,
        status: "investigating",
        started_at: new Date().toISOString(),
        services_affected: [service.id],
      });

      const canonicalIncident = await this.ensureSingleOpenIncident(service.id);
      if (!canonicalIncident || canonicalIncident.id !== incident.id) {
        cycleState.openIncidentByService.set(service.id, canonicalIncident || preExisting[0]);
        return;
      }

      cycleState.openIncidentByService.set(service.id, incident);

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

    const updateResult = await this.applyIncidentStatus(currentIncident.id, nextStatus);
    const appliedStatus = updateResult.status;
    const updated = updateResult.incident;

    await this.db.addIncidentUpdate({
      incident_id: currentIncident.id,
      status: appliedStatus,
      body: `Automatic escalation after ${failureStreak} consecutive failed checks. Current state: ${appliedStatus}.`,
    });

    logger.warn("Incident auto-escalated", {
      serviceId: service.id,
      incidentId: currentIncident.id,
      failureStreak,
      nextStatus: appliedStatus,
    });

    cycleState.openIncidentByService.set(service.id, {
      ...(updated || currentIncident),
      status: appliedStatus,
    });

    void this.notifier.notify("incident_updated", {
      message: `Incident for ${service.name} escalated to ${appliedStatus}.`,
      service,
      incident: updated || currentIncident,
      failureStreak,
    });
  }

  async handleRecovery(service, currentIncident, successStreak, cycleState) {
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

    cycleState.openIncidentByService.delete(service.id);

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

  async ensureSingleOpenIncident(serviceId) {
    const openIncidents = await this.db.getOpenIncidentsForService(serviceId);
    if (openIncidents.length <= 1) {
      return openIncidents[0] || null;
    }

    const [canonical, ...duplicates] = openIncidents;
    const resolvedAt = new Date().toISOString();

    // Resolve extra open incidents immediately to keep one-open-incident invariant.
    for (const duplicate of duplicates) {
      await this.db.updateIncident(duplicate.id, {
        status: "resolved",
        resolved_at: resolvedAt,
      });

      await this.db.addIncidentUpdate({
        incident_id: duplicate.id,
        status: "resolved",
        body: "Auto-resolved duplicate open incident created during race-condition guard.",
      });
    }

    logger.warn("Duplicate open incidents were reconciled", {
      serviceId,
      canonicalIncidentId: canonical.id,
      duplicatesResolved: duplicates.map((item) => item.id),
    });

    return canonical;
  }

  async applyIncidentStatus(incidentId, requestedStatus) {
    try {
      const incident = await this.db.updateIncident(incidentId, {
        status: requestedStatus,
      });

      return {
        status: requestedStatus,
        incident,
      };
    } catch (error) {
      if (requestedStatus !== "major_outage") {
        throw error;
      }

      logger.warn("major_outage incident status unavailable, using identified fallback", {
        incidentId,
      });

      const incident = await this.db.updateIncident(incidentId, {
        status: "identified",
      });

      return {
        status: "identified",
        incident,
      };
    }
  }
}
