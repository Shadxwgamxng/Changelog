import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // DRK-Rot als Markenfarbe, ansonsten ruhige Neutraltöne
        brand: {
          50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5", 400: "#f87171",
          500: "#e30613", 600: "#c40510", 700: "#a3040d", 800: "#82030a", 900: "#610208",
        },
        ink: {
          50: "#f8f9fb", 100: "#f1f3f6", 200: "#e4e8ee", 300: "#cbd2dc", 400: "#9aa5b5",
          500: "#6b7788", 600: "#4d586a", 700: "#384255", 800: "#242c3b", 900: "#141a26", 950: "#0c111a",
        },
      },
      fontFamily: { sans: ["Inter Variable", "ui-sans-serif", "system-ui", "sans-serif"] },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)",
        pop: "0 8px 24px rgba(16,24,40,.12)",
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
    },
  },
  plugins: [],
};

export default config;
