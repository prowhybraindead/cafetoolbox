type BrandMarkProps = {
  className?: string;
  size?: number;
};

export function BrandMark({ className = "", size = 40 }: BrandMarkProps) {
  const style = {
    width: size,
    height: size,
  };

  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="brand-mark-title brand-mark-desc"
      className={className}
      style={style}
    >
      <title id="brand-mark-title">CafeToolbox</title>
      <desc id="brand-mark-desc">Neon toolbox logo for CafeToolbox.</desc>
      <defs>
        <linearGradient id="brand-bg" x1="96" y1="64" x2="416" y2="448" gradientUnits="userSpaceOnUse">
          <stop stopColor="#121212" />
          <stop offset="1" stopColor="#1F1F1F" />
        </linearGradient>
        <linearGradient id="brand-accent" x1="144" y1="136" x2="368" y2="376" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B6FF4D" />
          <stop offset="1" stopColor="#48E5A8" />
        </linearGradient>
        <linearGradient id="brand-stroke" x1="156" y1="160" x2="356" y2="352" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5F7FA" stopOpacity="0.95" />
          <stop offset="1" stopColor="#F5F7FA" stopOpacity="0.62" />
        </linearGradient>
      </defs>
      <rect x="40" y="40" width="432" height="432" rx="112" fill="url(#brand-bg)" />
      <rect x="56" y="56" width="400" height="400" rx="96" stroke="#343434" strokeWidth="2" opacity="0.8" />
      <path
        d="M140 190C140 179.059 148.059 170 158 170H354C363.941 170 372 179.059 372 190V266C372 275.941 363.941 284 354 284H158C148.059 284 140 275.941 140 266V190Z"
        fill="#1A1A1A"
        stroke="url(#brand-stroke)"
        strokeWidth="6"
      />
      <path
        d="M188 170V150C188 141.163 195.163 134 204 134H308C316.837 134 324 141.163 324 150V170"
        stroke="url(#brand-accent)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M208 226H304" stroke="url(#brand-accent)" strokeWidth="14" strokeLinecap="round" />
      <path d="M176 312H336" stroke="#E9EEF2" strokeOpacity="0.18" strokeWidth="10" strokeLinecap="round" />
      <path d="M176 348H292" stroke="#E9EEF2" strokeOpacity="0.18" strokeWidth="10" strokeLinecap="round" />
      <circle cx="344" cy="344" r="20" fill="url(#brand-accent)" />
      <path d="M333 344H355" stroke="#101010" strokeWidth="8" strokeLinecap="round" />
      <path d="M344 333V355" stroke="#101010" strokeWidth="8" strokeLinecap="round" />
      <circle cx="168" cy="344" r="18" fill="#121212" stroke="url(#brand-accent)" strokeWidth="6" />
      <path d="M162 344L168 350L176 338" stroke="#B6FF4D" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
