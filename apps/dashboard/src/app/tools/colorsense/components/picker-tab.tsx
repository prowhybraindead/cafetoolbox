'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import {
  hexToRgb,
  rgbToHsl,
  rgbToHsv,
  rgbToHex,
  hslToRgb,
  hsvToRgb,
  isValidHex,
  type RGB,
  type HSL,
  type HSV,
} from '../lib/color-utils';
import { ColorSwatch } from './color-swatch';

const PRESET_PALETTES = [
  { name: 'Neon', colors: ['#39FF14', '#FF1464', '#14D4FF', '#FFB814', '#8B14FF', '#FF6414'] },
  { name: 'Pastel', colors: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8BAFF'] },
  { name: 'Earth', colors: ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F5DEB3', '#FAEBD7'] },
  { name: 'Ocean', colors: ['#006994', '#0099DB', '#40E0D0', '#7FFFD4', '#B0E0E6', '#F0F8FF'] },
  { name: 'Sunset', colors: ['#FF4500', '#FF6347', '#FF7F50', '#FFA07A', '#FFD700', '#FFF8DC'] },
  { name: 'Monochrome', colors: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'] },
];

const HISTORY_KEY = 'cafetoolbox-colorsense-history';

export function PickerTab({ onCopy }: { onCopy: (text: string) => void }) {
  const [color, setColor] = useState('#39ff14');
  const [rgb, setRgb] = useState<RGB>({ r: 57, g: 255, b: 20 });
  const [hsl, setHsl] = useState<HSL>({ h: 112, s: 100, l: 54 });
  const [hsv, setHsv] = useState<HSV>({ h: 112, s: 92, v: 100 });
  const [hexInput, setHexInput] = useState('#39ff14');
  const [rgbInput, setRgbInput] = useState({ r: '57', g: '255', b: '20' });
  const [hslInput, setHslInput] = useState({ h: '112', s: '100', l: '54' });
  const [hsvInput, setHsvInput] = useState({ h: '112', s: '92', v: '100' });
  const [history, setHistory] = useState<string[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const saveToHistory = useCallback(
    (hex: string) => {
      setHistory((prev) => {
        const next = [hex, ...prev.filter((c) => c !== hex)].slice(0, 12);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    },
    []
  );

  // Sync from hex (picker)
  const handlePickerChange = useCallback(
    (newHex: string) => {
      setColor(newHex);
      setHexInput(newHex);
      const r = hexToRgb(newHex);
      if (r) {
        setRgb(r);
        setRgbInput({ r: String(r.r), g: String(r.g), b: String(r.b) });
        const hslVal = rgbToHsl(r.r, r.g, r.b);
        setHsl(hslVal);
        setHslInput({ h: String(hslVal.h), s: String(hslVal.s), l: String(hslVal.l) });
        const hsvVal = rgbToHsv(r.r, r.g, r.b);
        setHsv(hsvVal);
        setHsvInput({ h: String(hsvVal.h), s: String(hsvVal.s), v: String(hsvVal.v) });
      }
    },
    []
  );

  // Hex input change
  const handleHexChange = useCallback(
    (val: string) => {
      setHexInput(val);
      if (isValidHex(val)) {
        const r = hexToRgb(val);
        if (r) {
          setColor(val);
          setRgb(r);
          setRgbInput({ r: String(r.r), g: String(r.g), b: String(r.b) });
          const hslVal = rgbToHsl(r.r, r.g, r.b);
          setHsl(hslVal);
          setHslInput({ h: String(hslVal.h), s: String(hslVal.s), l: String(hslVal.l) });
          const hsvVal = rgbToHsv(r.r, r.g, r.b);
          setHsv(hsvVal);
          setHsvInput({ h: String(hsvVal.h), s: String(hsvVal.s), v: String(hsvVal.v) });
        }
      }
    },
    []
  );

  // RGB input change
  const handleRgbChange = useCallback(
    (field: 'r' | 'g' | 'b', val: string) => {
      const newInput = { ...rgbInput, [field]: val };
      setRgbInput(newInput);
      const r = Math.max(0, Math.min(255, parseInt(newInput.r) || 0));
      const g = Math.max(0, Math.min(255, parseInt(newInput.g) || 0));
      const b = Math.max(0, Math.min(255, parseInt(newInput.b) || 0));
      const rgbObj = { r, g, b };
      setRgb(rgbObj);
      const hex = rgbToHex(r, g, b);
      setColor(hex);
      setHexInput(hex);
      const hslVal = rgbToHsl(r, g, b);
      setHsl(hslVal);
      setHslInput({ h: String(hslVal.h), s: String(hslVal.s), l: String(hslVal.l) });
      const hsvVal = rgbToHsv(r, g, b);
      setHsv(hsvVal);
      setHsvInput({ h: String(hsvVal.h), s: String(hsvVal.s), v: String(hsvVal.v) });
    },
    [rgbInput]
  );

  // HSL input change
  const handleHslChange = useCallback(
    (field: 'h' | 's' | 'l', val: string) => {
      const newInput = { ...hslInput, [field]: val };
      setHslInput(newInput);
      const h = Math.max(0, Math.min(360, parseInt(newInput.h) || 0));
      const s = Math.max(0, Math.min(100, parseInt(newInput.s) || 0));
      const l = Math.max(0, Math.min(100, parseInt(newInput.l) || 0));
      const rgbObj = hslToRgb(h, s, l);
      setRgb(rgbObj);
      setRgbInput({ r: String(rgbObj.r), g: String(rgbObj.g), b: String(rgbObj.b) });
      const hex = rgbToHex(rgbObj.r, rgbObj.g, rgbObj.b);
      setColor(hex);
      setHexInput(hex);
      const hsvVal = rgbToHsv(rgbObj.r, rgbObj.g, rgbObj.b);
      setHsv(hsvVal);
      setHsvInput({ h: String(hsvVal.h), s: String(hsvVal.s), v: String(hsvVal.v) });
    },
    [hslInput]
  );

  // HSV input change
  const handleHsvChange = useCallback(
    (field: 'h' | 's' | 'v', val: string) => {
      const newInput = { ...hsvInput, [field]: val };
      setHsvInput(newInput);
      const h = Math.max(0, Math.min(360, parseInt(newInput.h) || 0));
      const s = Math.max(0, Math.min(100, parseInt(newInput.s) || 0));
      const v = Math.max(0, Math.min(100, parseInt(newInput.v) || 0));
      const rgbObj = hsvToRgb(h, s, v);
      setRgb(rgbObj);
      setRgbInput({ r: String(rgbObj.r), g: String(rgbObj.g), b: String(rgbObj.b) });
      const hex = rgbToHex(rgbObj.r, rgbObj.g, rgbObj.b);
      setColor(hex);
      setHexInput(hex);
      const hslVal = rgbToHsl(rgbObj.r, rgbObj.g, rgbObj.b);
      setHsl(hslVal);
      setHslInput({ h: String(hslVal.h), s: String(hslVal.s), l: String(hslVal.l) });
    },
    [hsvInput]
  );

  const copy = useCallback(
    (text: string) => {
      onCopy(text);
      saveToHistory(color);
    },
    [onCopy, saveToHistory, color]
  );

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Color Picker */}
        <div className="space-y-4">
          <div className="react-colorful-wrapper">
            <HexColorPicker color={color} onChange={handlePickerChange} />
          </div>

          {/* Preview */}
          <div
            className="h-20 rounded-xl border border-borderMain relative overflow-hidden"
            style={{ backgroundColor: color }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="font-mono text-xs px-3 py-1 rounded-full bg-black/30 text-white backdrop-blur-sm"
              >
                {color.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Quick Copy Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => copy(color.toUpperCase())}
              className="px-3 py-1.5 text-xs font-mono border border-borderMain rounded-lg hover:border-neon hover:bg-neonGhost transition-all"
            >
              HEX
            </button>
            <button
              onClick={() => copy(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)}
              className="px-3 py-1.5 text-xs font-mono border border-borderMain rounded-lg hover:border-neon hover:bg-neonGhost transition-all"
            >
              RGB
            </button>
            <button
              onClick={() => copy(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)}
              className="px-3 py-1.5 text-xs font-mono border border-borderMain rounded-lg hover:border-neon hover:bg-neonGhost transition-all"
            >
              HSL
            </button>
            <button
              onClick={() => copy(`hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`)}
              className="px-3 py-1.5 text-xs font-mono border border-borderMain rounded-lg hover:border-neon hover:bg-neonGhost transition-all"
            >
              HSV
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {/* HEX */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted mb-1.5 block">
              HEX
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                className="flex-1 px-3 py-2 text-sm font-mono border border-borderMain rounded-lg bg-white/50 focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/30 transition-all"
                placeholder="#000000"
              />
              <button
                onClick={() => copy(color.toUpperCase())}
                className="px-3 py-2 border border-borderMain rounded-lg hover:bg-neonGhost hover:border-neon transition-all"
                title="Copy"
              >
                <svg className="w-4 h-4 text-charcoalMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>
          </div>

          {/* RGB */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted mb-1.5 block">
              RGB
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['r', 'g', 'b'] as const).map((ch) => (
                <div key={ch} className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-charcoalMuted/50 uppercase">
                    {ch}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgbInput[ch]}
                    onChange={(e) => handleRgbChange(ch, e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-sm font-mono border border-borderMain rounded-lg bg-white/50 focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/30 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* HSL */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted mb-1.5 block">
              HSL
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['h', 's', 'l'] as const).map((ch) => (
                <div key={ch} className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-charcoalMuted/50 uppercase">
                    {ch}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={ch === 'h' ? 360 : 100}
                    value={hslInput[ch]}
                    onChange={(e) => handleHslChange(ch, e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-sm font-mono border border-borderMain rounded-lg bg-white/50 focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/30 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* HSV */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted mb-1.5 block">
              HSV
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['h', 's', 'v'] as const).map((ch) => (
                <div key={ch} className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-charcoalMuted/50 uppercase">
                    {ch}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={ch === 'h' ? 360 : 100}
                    value={hsvInput[ch]}
                    onChange={(e) => handleHsvChange(ch, e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-sm font-mono border border-borderMain rounded-lg bg-white/50 focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/30 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
              Recent Colors
            </h3>
            <div className="flex-1 h-px bg-borderMain" />
            <button
              onClick={() => {
                setHistory([]);
                try { localStorage.removeItem(HISTORY_KEY); } catch {}
              }}
              className="text-[10px] font-mono text-charcoalMuted/50 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((c) => (
              <ColorSwatch key={c} color={c} size="md" onCopy={onCopy} showHex />
            ))}
          </div>
        </div>
      )}

      {/* Preset Palettes */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
            Preset Palettes
          </h3>
          <div className="flex-1 h-px bg-borderMain" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {PRESET_PALETTES.map((palette) => (
            <div key={palette.name} className="border border-borderMain rounded-xl p-3 hover:border-neon/50 transition-all">
              <div className="text-xs font-mono text-charcoalMuted mb-2">{palette.name}</div>
              <div className="flex gap-1.5">
                {palette.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => handlePickerChange(c.toLowerCase())}
                    className="w-8 h-8 rounded-md border border-borderMain hover:scale-110 transition-transform cursor-pointer"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* react-colorful CSS override */}
      <style jsx global>{`
        .react-colorful-wrapper .react-colorful {
          width: 100% !important;
          height: 260px !important;
        }
      `}</style>
    </div>
  );
}
