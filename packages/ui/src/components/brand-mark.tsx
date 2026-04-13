import { useId } from "react";

type BrandMarkVariant = "default" | "on-light" | "on-dark" | "flat";

type BrandMarkProps = {
  className?: string;
  size?: number;
  /** Visual variant to blend with different page backgrounds.
   *  - "default":   original dark rounded-rect with neon accents (standalone)
   *  - "on-light":  subtle drop-shadow + lighter border — best on white/cream bg
   *  - "on-dark":   lighter border + neon glow — best on charcoal/dark bg
   *  - "flat":      no background rounded-rect, just the toolbox icon outline
   */
  variant?: BrandMarkVariant;
};

/**
 * The official CafeToolbox logo (neon toolbox).
 *
 * Uses unique gradient IDs per instance (via React useId) so multiple
 * logos can coexist on the same page without SVG ID collisions.
 */
export function BrandMark({
  className = "",
  size = 40,
  variant = "default",
}: BrandMarkProps) {
  const uid = useId().replace(/:/g, "");

  const bgId = `brand-bg-${uid}`;
  const accentId = `brand-accent-${uid}`;
  const strokeId = `brand-stroke-${uid}`;

  const isFlat = variant === "flat";

  const borderStroke =
    variant === "on-dark"
      ? "#555555"
      : variant === "on-light"
        ? "#D0D0D0"
        : "#343434";

  const rectOpacity =
    variant === "on-dark" || variant === "on-light" ? "0.6" : "0.8";

  const style: React.CSSProperties = {
    width: size,
    height: size,
    ...(variant === "on-light" && {
      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.10))",
    }),
    ...(variant === "on-dark" && {
      filter: "drop-shadow(0 0 6px rgba(182,255,77,0.25))",
    }),
  };

  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={`bm-title-${uid} bm-desc-${uid}`}
      className={className}
      style={style}
    >
      <title id={`bm-title-${uid}`}>CafeToolbox</title>
      <desc id={`bm-desc-${uid}`}>Neon toolbox logo for CafeToolbox.</desc>
      <defs>
        <linearGradient id={bgId} x1="96" y1="64" x2="416" y2="448" gradientUnits="userSpaceOnUse">
          <stop stopColor="#121212" />
          <stop offset="1" stopColor="#1F1F1F" />
        </linearGradient>
        <linearGradient id={accentId} x1="144" y1="136" x2="368" y2="376" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B6FF4D" />
          <stop offset="1" stopColor="#48E5A8" />
        </linearGradient>
        <linearGradient id={strokeId} x1="156" y1="160" x2="356" y2="352" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5F7FA" stopOpacity="0.95" />
          <stop offset="1" stopColor="#F5F7FA" stopOpacity="0.62" />
        </linearGradient>
      </defs>

      {/* Background rounded rect — hidden in "flat" variant */}
      {!isFlat && (
        <>
          <rect x="40" y="40" width="432" height="432" rx="112" fill={`url(#${bgId})`} />
          <rect x="56" y="56" width="400" height="400" rx="96" stroke={borderStroke} strokeWidth="2" opacity={rectOpacity} />
        </>
      )}

      {/* Toolbox body */}
      <path
        d="M140 190C140 179.059 148.059 170 158 170H354C363.941 170 372 179.059 372 190V266C372 275.941 363.941 284 354 284H158C148.059 284 140 275.941 140 266V190Z"
        fill={isFlat ? "none" : "#1A1A1A"}
        stroke={`url(#${strokeId})`}
        strokeWidth={isFlat ? "12" : "6"}
      />

      {/* Handle */}
      <path
        d="M188 170V150C188 141.163 195.163 134 204 134H308C316.837 134 324 141.163 324 150V170"
        stroke={`url(#${accentId})`}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Main divider */}
      <path d="M208 226H304" stroke={`url(#${accentId})`} strokeWidth="14" strokeLinecap="round" />

      {/* Detail lines */}
      <path d="M176 312H336" stroke="#E9EEF2" strokeOpacity={isFlat ? "0.3" : "0.18"} strokeWidth="10" strokeLinecap="round" />
      <path d="M176 348H292" stroke="#E9EEF2" strokeOpacity={isFlat ? "0.3" : "0.18"} strokeWidth="10" strokeLinecap="round" />

      {/* Plus circle */}
      <circle cx="344" cy="344" r="20" fill={`url(#${accentId})`} />
      <path d="M333 344H355" stroke="#101010" strokeWidth="8" strokeLinecap="round" />
      <path d="M344 333V355" stroke="#101010" strokeWidth="8" strokeLinecap="round" />

      {/* Checkmark circle */}
      <circle cx="168" cy="344" r="18" fill={isFlat ? "none" : "#121212"} stroke={`url(#${accentId})`} strokeWidth="6" />
      <path d="M162 344L168 350L176 338" stroke="#B6FF4D" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
