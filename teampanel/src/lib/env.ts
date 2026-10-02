function bool(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

export const env = {
  get appUrl() {
    return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  get timezone() {
    return process.env.APP_TIMEZONE || "Europe/Berlin";
  },
  get cookieSecure() {
    return bool(process.env.AUTH_COOKIE_SECURE, process.env.NODE_ENV === "production");
  },
  get sessionDays() {
    const n = Number(process.env.SESSION_DAYS);
    return Number.isFinite(n) && n > 0 ? n : 14;
  },
  get uploadsDir() {
    return process.env.UPLOADS_DIR || "./storage/uploads";
  },
  get smtp() {
    const host = process.env.SMTP_HOST;
    if (!host) return null;
    return {
      host,
      port: Number(process.env.SMTP_PORT || 587),
      user: process.env.SMTP_USER || undefined,
      password: process.env.SMTP_PASSWORD || undefined,
      from: process.env.SMTP_FROM || "SH Airsoft Kommando <panel@example.local>",
    };
  },
};

export const SESSION_COOKIE = "shak_session";
