'use client';

import React, { useCallback } from 'react';

interface ColorSwatchProps {
  color: string;
  size?: 'sm' | 'md' | 'lg';
  showHex?: boolean;
  copyable?: boolean;
  onCopy?: (color: string) => void;
  className?: string;
}

export function ColorSwatch({
  color,
  size = 'md',
  showHex = false,
  copyable = true,
  onCopy,
  className = '',
}: ColorSwatchProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const handleClick = useCallback(() => {
    if (copyable && onCopy) {
      onCopy(color);
    }
  }, [color, copyable, onCopy]);

  return (
    <button
      onClick={handleClick}
      className={`group relative ${sizeClasses[size]} rounded-lg border border-borderMain overflow-hidden transition-all hover:scale-110 hover:border-neon hover:shadow-[0_0_0_1px_#39FF14,0_4px_12px_rgba(57,255,20,0.15)] ${className}`}
      style={{ backgroundColor: color }}
      title={copyable ? `Copy ${color}` : color}
    >
      {showHex && (
        <span className="absolute inset-x-0 bottom-0 text-[8px] font-mono text-center bg-black/60 text-white py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {color}
        </span>
      )}
    </button>
  );
}
