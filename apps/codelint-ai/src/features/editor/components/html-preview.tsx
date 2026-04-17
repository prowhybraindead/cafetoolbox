'use client';

import React from 'react';
import { useEditorStore } from '@/features/editor/stores';
import { Button } from '@/components/ui/button';
import { RefreshCw, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPPORTED_LANGUAGES = new Set(['html', 'css', 'javascript']);

const escapeClosingTags = (code: string) =>
  code.replace(/<\/script>/gi, '<\\/script>').replace(/<\/style>/gi, '<\\/style>');

const extractFirstHtmlDocument = (code: string) => {
  const trimmed = code.trim();
  const startIndex = trimmed.search(/<!doctype\s+html|<html[\s>]/i);

  if (startIndex === -1) {
    return trimmed;
  }

  const htmlSource = trimmed.slice(startIndex);
  const closingIndex = htmlSource.search(/<\/html\s*>/i);

  if (closingIndex === -1) {
    return htmlSource;
  }

  return htmlSource.slice(0, closingIndex + '</html>'.length);
};

const buildPreviewDoc = (language: string, code: string) => {
  const safeCode = escapeClosingTags(code);

  if (language === 'html') {
    const normalizedHtml = extractFirstHtmlDocument(safeCode);

    if (/<!doctype\s+html|<html[\s>]/i.test(normalizedHtml)) {
      return normalizedHtml;
    }

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
      .preview-shell { min-height: 100vh; padding: 24px; box-sizing: border-box; }
    </style>
  </head>
  <body>
    <div class="preview-shell">${safeCode}</div>
  </body>
</html>`;
  }

  if (language === 'css') {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, system-ui, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(56, 189, 248, 0.15), transparent 30%),
          linear-gradient(180deg, #020617 0%, #0f172a 100%);
        color: #e2e8f0;
        padding: 28px;
        box-sizing: border-box;
      }
      .demo-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      }
      .demo-card,
      .demo-hero,
      .demo-button {
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(15, 23, 42, 0.72);
        backdrop-filter: blur(12px);
        border-radius: 20px;
        padding: 18px;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
      }
      .demo-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        min-height: 48px;
      }
      ${safeCode}
    </style>
  </head>
  <body>
    <section class="demo-hero">
      <h1 style="margin:0 0 8px; font-size: clamp(2rem, 5vw, 4rem); line-height: 1.05;">Design Preview</h1>
      <p style="margin:0 0 18px; color:#94a3b8; max-width: 640px;">CSS live preview workspace. Apply styles to the demo blocks below.</p>
      <div class="demo-grid">
        <div class="demo-card">Card A</div>
        <div class="demo-card">Card B</div>
        <div class="demo-card">Card C</div>
      </div>
      <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:18px;">
        <button class="demo-button">Primary</button>
        <button class="demo-button">Secondary</button>
      </div>
    </section>
  </body>
</html>`;
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, system-ui, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(168, 85, 247, 0.18), transparent 30%),
          linear-gradient(180deg, #020617 0%, #111827 100%);
        color: #e5e7eb;
        padding: 28px;
        box-sizing: border-box;
      }
      .demo-shell {
        max-width: 1200px;
        margin: 0 auto;
      }
      .hero {
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(15, 23, 42, 0.78);
        backdrop-filter: blur(12px);
        border-radius: 24px;
        padding: 24px;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
      }
      .demo-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        margin-top: 20px;
      }
      .demo-card {
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(30, 41, 59, 0.9);
        border-radius: 20px;
        padding: 18px;
      }
      .demo-button {
        border: 0;
        border-radius: 999px;
        padding: 12px 18px;
        background: linear-gradient(135deg, #8b5cf6, #06b6d4);
        color: white;
        font-weight: 600;
      }
      ${safeCode}
    </style>
  </head>
  <body>
    <div class="demo-shell">
      <section class="hero">
        <p style="margin:0 0 8px; color:#94a3b8; text-transform:uppercase; letter-spacing:.2em; font-size:12px;">AI Design Skill</p>
        <h1 style="margin:0; font-size: clamp(2rem, 5vw, 4.5rem); line-height: 1.02;">Build bold interfaces with live preview.</h1>
        <p style="margin:16px 0 0; max-width: 680px; color:#cbd5e1; font-size: 1rem; line-height: 1.7;">The preview uses this scaffold so CSS or JavaScript changes are visible immediately.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:20px;">
          <button class="demo-button">Primary action</button>
          <button class="demo-button" style="background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12);">Secondary action</button>
        </div>
        <div class="demo-grid">
          <div class="demo-card">
            <h3 style="margin:0 0 8px;">Insight panel</h3>
            <p style="margin:0; color:#94a3b8; line-height:1.6;">Layout and spacing respond to your CSS.</p>
          </div>
          <div class="demo-card">
            <h3 style="margin:0 0 8px;">Feature card</h3>
            <p style="margin:0; color:#94a3b8; line-height:1.6;">Try gradients, shadows, and hover states.</p>
          </div>
          <div class="demo-card">
            <h3 style="margin:0 0 8px;">Stats card</h3>
            <p style="margin:0; color:#94a3b8; line-height:1.6;">Your design skill can turn this into a landing page.</p>
          </div>
        </div>
      </section>
    </div>
    <script>
      try {
        ${safeCode}
      } catch (error) {
        console.error(error);
      }
    </script>
  </body>
</html>`;
};

export function HtmlPreview() {
  const { code, language } = useEditorStore();
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const previewDoc = React.useMemo(() => {
    if (!SUPPORTED_LANGUAGES.has(language)) return '';
    return buildPreviewDoc(language, code);
  }, [code, language]);

  React.useEffect(() => {
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    if (!isReady || !iframeRef.current) return;
    iframeRef.current.srcdoc = previewDoc;
  }, [previewDoc, isReady, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  if (!SUPPORTED_LANGUAGES.has(language)) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10 p-6 text-center">
        <Code2 className="mb-3 h-10 w-10 text-muted-foreground/60" />
        <h3 className="text-sm font-semibold">Preview chỉ hỗ trợ HTML, CSS và JavaScript</h3>
        <p className="mt-2 max-w-sm text-xs text-muted-foreground">
          Hãy chuyển ngôn ngữ sang HTML/CSS/JS để xem trang chạy realtime trong preview.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-background">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-3 py-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Live Preview</p>
          <p className="text-xs text-muted-foreground">HTML / CSS / JavaScript sandbox</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
      <div className="flex-1 min-h-0 bg-[#0b1020]">
        <iframe
          ref={iframeRef}
          title="Live HTML preview"
          className={cn('h-full w-full border-0', !isReady && 'opacity-0')}
          sandbox="allow-scripts allow-forms allow-modals"
          srcDoc={previewDoc}
        />
      </div>
    </div>
  );
}
