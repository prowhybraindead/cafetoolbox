import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getLaunchableToolBySlug, requireDashboardUser } from "../_lib";

function toBase64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signPayload(payload: object, secret: string): string {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest();
  return `${encodedPayload}.${toBase64Url(signature)}`;
}

export async function getToolAccessContext() {
  const session = await requireDashboardUser();
  if ("error" in session) {
    return { error: session.error };
  }

  const tool = await getLaunchableToolBySlug(session.supabase, "convertube");
  if ("error" in tool) {
    return { error: tool.error };
  }

  const apiBaseUrl = process.env.CONVERTUBE_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    return {
      error: NextResponse.json(
        { error: "Thiếu biến môi trường CONVERTUBE_API_BASE_URL" },
        { status: 500 }
      ),
    };
  }

  const sharedSecret = process.env.DASHBOARD_TOOL_SHARED_SECRET;
  if (!sharedSecret) {
    return {
      error: NextResponse.json(
        { error: "Thiếu biến môi trường DASHBOARD_TOOL_SHARED_SECRET" },
        { status: 500 }
      ),
    };
  }

  const ttl = Math.max(
    60,
    Number.parseInt(process.env.DASHBOARD_TOOL_TOKEN_TTL_SECONDS || "300", 10) || 300
  );
  const now = Math.floor(Date.now() / 1000);
  const accessToken = signPayload(
    {
      iss: "cafetoolbox-dashboard",
      sub: session.user.id,
      email: session.user.email ?? "",
      tool: tool.slug,
      aud: tool.slug,
      iat: now,
      exp: now + ttl,
    },
    sharedSecret
  );

  const baseUrl = apiBaseUrl.replace(/\/+$/, "");
  return { baseUrl, accessToken };
}

export function buildToolAuthHeaders(accessToken: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

export function parseSafeJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}
