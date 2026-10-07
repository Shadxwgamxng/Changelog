import type { Config } from "tailwindcss";

// Design-Tokens orientieren sich an „ignis“ (dunkel-first, neutrale Flächen, ein Akzent, kompakte Typografie).
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const soft = (name: string) => `rgb(var(--${name}) / var(--soft-a))`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  safelist: [{ pattern: /^badge-(neutral|ok|warn|danger|info|brand)$/ }, { pattern: /^btn-(primary|ok|danger|ghost)$/ }],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: v("bg"), 2: v("bg-2") },
        surface: { DEFAULT: v("surface"), 2: v("surface-2"), 3: v("surface-3") },
        fg: { DEFAULT: v("text"), muted: v("text-2"), subtle: v("text-3") },
        line: { DEFAULT: v("border"), strong: v("border-strong") },
        ok: { DEFAULT: v("ok"), soft: soft("ok") },
        warn: { DEFAULT: v("warn"), soft: soft("warn") },
        danger: { DEFAULT: v("danger"), soft: soft("danger") },
        info: { DEFAULT: v("info"), soft: soft("info") },
        brand: { 50: soft("accent"), 100: soft("accent"), 200: v("accent-text"), 500: v("accent"), 600: v("accent"), 700: v("accent-text"), 800: v("accent-hover"), 900: v("accent-hover") },
        fill: { 1: "var(--fill-1)", 2: "var(--fill-2)", 3: "var(--fill-3)", 4: "var(--fill-4)" },
        "on-accent": v("on-accent"),
      },
      fontFamily: {
        sans: ["Geist Variable", "Geist", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Geist Mono Variable", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: { card: "var(--shadow)", pop: "var(--shadow-lg)" },
      borderRadius: { sm: "4px", DEFAULT: "6px", md: "6px", lg: "8px", xl: "10px", "2xl": "10px" },
      transitionTimingFunction: { ignis: "cubic-bezier(0.16, 1, 0.3, 1)" },
    },
  },
  plugins: [],
};

export default config;
