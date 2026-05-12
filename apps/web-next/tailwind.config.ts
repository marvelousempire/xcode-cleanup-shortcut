import type { Config } from "tailwindcss";

// Tailwind config for the Next.js app. Mirrors @cleanup-hub/web's token system
// (HSL custom properties for theme tokens, semantic safe/warn/danger colors)
// so the two apps look identical and we can lift components between them.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class", "[data-theme='dark']"],
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
        safe: { DEFAULT: "hsl(var(--safe))" },
        warn: { DEFAULT: "hsl(var(--warn))" },
        danger: { DEFAULT: "hsl(var(--danger))" },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', '"SF Pro Display"', "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", '"SF Mono"', "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
