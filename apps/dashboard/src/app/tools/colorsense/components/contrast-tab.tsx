'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { HexColorPicker } from 'react-colorful';
import {
  hexToRgb,
  contrastRatio,
  getContrastLevel,
  formatRatio,
  type RGB,
} from '../lib/color-utils';

const SAMPLE_TEXTS = [
  { label: 'Heading', text: 'Aa', className: 'text-4xl font-bold' },
  { label: 'Paragraph', text: 'The quick brown fox jumps over the lazy dog', className: 'text-base' },
  { label: 'Secondary', text: 'Lorem ipsum dolor sit amet', className: 'text-sm text-opacity-80' },
];

export function ContrastCheckerTab({ onCopy: _onCopy }: { onCopy: (text: string) => void }) {
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [textColor, setTextColor] = useState('#1A1A1A');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showTextPicker, setShowTextPicker] = useState(false);

  const bgRgb = useMemo((): RGB | null => hexToRgb(bgColor), [bgColor]);
  const textRgb = useMemo((): RGB | null => hexToRgb(textColor), [textColor]);

  const ratio = useMemo(() => {
    if (!bgRgb || !textRgb) return 0;
    return contrastRatio(bgRgb, textRgb);
  }, [bgRgb, textRgb]);

  const level = useMemo(() => getContrastLevel(ratio), [ratio]);

  const checkResult = useMemo(() => {
    const aa = ratio >= 4.5;
    const aaLarge = ratio >= 3;
    const aaa = ratio >= 7;
    const aaaLarge = ratio >= 4.5;
    return { aa, aaLarge, aaa, aaaLarge };
  }, [ratio]);

  const swapColors = useCallback(() => {
    setBgColor(textColor);
    setTextColor(bgColor);
  }, [bgColor, textColor]);

  const suggestion = useMemo(() => {
    if (ratio >= 4.5) return null;
    const bgIsLight = bgRgb && (bgRgb.r * 0.299 + bgRgb.g * 0.587 + bgRgb.b * 0.114) > 128;
    if (bgIsLight) {
      return 'Thử màu chữ tối hơn (ví dụ: #000000 hoặc #333333)';
    }
    return 'Thử màu chữ sáng hơn (ví dụ: #FFFFFF hoặc #F0F0F0)';
  }, [ratio, bgRgb]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Background Color */}
          <div className="border border-borderMain rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
                Màu nền (Background)
              </label>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-borderMain" style={{ backgroundColor: bgColor }} />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => {
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBgColor(e.target.value);
                  }}
                  className="w-24 px-2 py-1 text-xs font-mono border border-borderMain rounded-md bg-white/50 focus:outline-none focus:border-neon transition-all"
                />
              </div>
            </div>

            {showBgPicker ? (
              <div className="space-y-2">
                <HexColorPicker color={bgColor} onChange={setBgColor} />
                <button
                  onClick={() => setShowBgPicker(false)}
                  className="text-xs text-charcoalMuted hover:text-charcoal transition-colors"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowBgPicker(true)}
                className="text-xs text-charcoalMuted hover:text-neon transition-colors"
              >
                Chọn màu...
              </button>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={swapColors}
              className="p-2 border border-borderMain rounded-lg hover:bg-neonGhost hover:border-neon transition-all"
              title="Đổi màu"
            >
              <svg className="w-5 h-5 text-charcoalMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* Text Color */}
          <div className="border border-borderMain rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
                Màu chữ (Text)
              </label>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-borderMain" style={{ backgroundColor: textColor }} />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => {
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setTextColor(e.target.value);
                  }}
                  className="w-24 px-2 py-1 text-xs font-mono border border-borderMain rounded-md bg-white/50 focus:outline-none focus:border-neon transition-all"
                />
              </div>
            </div>

            {showTextPicker ? (
              <div className="space-y-2">
                <HexColorPicker color={textColor} onChange={setTextColor} />
                <button
                  onClick={() => setShowTextPicker(false)}
                  className="text-xs text-charcoalMuted hover:text-charcoal transition-colors"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTextPicker(true)}
                className="text-xs text-charcoalMuted hover:text-neon transition-colors"
              >
                Chọn màu...
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Contrast Ratio */}
          <div className="border border-borderMain rounded-xl p-5 text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted mb-2">
              Contrast Ratio
            </div>
            <div className={`text-4xl font-bold font-mono ${level.color} mb-1`}>
              {formatRatio(ratio)}:1
            </div>
            <div className={`text-sm font-medium ${level.color}`}>
              {level.description}
            </div>

            {/* Contrast Level Bar */}
            <div className="mt-4 h-2 bg-borderMain rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((ratio / 21) * 100, 100)}%`,
                  backgroundColor:
                    ratio >= 7 ? '#16a34a' : ratio >= 4.5 ? '#eab308' : ratio >= 3 ? '#f97316' : '#ef4444',
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[9px] font-mono text-charcoalMuted/50">
              <span>1:1</span>
              <span>4.5:1</span>
              <span>7:1</span>
              <span>21:1</span>
            </div>
          </div>

          {/* Pass/Fail Grid */}
          <div className="border border-borderMain rounded-xl overflow-hidden divide-y divide-borderMain">
            <div className="grid grid-cols-3 divide-x divide-borderMain text-center">
              <div className="p-3">
                <div className="text-[10px] font-mono text-charcoalMuted mb-1">AA Normal</div>
                <div className={`text-sm font-semibold ${checkResult.aa ? 'text-green-600' : 'text-red-500'}`}>
                  {checkResult.aa ? 'PASS' : 'FAIL'}
                </div>
              </div>
              <div className="p-3">
                <div className="text-[10px] font-mono text-charcoalMuted mb-1">AAA Normal</div>
                <div className={`text-sm font-semibold ${checkResult.aaa ? 'text-green-600' : 'text-red-500'}`}>
                  {checkResult.aaa ? 'PASS' : 'FAIL'}
                </div>
              </div>
              <div className="p-3">
                <div className="text-[10px] font-mono text-charcoalMuted mb-1">AA Large</div>
                <div className={`text-sm font-semibold ${checkResult.aaLarge ? 'text-green-600' : 'text-red-500'}`}>
                  {checkResult.aaLarge ? 'PASS' : 'FAIL'}
                </div>
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="text-[10px] font-mono text-charcoalMuted mb-1">AAA Large</div>
              <div className={`text-sm font-semibold ${checkResult.aaaLarge ? 'text-green-600' : 'text-red-500'}`}>
                {checkResult.aaaLarge ? 'PASS' : 'FAIL'}
              </div>
            </div>
          </div>

          {/* Suggestion */}
          {suggestion && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <svg className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              <p className="text-xs text-yellow-700">{suggestion}</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Preview */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
            Xem trước
          </h3>
          <div className="flex-1 h-px bg-borderMain" />
        </div>
        <div
          className="border border-borderMain rounded-2xl p-6 space-y-4 transition-colors duration-300"
          style={{ backgroundColor: bgColor }}
        >
          {SAMPLE_TEXTS.map((sample) => (
            <div key={sample.label}>
              <div className="text-[10px] font-mono mb-1" style={{ color: textColor, opacity: 0.4 }}>
                {sample.label}
              </div>
              <p className={sample.className} style={{ color: textColor }}>
                {sample.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* react-colorful override */}
      <style jsx global>{`
        .react-colorful {
          width: 100% !important;
          height: 200px !important;
        }
      `}</style>
    </div>
  );
}
