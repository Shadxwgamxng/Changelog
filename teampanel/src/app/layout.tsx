import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/600.css";
import "@fontsource/oswald/700.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";

export const metadata: Metadata = {
  title: { default: "SH Airsoft Kommando – Team Panel", template: "%s · SH Airsoft Kommando" },
  description: "Internes Team Panel des Schleswig-Holstein Airsoft Kommandos.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0c0e0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
