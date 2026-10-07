const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

export const env = {
  get appUrl() { return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""); },
  get secureCookies() { return this.appUrl.startsWith("https://"); },
  get sessionIdleMin() { return num(process.env.SESSION_IDLE_MINUTES, 30); },
  get sessionMaxH() { return num(process.env.SESSION_MAX_HOURS, 12); },
  get storageDir() { return process.env.STORAGE_DIR || "./storage"; },
  get retainLeftHelperMonths() { return num(process.env.RETAIN_LEFT_HELPER_MONTHS, 24); },
  get retainAuditMonths() { return num(process.env.RETAIN_AUDIT_MONTHS, 36); },
  get retainNotificationDays() { return num(process.env.RETAIN_NOTIFICATION_DAYS, 90); },
  get smtp() {
    return process.env.SMTP_HOST
      ? { host: process.env.SMTP_HOST, port: num(process.env.SMTP_PORT, 587), user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, from: process.env.SMTP_FROM || "HYPAX <no-reply@localhost>" }
      : null;
  },
  get vapid() {
    return process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
      ? { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY, subject: process.env.VAPID_SUBJECT || "mailto:admin@localhost" }
      : null;
  },
};
export const COOKIE_NAME = "hypax_session";
