import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HelferNet – DRK Verwaltung", short_name: "HelferNet", description: "Dienstplanung und Helferverwaltung für DRK-Gliederungen",
    start_url: "/", display: "standalone", background_color: "#0b0b0b", theme_color: "#f0500a", lang: "de", orientation: "portrait",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
    shortcuts: [{ name: "Dienste", url: "/shifts" }, { name: "Kalender", url: "/calendar" }, { name: "Verfügbarkeit", url: "/availability" }],
  };
}
