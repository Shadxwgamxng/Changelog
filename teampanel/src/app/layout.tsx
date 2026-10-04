import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/600.css";
import "@fontsource/oswald/700.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";
import { RegisterServiceWorker } from "@/components/layout/register-sw";

export const metadata: Metadata = {
  title: { default: "SH Airsoft Kommando – Team Panel", template: "%s · SH Airsoft Kommando" },
  description: "Internes Team Panel des Schleswig-Holstein Airsoft Kommandos.",
  robots: { index: false, follow: false },
  applicationName: "SAK Panel",
  appleWebApp: { capable: true, title: "SAK Panel", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0c0e0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <RegisterServiceWorker />
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
