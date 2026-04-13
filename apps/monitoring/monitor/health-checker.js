import { logger } from "./logger.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptCheck(config) {
  const { url, method, timeoutMs, expectedStatusCode } = config;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "User-Agent": "CafeToolbox-Monitoring/2.0",
      },
    });

    const duration = Date.now() - startedAt;
    const healthyByRange = response.status >= 200 && response.status < 400;
    const healthyByExpected =
      typeof expectedStatusCode === "number" ? response.status === expectedStatusCode : true;
    const isHealthy = healthyByRange && healthyByExpected;

    return {
      isHealthy,
      responseTimeMs: duration,
      httpStatus: response.status,
      errorMessage: isHealthy ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    const duration = Date.now() - startedAt;
    const isAbort = error instanceof Error && error.name === "AbortError";

    return {
      isHealthy: false,
      responseTimeMs: duration,
      httpStatus: null,
      errorMessage: isAbort ? `Timeout after ${timeoutMs}ms` : error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runHealthCheck(config, retryConfig) {
  const maxRetries = Math.max(0, retryConfig.maxRetries ?? 0);
  const retryDelayMs = retryConfig.retryDelayMs;
  let attempts = 0;

  while (attempts <= maxRetries) {
    const result = await attemptCheck(config);
    if (result.isHealthy) {
      return {
        ...result,
        attempts: attempts + 1,
      };
    }

    if (attempts === maxRetries) {
      return {
        ...result,
        attempts: attempts + 1,
      };
    }

    attempts += 1;
    logger.warn("Health check failed, retrying once", {
      serviceId: config.serviceId,
      url: config.url,
      reason: result.errorMessage,
    });
    await sleep(retryDelayMs);
  }

  return {
    isHealthy: false,
    responseTimeMs: null,
    httpStatus: null,
    errorMessage: "Unexpected retry state",
    attempts: attempts + 1,
  };
}
