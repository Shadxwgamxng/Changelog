import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0c0e0f",
        surface: "#141719",
        elevated: "#1b1f22",
        line: "#2a3035",
        fg: "#e7e9e6",
        muted: "#9ba39d",
        subtle: "#69716b",
        accent: {
          DEFAULT: "#86994f",
          300: "#b9c88c",
          400: "#a1b36e",
          500: "#86994f",
          600: "#6d7f3f",
          700: "#556330",
          900: "#232b14",
        },
        danger: "#d9594e",
        warn: "#d9a441",
        ok: "#6fb36f",
        info: "#6c9bb8",
      },
      fontFamily: {
        sans: ['"Inter Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Oswald", '"Inter Variable"', "ui-sans-serif", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
        "nav-progress": { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(300%)" } },
      },
      animation: { "fade-in": "fade-in 0.18s ease-out" },
    },
  },
  plugins: [],
};

export default config;
