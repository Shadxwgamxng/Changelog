// Eigenes Platzhalter-Emblem (umgedrehtes Dreieck). Kein offizielles Logo einer Behörde.
export const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Emblem">
    <polygon points="4,8 60,8 32,58" fill="#1f5fa8" />
    <polygon points="14,14 50,14 32,46" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
    <circle cx="32" cy="25" r="5" fill="#fff" />
  </svg>
);
