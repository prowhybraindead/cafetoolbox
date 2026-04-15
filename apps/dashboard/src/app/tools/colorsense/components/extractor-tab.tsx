'use client';

import React, { useState, useRef, useCallback } from 'react';
import NextImage from 'next/image';

interface ExtractedColor {
  color: string;
  rgb: [number, number, number];
  percentage: number;
}

function extractColors(canvas: HTMLCanvasElement, numColors: number = 8): ExtractedColor[] {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const colorMap = new Map<string, { count: number; rgb: [number, number, number] }>();

  const step = Math.max(1, Math.floor(data.length / 4 / 50000)); // Sample pixels for performance

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const a = data[i + 3]!;

    if (a < 128) continue; // Skip transparent

    // Quantize to reduce color space
    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${qr},${qg},${qb}`;

    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, { count: 1, rgb: [qr, qg, qb] });
    }
  }

  const totalPixels = Array.from(colorMap.values()).reduce((sum, v) => sum + v.count, 0);
  const sorted = Array.from(colorMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, numColors * 3); // Get more to allow merging

  // Merge similar colors
  const merged: ExtractedColor[] = [];
  for (const [, val] of sorted) {
    const isSimilar = merged.some((m) => {
      const dr = m.rgb[0] - val.rgb[0];
      const dg = m.rgb[1] - val.rgb[1];
      const db = m.rgb[2] - val.rgb[2];
      return Math.sqrt(dr * dr + dg * dg + db * db) < 50;
    });
    if (!isSimilar) {
      const hex = '#' +
        val.rgb.map((c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0')).join('');
      merged.push({
        color: hex,
        rgb: val.rgb,
        percentage: Math.round((val.count / totalPixels) * 100),
      });
      if (merged.length >= numColors) break;
    }
  }

  // Re-normalize percentages
  const totalPct = merged.reduce((s, m) => s + m.percentage, 0);
  if (totalPct > 0) {
    merged.forEach((m) => {
      m.percentage = Math.round((m.percentage / totalPct) * 100);
    });
  }

  return merged;
}

function getPixelColor(canvas: HTMLCanvasElement, x: number, y: number): string {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#000000';
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  return '#' +
    [pixel[0]!, pixel[1]!, pixel[2]!].map((c) => c.toString(16).padStart(2, '0')).join('');
}

export function ExtractorTab({ onCopy }: { onCopy: (text: string) => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<ExtractedColor[]>([]);
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [viewColor, setViewColor] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback((src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Scale down for performance
      const maxDim = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const colors = extractColors(canvas);
        setExtractedColors(colors);
      }
    };
    img.src = src;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.match(/^image\/(jpeg|png|webp)$/)) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImage(dataUrl);
        processImage(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [processImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      const hex = getPixelColor(canvas, x, y);
      setViewColor(hex);
      onCopy(hex);
    },
    [onCopy]
  );

  const handleImageHover = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
        setHoverColor(getPixelColor(canvas, x, y));
      }
    },
    []
  );

  const downloadPalette = useCallback(
    (format: 'json' | 'css') => {
      if (extractedColors.length === 0) return;

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        const obj = extractedColors.map((c) => ({
          hex: c.color,
          rgb: `rgb(${c.rgb.join(', ')})`,
          percentage: c.percentage,
        }));
        content = JSON.stringify(obj, null, 2);
        filename = 'palette.json';
        mimeType = 'application/json';
      } else {
        const lines = extractedColors.map(
          (c, i) => `  --color-${i + 1}: ${c.color}; /* ${c.percentage}% */`
        );
        content = `:root {\n${lines.join('\n')}\n}`;
        filename = 'palette.css';
        mimeType = 'text/css';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [extractedColors]
  );

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      {!image ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-neon bg-neonGhost'
              : 'border-borderMain hover:border-neon/50 hover:bg-neonGhost/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-neonGhost flex items-center justify-center">
              <svg className="w-8 h-8 text-neon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal mb-1">
                Kéo thả hoặc nhấn để tải ảnh
              </p>
              <p className="text-xs text-charcoalMuted">JPG, PNG, WebP — tối đa 10MB</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Image Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
                  Click để lấy màu tại điểm ảnh
                </h3>
                {hoverColor && (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded border border-borderMain" style={{ backgroundColor: hoverColor }} />
                    <span className="text-xs font-mono text-charcoalMuted">{hoverColor}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setImage(null);
                  setExtractedColors([]);
                  setViewColor(null);
                  setHoverColor(null);
                }}
                className="text-xs font-mono text-charcoalMuted hover:text-red-400 transition-colors"
              >
                Đổi ảnh
              </button>
            </div>

            <div className="relative border border-borderMain rounded-xl overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-auto cursor-crosshair hidden"
              />
              {image && (
                <NextImage
                  src={image}
                  alt="Uploaded"
                  width={1200}
                  height={800}
                  unoptimized
                  onClick={handleImageClick}
                  onMouseMove={handleImageHover}
                  onMouseLeave={() => setHoverColor(null)}
                  className="w-full h-auto cursor-crosshair block"
                />
              )}
            </div>

            {viewColor && (
              <div className="flex items-center gap-3 p-3 bg-neonGhost rounded-lg border border-neon/20">
                <div className="w-10 h-10 rounded-lg border border-borderMain" style={{ backgroundColor: viewColor }} />
                <div>
                  <div className="text-sm font-mono font-medium">{viewColor.toUpperCase()}</div>
                  <div className="text-[10px] text-charcoalMuted">Đã copy vào clipboard</div>
                </div>
              </div>
            )}
          </div>

          {/* Extracted Palette */}
          {extractedColors.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
                  Dominant Colors
                </h3>
                <div className="flex-1 h-px bg-borderMain" />
                <div className="flex gap-1">
                  <button
                    onClick={() => downloadPalette('json')}
                    className="px-2 py-1 text-[10px] font-mono border border-borderMain rounded hover:border-neon hover:bg-neonGhost transition-all"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => downloadPalette('css')}
                    className="px-2 py-1 text-[10px] font-mono border border-borderMain rounded hover:border-neon hover:bg-neonGhost transition-all"
                  >
                    CSS
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {extractedColors.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => onCopy(c.color)}
                    className="group flex flex-col items-center gap-1.5 p-2 border border-borderMain rounded-xl hover:border-neon hover:shadow-[0_0_0_1px_#39FF14,0_4px_12px_rgba(57,255,20,0.15)] transition-all"
                  >
                    <div
                      className="w-full aspect-square rounded-lg border border-borderMain/50 group-hover:border-neon/50 transition-colors"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-[9px] font-mono text-charcoalMuted group-hover:text-charcoal transition-colors">
                      {c.color}
                    </span>
                    <span className="text-[9px] font-mono text-charcoalMuted/50">
                      {c.percentage}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
