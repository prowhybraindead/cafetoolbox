import { createClient } from "@cafetoolbox/supabase/server";
import { NextResponse } from "next/server";

type ToolRow = {
  id: string;
  slug: string;
  path: string | null;
  status: string;
};

type ToolPathType = "internal" | "external";

export type LaunchableTool = {
  id: string;
  slug: string;
  status: string;
  path: string;
  pathType: ToolPathType;
};

type RequireDashboardUserOptions = {
  loginRedirectUrl?: URL;
};

type DashboardSessionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: {
    id: string;
    email?: string | null;
  };
};

export async function requireDashboardUser(
  options: RequireDashboardUserOptions = {}
): Promise<DashboardSessionContext | { error: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (options.loginRedirectUrl) {
      return { error: NextResponse.redirect(options.loginRedirectUrl) };
    }

    return { error: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
  }

  return { supabase, user };
}

function toLaunchableTool(raw: ToolRow): LaunchableTool | { error: NextResponse } {
  if (!(raw.status === "active" || raw.status === "beta")) {
    return { error: NextResponse.json({ error: "Tool is not available" }, { status: 403 }) };
  }

  const path = (raw.path || "").trim();
  if (!path) {
    return { error: NextResponse.json({ error: "Tool path is empty" }, { status: 400 }) };
  }

  if (path.startsWith("/")) {
    return { id: raw.id, slug: raw.slug, status: raw.status, path, pathType: "internal" };
  }

  if (/^https?:\/\//i.test(path)) {
    return { id: raw.id, slug: raw.slug, status: raw.status, path, pathType: "external" };
  }

  return {
    error: NextResponse.json(
      { error: "Tool path must be absolute URL or internal route" },
      { status: 400 }
    ),
  };
}

export async function getLaunchableToolById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  toolId: string
): Promise<LaunchableTool | { error: NextResponse }> {
  const { data: tool, error } = await supabase
    .from("tools")
    .select("id,slug,path,status")
    .eq("id", toolId)
    .single();

  if (error || !tool) {
    return { error: NextResponse.json({ error: "Tool not found" }, { status: 404 }) };
  }

  return toLaunchableTool(tool as ToolRow);
}

export async function getLaunchableToolBySlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string
): Promise<LaunchableTool | { error: NextResponse }> {
  const { data: tool, error } = await supabase
    .from("tools")
    .select("id,slug,path,status")
    .eq("slug", slug)
    .single();

  if (error || !tool) {
    return { error: NextResponse.json({ error: "Tool not found" }, { status: 404 }) };
  }

  return toLaunchableTool(tool as ToolRow);
}
