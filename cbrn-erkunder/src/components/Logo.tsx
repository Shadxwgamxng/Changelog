// Logo (vom Betreiber bereitgestellt): public/logo.png
export const Logo = ({ size = 28 }: { size?: number }) => (
  <img src={`${import.meta.env.BASE_URL}logo.png`} width={size} height={size} alt="Logo" style={{ borderRadius: '50%', display: 'block' }} />
);
