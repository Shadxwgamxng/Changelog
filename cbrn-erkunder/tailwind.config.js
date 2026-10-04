/** @type {import('tailwindcss').Config} */
// Optik: dunkle, neutrale Oberfläche mit orangem Akzent (Anlehnung an das Erscheinungsbild von ignis/EmergencyForge).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b0b', bg2: '#101010', panel: '#151515', panel2: '#1b1b1b', panel3: '#222222', line: '#272727', line2: '#363636',
        txt: '#ebe9e6', txt2: '#b7b4b0', dim: '#817d78', accent: '#f0500a', 'accent-hover': '#d84507',
        ok: '#3fb950', warn: '#d29922', bad: '#e5534b', info: '#58a6ff',
      },
      fontFamily: { sans: ['"Geist Variable"', 'Geist', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'], mono: ['"Geist Mono Variable"', '"Geist Mono"', 'ui-monospace', 'Consolas', 'monospace'] },
      borderRadius: { DEFAULT: '6px', sm: '4px', md: '6px', lg: '8px', xl: '10px' },
    },
  },
  plugins: [],
};
