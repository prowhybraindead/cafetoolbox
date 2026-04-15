import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@cafetoolbox/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
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
      sub: user.id,
      email: user.email ?? "",
      tool: "convertube",
      aud: "convertube",
      iat: now,
      exp: now + ttl,
    },
    sharedSecret
  );

  const baseUrl = apiBaseUrl.replace(/\/+$/, "");
  return { baseUrl, accessToken };
}

export function parseSafeJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}
