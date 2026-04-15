import { createClient } from "@cafetoolbox/supabase/server";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

type ToolRow = {
  id: string;
  slug: string;
  path: string | null;
  status: string;
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const toolId = url.searchParams.get("toolId");

    if (!toolId) {
      return NextResponse.json({ error: "Missing toolId" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", url));
    }

    const { data: tool, error } = await supabase
      .from("tools")
      .select("id,slug,path,status")
      .eq("id", toolId)
      .single();

    if (error || !tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const typedTool = tool as ToolRow;
    if (!(typedTool.status === "active" || typedTool.status === "beta")) {
      return NextResponse.json({ error: "Tool is not available" }, { status: 403 });
    }

    const path = (typedTool.path || "").trim();
    if (!path) {
      return NextResponse.json({ error: "Tool path is empty" }, { status: 400 });
    }

    // Internal tool path: preserve existing dashboard behavior.
    if (path.startsWith("/")) {
      return NextResponse.redirect(new URL(path, url));
    }

    if (!/^https?:\/\//i.test(path)) {
      return NextResponse.json({ error: "Tool path must be absolute URL or internal route" }, { status: 400 });
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
        sub: user.id,
        email: user.email ?? "",
        tool: typedTool.slug,
        aud: typedTool.slug,
        iat: now,
        exp: now + ttl,
      },
      sharedSecret
    );

    const target = new URL(path);
    target.searchParams.set("access_token", accessToken);
    return NextResponse.redirect(target);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Launch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
