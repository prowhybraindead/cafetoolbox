import { logger } from "./logger.js";

function truncate(text, max) {
  if (!text) return null;
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Webhook request failed (${response.status}): ${body}`);
  }
}

export class IncidentNotifier {
  constructor({ discordWebhookUrl, genericWebhookUrl }) {
    this.discordWebhookUrl = discordWebhookUrl;
    this.genericWebhookUrl = genericWebhookUrl;
  }

  async notify(eventType, context) {
    const jobs = [];

    if (this.discordWebhookUrl) {
      jobs.push(
        postJson(this.discordWebhookUrl, this.toDiscordPayload(eventType, context)).catch((error) => {
          logger.error("Discord notification failed", { error: error.message, eventType });
        })
      );
    }

    if (this.genericWebhookUrl) {
      jobs.push(
        postJson(this.genericWebhookUrl, {
          event_type: eventType,
          occurred_at: new Date().toISOString(),
          context,
        }).catch((error) => {
          logger.error("Generic webhook notification failed", { error: error.message, eventType });
        })
      );
    }

    if (jobs.length > 0) {
      await Promise.allSettled(jobs);
    }
  }

  toDiscordPayload(eventType, context) {
    const titleMap = {
      incident_created: "Incident Created",
      incident_updated: "Incident Updated",
      incident_resolved: "Incident Resolved",
      worker_down: "Monitoring Worker DOWN",
    };

    const colorMap = {
      incident_created: 0xff9800,
      incident_updated: 0xffc107,
      incident_resolved: 0x4caf50,
      worker_down: 0xf44336,
    };

    const fields =
      eventType === "worker_down"
        ? [
            {
              name: "Last Seen At",
              value: context.last_seen_at || "unknown",
              inline: true,
            },
            {
              name: "Delay (seconds)",
              value: context.delay_seconds != null ? String(context.delay_seconds) : "unknown",
              inline: true,
            },
          ]
        : [
            {
              name: "Service",
              value: String(context.service?.name || context.service?.id || "unknown"),
              inline: true,
            },
            {
              name: "Incident Status",
              value: String(context.incident?.status || "n/a"),
              inline: true,
            },
            {
              name: "Consecutive Failures",
              value: String(context.failureStreak ?? 0),
              inline: true,
            },
          ];

    return {
      embeds: [
        {
          title: titleMap[eventType] || "Monitoring Event",
          color: colorMap[eventType] || 0x607d8b,
          description: truncate(context.message || "No description provided", 400),
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
