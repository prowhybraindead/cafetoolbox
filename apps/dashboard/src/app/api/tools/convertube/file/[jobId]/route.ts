import { NextResponse } from "next/server";
import { getToolAccessContext, parseSafeJson } from "../../_lib";

export async function GET(_: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const accessContext = await getToolAccessContext();
    if ("error" in accessContext) {
      return accessContext.error;
    }

    const { jobId } = await context.params;
    const target = new URL(`${accessContext.baseUrl}/api/file/${encodeURIComponent(jobId)}`);
    target.searchParams.set("access_token", accessContext.accessToken);

    const upstream = await fetch(target, {
      method: "GET",
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "";

    if (!upstream.ok && contentType.includes("application/json")) {
      const raw = await upstream.text();
      const parsed = parseSafeJson(raw);
      return NextResponse.json(parsed ?? { error: "Không thể tải file" }, { status: upstream.status });
    }

    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text();
      return NextResponse.json(
        { error: "Không thể tải file từ Convertube", raw: raw.slice(0, 500) },
        { status: upstream.status || 502 }
      );
    }

    const headers = new Headers();
    const contentDisposition = upstream.headers.get("content-disposition");
    const contentLength = upstream.headers.get("content-length");

    headers.set("content-type", contentType || "application/octet-stream");
    headers.set("cache-control", "no-store");
    if (contentDisposition) {
      headers.set("content-disposition", contentDisposition);
    }
    if (contentLength) {
      headers.set("content-length", contentLength);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể gọi Convertube";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
