type BrandMarkVariant = "default" | "on-light" | "on-dark" | "flat";

type BrandMarkProps = {
  className?: string;
  size?: number;
  /** Visual variant to blend with different page backgrounds. */
  variant?: BrandMarkVariant;
};

export function BrandMark({
  className = "",
  size = 40,
  variant = "default",
}: BrandMarkProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
  };

  const variantClass =
    variant === "on-light"
      ? "ctb-brandmark--on-light"
      : variant === "on-dark"
        ? "ctb-brandmark--on-dark"
        : variant === "flat"
          ? "ctb-brandmark--flat"
          : "ctb-brandmark--default";

  return (
    <span
      className={`ctb-brandmark ${variantClass} ${className}`.trim()}
      style={style}
      role="img"
      aria-label="CafeToolbox"
    >
      <img
        src="/assets/brand/cafetoolbox.svg"
        alt=""
        aria-hidden="true"
        className="ctb-brandmark__img"
      />
    </span>
  );
}
