import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";

/** Versendet per SMTP; ohne SMTP-Konfiguration wird die Mail ins Server-Log geschrieben (Entwicklung). */
export async function sendMail(opts: { to: string; subject: string; text: string }) {
  const smtp = env.smtp;
  if (!smtp) {
    console.info(`\n[mail:dev] An: ${opts.to}\nBetreff: ${opts.subject}\n${opts.text}\n`);
    return { delivered: false as const };
  }
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
  });
  await transport.sendMail({ from: smtp.from, to: opts.to, subject: opts.subject, text: opts.text });
  return { delivered: true as const };
}
