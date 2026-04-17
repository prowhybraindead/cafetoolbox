import { NextResponse } from "next/server";
import { getToolAccessContext, parseSafeJson } from "../../_lib";

export async function GET(_: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const accessContext = await getToolAccessContext();
    if ("error" in accessContext) {
      return accessContext.error;
    }

    const { jobId } = await context.params;
    const target = new URL(`${accessContext.baseUrl}/api/status/${encodeURIComponent(jobId)}`);
    target.searchParams.set("access_token", accessContext.accessToken);

    const upstream = await fetch(target, {
      method: "GET",
      cache: "no-store",
    });

    const raw = await upstream.text();
    const parsed = parseSafeJson(raw);

    if (parsed) {
      return NextResponse.json(parsed, { status: upstream.status });
    }

    return NextResponse.json(
      { error: "Phản hồi không hợp lệ từ Convertube", raw: raw.slice(0, 500) },
      { status: 502 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể gọi Convertube";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
