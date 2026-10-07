import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa";

export const metadata: Metadata = {
  title: { default: "HYPAX", template: "%s · HYPAX" },
  description: "Verwaltungs- und Organisationssystem für DRK-Gliederungen: Helfer, Dienste, Qualifikationen, Fahrzeuge, Material und Alarmierung.",
  applicationName: "HYPAX",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "HYPAX", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#edecea" }, { media: "(prefers-color-scheme: dark)", color: "#101010" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{var d=document.documentElement,t=localStorage.getItem('hxTheme');if(t)d.dataset.theme=t;if(localStorage.getItem('hxCollapsed')==='1')d.classList.add('is-collapsed')}catch(e){}" }} /></head>
      <body className="min-h-dvh font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-pop">Zum Inhalt springen</a>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
