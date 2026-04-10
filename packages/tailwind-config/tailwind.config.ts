import type { Config } from "tailwindcss";

/**
 * CafeToolbox Tailwind Config
 * Colors, fonts, and design tokens from DESIGN.md
 */
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FAFAF5",
        charcoal: "#1A1A1A",
        charcoalLight: "#2C2C2C",
        charcoalMuted: "#6B6B6B",
        neon: "#39FF14",
        neonDim: "#2BD610",
        neonGhost: "rgba(57,255,20,0.08)",
        neonGhostMid: "rgba(57,255,20,0.15)",
        borderMain: "#E8E6E0",
        borderLight: "#F0EEEA",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
