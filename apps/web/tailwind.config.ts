import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Design tokens mirror docs/Design-System.md.
// Teal accent (#0F766E light / #2DD4BF dark), warm neutrals, semantic tier colors.
export default {
  darkMode: ["class", "[data-theme='dark']"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          1: "hsl(var(--bg-1))",
          2: "hsl(var(--bg-2))",
          3: "hsl(var(--bg-3))",
        },
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        fg: {
          DEFAULT: "hsl(var(--fg))",
          dim: "hsl(var(--fg-dim))",
          faint: "hsl(var(--fg-faint))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          strong: "hsl(var(--accent-strong))",
          soft: "hsl(var(--accent-soft))",
        },
        safe: {
          DEFAULT: "hsl(var(--safe))",
          soft: "hsl(var(--safe-soft))",
        },
        warn: {
          DEFAULT: "hsl(var(--warn))",
          soft: "hsl(var(--warn-soft))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          soft: "hsl(var(--danger-soft))",
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", '"SF Mono"', "Menlo", "monospace"],
      },
      fontSize: {
        display: ["80px", { lineHeight: "1", letterSpacing: "-0.04em", fontWeight: "700" }],
        hero: ["72px", { lineHeight: "1", letterSpacing: "-0.04em", fontWeight: "700" }],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
      boxShadow: {
        sm: "0 1px 2px hsl(0 0% 0% / 0.04), 0 2px 8px hsl(0 0% 0% / 0.03)",
        md: "0 2px 4px hsl(0 0% 0% / 0.05), 0 8px 24px hsl(0 0% 0% / 0.06)",
        lg: "0 8px 16px hsl(0 0% 0% / 0.10), 0 24px 64px hsl(0 0% 0% / 0.18)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
