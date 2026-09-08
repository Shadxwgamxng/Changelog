import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Bitte gib deinen vollständigen Namen ein.").max(100),
    username: z
      .string()
      .trim()
      .min(3, "Der Benutzername muss mindestens 3 Zeichen lang sein.")
      .max(30)
      .regex(/^[a-zA-Z0-9_.-]+$/, "Nur Buchstaben, Zahlen, . _ - sind erlaubt."),
    email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse ein."),
    password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein.").max(72),
    passwordConfirm: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Du musst der Datenschutzerklärung zustimmen." }),
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Bitte E-Mail oder Benutzername angeben."),
  password: z.string().min(1, "Bitte Passwort angeben."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse ein."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein.").max(72),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Bitte Vorname angeben.").max(80),
  lastName: z.string().trim().min(1, "Bitte Nachname angeben.").max(80),
  email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse ein."),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Bitte Betreff angeben.").max(150),
  message: z.string().trim().min(10, "Deine Nachricht sollte mindestens 10 Zeichen enthalten.").max(5000),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: "Bitte akzeptiere die Datenschutzerklärung." }),
  }),
  website: z.string().max(0).optional().or(z.literal("")), // Honeypot-Feld gegen Spam-Bots
  formStartedAt: z.coerce.number().optional(),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse ein."),
});

export const postSchema = z.object({
  title: z.string().trim().min(3, "Titel ist zu kurz.").max(200),
  subtitle: z.string().trim().max(240).optional().or(z.literal("")),
  excerpt: z.string().trim().min(10, "Bitte eine kurze Vorschau angeben.").max(400),
  content: z.string().min(20, "Der Artikeltext ist zu kurz."),
  categoryId: z.string().min(1, "Bitte eine Kategorie wählen."),
  tags: z.array(z.string()).default([]),
  coverImageUrl: z.string().optional().or(z.literal("")),
  coverImageAlt: z.string().optional().or(z.literal("")),
  authorId: z.string().min(1),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]),
  featured: z.boolean().default(false),
  scheduledAt: z.string().optional().or(z.literal("")),
  gallery: z
    .array(z.object({ url: z.string(), caption: z.string().optional() }))
    .default([]),
});

export const eventSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  imageUrl: z.string().optional().or(z.literal("")),
  startsAt: z.string().min(1, "Bitte Startdatum/-zeit angeben."),
  endsAt: z.string().optional().or(z.literal("")),
  location: z.string().trim().min(2).max(200),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#3564ff"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  avatarUrl: z.string().optional().or(z.literal("")),
});

export const settingsSchema = z.object({
  siteName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
  contactEmail: z.string().email(),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  contactAddress: z.string().trim().max(300).optional().or(z.literal("")),
  facebookUrl: z.string().optional().or(z.literal("")),
  instagramUrl: z.string().optional().or(z.literal("")),
  youtubeUrl: z.string().optional().or(z.literal("")),
  tiktokUrl: z.string().optional().or(z.literal("")),
  xUrl: z.string().optional().or(z.literal("")),
  footerText: z.string().trim().max(500).optional().or(z.literal("")),
  impressumContent: z.string().optional().or(z.literal("")),
  datenschutzContent: z.string().optional().or(z.literal("")),
});
