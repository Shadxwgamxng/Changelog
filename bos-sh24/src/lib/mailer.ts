// Mailer-Stub: In dieser Demo-Umgebung ist kein echter SMTP-Server angebunden.
// E-Mails werden strukturiert geloggt statt versendet. Für den Produktivbetrieb
// hier z.B. nodemailer mit den Zugangsdaten aus den Admin-Einstellungen anbinden.

interface MailPayload {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail({ to, subject, text }: MailPayload): Promise<void> {
  console.log(`\n----- [BOS_SH24 Mailer] -----\nAn: ${to}\nBetreff: ${subject}\n\n${text}\n------------------------------\n`);
}

export async function sendPasswordResetMail(to: string, resetUrl: string) {
  await sendMail({
    to,
    subject: "BOS_SH24 – Passwort zurücksetzen",
    text: `Du hast eine Zurücksetzung deines Passworts angefordert.\n\nLink (60 Minuten gültig): ${resetUrl}\n\nWenn du das nicht warst, ignoriere diese E-Mail.`,
  });
}

export async function sendWelcomeMail(to: string, name: string) {
  await sendMail({
    to,
    subject: "Willkommen bei BOS_SH24",
    text: `Hallo ${name},\n\nherzlich willkommen bei BOS_SH24! Dein Konto wurde erfolgreich erstellt.`,
  });
}
