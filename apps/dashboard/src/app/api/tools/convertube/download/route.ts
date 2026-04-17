import { NextResponse } from "next/server";
import { getToolAccessContext, parseSafeJson } from "../_lib";

type DownloadPayload = {
  url?: string;
  format?: "video" | "audio";
  format_id?: string | null;
  title?: string;
};

export async function POST(request: Request) {
  try {
    const context = await getToolAccessContext();
    if ("error" in context) {
      return context.error;
    }

    const body = (await request.json()) as DownloadPayload;
    const payload: DownloadPayload = {
      url: body.url ?? "",
      format: body.format === "audio" ? "audio" : "video",
      format_id: body.format_id ?? null,
      title: body.title ?? "",
    };

    const target = new URL(`${context.baseUrl}/api/download`);
    target.searchParams.set("access_token", context.accessToken);

    const upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
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
