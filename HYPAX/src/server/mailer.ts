import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

let transport: Transporter | null = null;

/** Sendet eine E-Mail. Ohne SMTP-Konfiguration wird nur protokolliert (kein Fehler). */
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const smtp = env.smtp;
  if (!smtp) {
    if (process.env.NODE_ENV !== "test") console.info(`[mail:dry-run] an ${to}: ${subject}`);
    return false;
  }
  transport ??= nodemailer.createTransport({
    host: smtp.host, port: smtp.port, secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
  try {
    await transport.sendMail({ from: smtp.from, to, subject, text });
    return true;
  } catch (err) {
    console.error("[mail] Versand fehlgeschlagen:", (err as Error).message);
    return false;
  }
}
