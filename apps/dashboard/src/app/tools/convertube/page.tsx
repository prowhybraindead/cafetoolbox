"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type OutputFormat = "video" | "audio";
type CardStatus = "loading" | "ready" | "info-error" | "queued" | "downloading" | "done" | "error";

type VideoFormat = {
  id: string;
  label: string;
  height: number;
};

type DownloadCard = {
  id: string;
  url: string;
  title?: string;
  thumbnail?: string;
  duration?: number | null;
  uploader?: string;
  formats?: VideoFormat[];
  selectedFormatId?: string | null;
  jobId?: string;
  filename?: string;
  queuePosition?: number | null;
  error?: string;
  status: CardStatus;
};

function parseUrls(input: string): string[] {
  const parts = input
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter((value) => value.startsWith("http://") || value.startsWith("https://"));
  return [...new Set(parts)];
}

function formatDuration(duration?: number | null): string {
  if (!duration || duration <= 0) return "";
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function mapFriendlyError(message: string): string {
  if (message.includes("Unsupported URL")) return "Link chưa được hỗ trợ.";
  if (message.includes("Video unavailable")) return "Video không khả dụng hoặc đã bị ẩn.";
  if (message.includes("Private video")) return "Video đang để riêng tư.";
  if (message.includes("HTTP Error 403")) return "Nguồn chặn truy cập (403).";
  if (message.includes("HTTP Error 404")) return "Không tìm thấy nội dung (404).";
  if (message.includes("copyright")) return "Nội dung bị chặn do bản quyền.";
  if (message.includes("geo")) return "Nội dung không khả dụng ở khu vực hiện tại.";
  if (message.includes("Timed out") || message.includes("timed out")) return "Yêu cầu bị timeout. Thử lại nhé.";
  return message.length > 140 ? `${message.slice(0, 140)}...` : message;
}

function randomId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ConvertubeDashboardPage() {
  const [format, setFormat] = useState<OutputFormat>("video");
  const [rawUrls, setRawUrls] = useState("");
  const [cards, setCards] = useState<DownloadCard[]>([]);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const canFetch = useMemo(() => parseUrls(rawUrls).length > 0 && !isFetchingInfo, [rawUrls, isFetchingInfo]);

  async function fetchVideoInfo() {
    const urls = parseUrls(rawUrls);
    if (urls.length === 0) {
      return;
    }

    setIsFetchingInfo(true);
    setCards([]);

    const nextCards: DownloadCard[] = urls.map((url) => ({
      id: randomId(),
      url,
      status: "loading",
    }));
    setCards(nextCards);

    for (const current of nextCards) {
      try {
        const response = await fetch("/api/tools/convertube/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: current.url }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          title?: string;
          thumbnail?: string;
          duration?: number;
          uploader?: string;
          formats?: VideoFormat[];
          error?: string;
        };

        if (!response.ok || payload.error) {
          setCards((prev) =>
            prev.map((card) =>
              card.id === current.id
                ? {
                    ...card,
                    status: "info-error",
                    error: mapFriendlyError(payload.error || "Không thể đọc thông tin video."),
                  }
                : card
            )
          );
          continue;
        }

        setCards((prev) =>
          prev.map((card) =>
            card.id === current.id
              ? {
                  ...card,
                  status: "ready",
                  title: payload.title || "Không có tiêu đề",
                  thumbnail: payload.thumbnail || "",
                  duration: payload.duration ?? null,
                  uploader: payload.uploader || "",
                  formats: payload.formats || [],
                  selectedFormatId: payload.formats?.[0]?.id ?? null,
                }
              : card
          )
        );
      } catch {
        setCards((prev) =>
          prev.map((card) =>
            card.id === current.id
              ? {
                  ...card,
                  status: "info-error",
                  error: "Mất kết nối trong lúc lấy thông tin video.",
                }
              : card
          )
        );
      }
    }

    setIsFetchingInfo(false);
  }

  async function pollJob(cardId: string, jobId: string) {
    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/tools/convertube/status/${encodeURIComponent(jobId)}`);
        const payload = (await response.json().catch(() => ({}))) as {
          status?: CardStatus;
          error?: string;
          filename?: string;
          queue_position?: number | null;
        };

        if (!response.ok || !payload.status) {
          window.clearInterval(intervalId);
          setCards((prev) =>
            prev.map((card) =>
              card.id === cardId
                ? {
                    ...card,
                    status: "error",
                    error: mapFriendlyError(payload.error || "Không thể đọc trạng thái job."),
                  }
                : card
            )
          );
          return;
        }

        if (payload.status === "done") {
          window.clearInterval(intervalId);
          setCards((prev) =>
            prev.map((card) =>
              card.id === cardId
                ? {
                    ...card,
                    status: "done",
                    filename: payload.filename,
                    queuePosition: null,
                  }
                : card
            )
          );
          return;
        }

        if (payload.status === "error") {
          window.clearInterval(intervalId);
          setCards((prev) =>
            prev.map((card) =>
              card.id === cardId
                ? {
                    ...card,
                    status: "error",
                    error: mapFriendlyError(payload.error || "Download thất bại."),
                    queuePosition: null,
                  }
                : card
            )
          );
          return;
        }

        if (payload.status === "queued") {
          setCards((prev) =>
            prev.map((card) =>
              card.id === cardId
                ? {
                    ...card,
                    status: "queued",
                    queuePosition: payload.queue_position ?? null,
                  }
                : card
            )
          );
          return;
        }

        if (payload.status === "downloading") {
          setCards((prev) =>
            prev.map((card) =>
              card.id === cardId
                ? {
                    ...card,
                    status: "downloading",
                    queuePosition: null,
                  }
                : card
            )
          );
        }
      } catch {
        window.clearInterval(intervalId);
        setCards((prev) =>
          prev.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  status: "error",
                  error: "Mất kết nối khi theo dõi tiến trình.",
                }
              : card
          )
        );
      }
    }, 1000);
  }

  async function startDownload(cardId: string) {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;

    setCards((prev) =>
      prev.map((item) =>
        item.id === cardId
          ? {
              ...item,
              status: "downloading",
              error: "",
            }
          : item
      )
    );

    try {
      const response = await fetch("/api/tools/convertube/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: card.url,
          format,
          format_id: format === "video" ? card.selectedFormatId || null : null,
          title: card.title || "",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        job_id?: string;
        status?: CardStatus;
        queue_position?: number | null;
        error?: string;
      };

      if (!response.ok || !payload.job_id) {
        setCards((prev) =>
          prev.map((item) =>
            item.id === cardId
              ? {
                  ...item,
                  status: "error",
                  error: mapFriendlyError(payload.error || "Không thể bắt đầu download."),
                }
              : item
          )
        );
        return;
      }

      setCards((prev) =>
        prev.map((item) =>
          item.id === cardId
            ? {
                ...item,
                jobId: payload.job_id,
                status: payload.status === "queued" ? "queued" : "downloading",
                queuePosition: payload.queue_position ?? null,
              }
            : item
        )
      );

      await pollJob(cardId, payload.job_id);
    } catch {
      setCards((prev) =>
        prev.map((item) =>
          item.id === cardId
            ? {
                ...item,
                status: "error",
                error: "Không thể kết nối tới API dashboard.",
              }
            : item
        )
      );
    }
  }

  async function downloadAllReady() {
    setIsDownloadingAll(true);
    const readyCards = cards.filter((card) => card.status === "ready");
    for (const card of readyCards) {
      // eslint-disable-next-line no-await-in-loop
      await startDownload(card.id);
    }
    setIsDownloadingAll(false);
  }

  function saveFile(card: DownloadCard) {
    if (!card.jobId) return;
    const link = document.createElement("a");
    link.href = `/api/tools/convertube/file/${encodeURIComponent(card.jobId)}`;
    link.download = card.filename || "";
    link.click();
  }

  const hasMoreThanOneReady = cards.filter((card) => card.status === "ready").length > 1;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-charcoal mb-2">Convertube</h1>
        <p className="text-sm text-charcoalMuted leading-relaxed">
          Dán link YouTube, TikTok, Instagram... rồi tải trực tiếp trong dashboard.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="iconify text-charcoalMuted" data-icon="lucide:download-cloud" data-width="18" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-charcoalMuted">Input</h2>
        <div className="flex-1 h-px bg-borderMain ml-4" />
      </div>

      <section className="bg-white border border-borderMain rounded-xl p-6 mb-6">
        <label className="block text-sm font-medium text-charcoal mb-2" htmlFor="convertube-urls">
          Danh sách URL
        </label>
        <textarea
          id="convertube-urls"
          value={rawUrls}
          onChange={(event) => setRawUrls(event.target.value)}
          rows={4}
          placeholder="Mỗi link cách nhau bằng dấu cách, dấu phẩy hoặc xuống dòng"
          className="w-full px-4 py-3 border border-borderMain rounded-lg bg-white text-charcoal placeholder:text-charcoalMuted focus:outline-none focus:ring-1 focus:ring-neon focus:border-neon"
        />
        <p className="text-xs text-charcoalMuted mt-2">Hỗ trợ nhập nhiều link một lần.</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex border border-borderMain rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setFormat("video")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                format === "video" ? "bg-charcoal text-white" : "bg-white text-charcoal hover:bg-borderLight"
              }`}
            >
              MP4
            </button>
            <button
              type="button"
              onClick={() => setFormat("audio")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                format === "audio" ? "bg-charcoal text-white" : "bg-white text-charcoal hover:bg-borderLight"
              }`}
            >
              MP3
            </button>
          </div>

          <button
            type="button"
            disabled={!canFetch}
            onClick={fetchVideoInfo}
            className="bg-charcoal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-charcoalLight transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingInfo ? "Đang đọc thông tin..." : "Lấy thông tin video"}
          </button>
        </div>
      </section>

      {hasMoreThanOneReady ? (
        <div className="mb-4">
          <button
            type="button"
            onClick={downloadAllReady}
            disabled={isDownloadingAll}
            className="bg-charcoal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-charcoalLight transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloadingAll ? "Đang đưa vào queue..." : "Download tất cả link sẵn sàng"}
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-3 mb-4">
        <span className="iconify text-charcoalMuted" data-icon="lucide:list-video" data-width="18" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-charcoalMuted">Kết quả</h2>
        <div className="flex-1 h-px bg-borderMain ml-4" />
      </div>

      <div className="space-y-3">
        {cards.map((card) => {
          const isAudio = format === "audio";
          const statusText =
            card.status === "loading"
              ? "Đang tải thông tin..."
              : card.status === "ready"
              ? "Sẵn sàng tải"
              : card.status === "queued"
              ? `Đang chờ trong queue${card.queuePosition ? ` (#${card.queuePosition})` : ""}`
              : card.status === "downloading"
              ? "Đang tải..."
              : card.status === "done"
              ? "Đã xong"
              : "Lỗi";

          return (
            <article
              key={card.id}
              className={`bg-white border rounded-xl p-4 ${
                card.status === "error" || card.status === "info-error"
                  ? "border-red-200 bg-red-50/40"
                  : "border-borderMain"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="w-full md:w-48 shrink-0">
                  {isAudio ? (
                    <div className="h-28 rounded-lg border border-borderMain bg-neonGhost flex items-center justify-center text-charcoal font-semibold">
                      MP3
                    </div>
                  ) : card.thumbnail ? (
                    <Image
                      src={card.thumbnail}
                      alt={card.title || "Thumbnail"}
                      width={384}
                      height={216}
                      unoptimized
                      className="h-28 w-full object-cover rounded-lg border border-borderMain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-28 rounded-lg border border-borderMain bg-borderLight flex items-center justify-center text-charcoalMuted text-sm">
                      Không có thumbnail
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-charcoal truncate">{card.title || card.url}</h2>
                  <p className="text-xs text-charcoalMuted mt-1 break-all">{card.url}</p>
                  <p className="text-xs text-charcoalMuted mt-1">
                    {card.uploader || "Không rõ kênh"}
                    {card.duration ? ` | ${formatDuration(card.duration)}` : ""}
                  </p>

                  {card.status === "ready" && !isAudio && card.formats && card.formats.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.formats.map((videoFormat) => (
                        <button
                          key={videoFormat.id}
                          type="button"
                          onClick={() =>
                            setCards((prev) =>
                              prev.map((item) =>
                                item.id === card.id ? { ...item, selectedFormatId: videoFormat.id } : item
                              )
                            )
                          }
                          className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                            card.selectedFormatId === videoFormat.id
                              ? "border-charcoal bg-charcoal text-white"
                              : "border-borderMain text-charcoal hover:bg-borderLight"
                          }`}
                        >
                          {videoFormat.label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(card.status === "ready" || card.status === "error") && (
                      <button
                        type="button"
                        onClick={() => startDownload(card.id)}
                        className="bg-charcoal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoalLight transition-colors"
                      >
                        {card.status === "error" ? "Thử lại" : "Download"}
                      </button>
                    )}

                    {card.status === "done" && (
                      <button
                        type="button"
                        onClick={() => saveFile(card)}
                        className="bg-neon text-charcoal px-4 py-2 rounded-lg text-sm font-medium hover:brightness-95 transition"
                      >
                        Lưu file
                      </button>
                    )}

                    <span
                      className={`font-mono text-[11px] ${
                        card.status === "error" || card.status === "info-error"
                          ? "text-red-600"
                          : card.status === "done"
                          ? "text-neon font-medium"
                          : "text-charcoalMuted"
                      }`}
                    >
                      {statusText}
                    </span>
                  </div>

                  {(card.status === "error" || card.status === "info-error") && card.error ? (
                    <p className="text-sm text-red-600 mt-2">{card.error}</p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
