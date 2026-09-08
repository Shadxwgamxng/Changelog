import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "BOS_SH24 – Presseagentur für Blaulicht- und Einsatzberichte",
    template: "%s | BOS_SH24",
  },
  description:
    "BOS_SH24 berichtet unabhängig und aktuell über Einsätze, Pressemitteilungen und Veranstaltungen von Feuerwehr, Rettungsdienst und Polizei.",
  openGraph: {
    type: "website",
    siteName: "BOS_SH24",
    locale: "de_DE",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
