import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getLaunchableToolById, requireDashboardUser } from "../_lib";

const DEFAULT_HANDOFF_PATH_BY_SLUG: Record<string, string> = {
  convertube: "/auth/launch",
};

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

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isTruthy(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value || "").trim().toLowerCase());
}

function parseHandoffPathMap(raw: string | undefined): Record<string, string> {
  const output: Record<string, string> = {};
  if (!raw) {
    return output;
  }

  for (const segment of raw.split(",")) {
    const item = segment.trim();
    if (!item) {
      continue;
    }

    const separatorIndex = item.indexOf("=");
    if (separatorIndex <= 0 || separatorIndex === item.length - 1) {
      continue;
    }

    const slug = item.slice(0, separatorIndex).trim().toLowerCase();
    const handoffPath = item.slice(separatorIndex + 1).trim();
    if (!slug || !handoffPath) {
      continue;
    }

    output[slug] = handoffPath;
  }

  return output;
}

function normalizeHandoffPath(value: string | undefined): string | null {
  const handoffPath = (value || "").trim();
  if (!handoffPath) {
    return null;
  }

  if (/^https?:\/\//i.test(handoffPath)) {
    return handoffPath;
  }

  return handoffPath.startsWith("/") ? handoffPath : `/${handoffPath}`;
}

function resolveHandoffPathForSlug(slug: string): string | null {
  const slugKey = slug.trim().toLowerCase();
  const configuredMap = parseHandoffPathMap(process.env.DASHBOARD_TOOL_HANDOFF_PATHS);
  const configuredValue = configuredMap[slugKey];
  if (configuredValue) {
    return normalizeHandoffPath(configuredValue);
  }

  const defaultBySlug = DEFAULT_HANDOFF_PATH_BY_SLUG[slugKey];
  if (defaultBySlug) {
    return normalizeHandoffPath(defaultBySlug);
  }

  return normalizeHandoffPath(process.env.DASHBOARD_TOOL_DEFAULT_HANDOFF_PATH);
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const toolId = requestUrl.searchParams.get("toolId");

    if (!toolId) {
      return NextResponse.json({ error: "Missing toolId" }, { status: 400 });
    }

    const session = await requireDashboardUser({
      loginRedirectUrl: new URL("/login", requestUrl),
    });
    if ("error" in session) {
      return session.error;
    }

    const tool = await getLaunchableToolById(session.supabase, toolId);
    if ("error" in tool) {
      return tool.error;
    }

    if (tool.pathType === "internal") {
      return NextResponse.redirect(new URL(tool.path, requestUrl));
    }

    const sharedSecret = process.env.DASHBOARD_TOOL_SHARED_SECRET;
    if (!sharedSecret) {
      return NextResponse.json(
        { error: "Missing DASHBOARD_TOOL_SHARED_SECRET" },
        { status: 500 }
      );
    }

    const ttl = Math.max(60, Number.parseInt(process.env.DASHBOARD_TOOL_TOKEN_TTL_SECONDS || "300", 10) || 300);
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

    const target = new URL(tool.path);
    const handoffPath = resolveHandoffPathForSlug(tool.slug);
    if (!handoffPath) {
      if (isTruthy(process.env.DASHBOARD_TOOL_ALLOW_LEGACY_QUERY_TOKEN)) {
        target.searchParams.set("access_token", accessToken);
        return NextResponse.redirect(target);
      }

      return NextResponse.json(
        {
          error: "External tool launch is missing handoff configuration",
          tool: tool.slug,
          hint: "Set DASHBOARD_TOOL_HANDOFF_PATHS (example: convertube=/auth/launch) or DASHBOARD_TOOL_DEFAULT_HANDOFF_PATH.",
        },
        { status: 412 }
      );
    }

    const handoffUrl = new URL(handoffPath, target);
    const escapedAction = escapeHtmlAttribute(handoffUrl.toString());
    const escapedToken = escapeHtmlAttribute(accessToken);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="referrer" content="no-referrer" />
    <title>Launching tool...</title>
  </head>
  <body>
    <form id="tool-launch-form" method="POST" action="${escapedAction}">
      <input type="hidden" name="access_token" value="${escapedToken}" />
      <noscript>
        <p>JavaScript is required to continue. Click below to launch.</p>
        <button type="submit">Launch tool</button>
      </noscript>
    </form>
    <script>
      document.getElementById("tool-launch-form")?.submit();
    </script>
  </body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Launch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
