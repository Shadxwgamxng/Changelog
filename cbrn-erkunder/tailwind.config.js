/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f1318', panel: '#161c23', panel2: '#1c242d', line: '#2a3541', line2: '#38465a',
        txt: '#d5dde6', dim: '#8896a6', accent: '#4a8fd6',
        ok: '#4fa86b', warn: '#d9a21b', bad: '#d0503f',
      },
      fontFamily: { sans: ['"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'], mono: ['Consolas', '"DejaVu Sans Mono"', 'monospace'] },
    },
  },
  plugins: [],
};
