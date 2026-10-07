// Erzeugt die PNG-Icons für Manifest/iOS aus dem SVG-Logo (benötigt Playwright-Chromium).
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const PATH = readFileSync("public/brand/ef-mark.svg", "utf8").match(/<path[^>]*d="([^"]+)"/)[1];

// EmergencyForge-Bildmarke (702×410) mittig auf dunklem Grund; "pad" = Maskable-Variante mit größerem Rand
const logo = (size, pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" rx="${pad ? 0 : 12}" fill="#0b0b0b"/><g transform="translate(32 32) scale(${pad ? 0.0575 : 0.0775}) translate(-351 -205)"><path fill="#f0500a" fill-rule="evenodd" d="${PATH}"/></g></svg>`;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
for (const [name, size, pad] of [["icon-192.png", 192, false], ["icon-512.png", 512, false], ["icon-maskable-512.png", 512, true], ["apple-icon.png", 180, true]]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<style>html,body{margin:0}</style>${logo(size, pad)}`);
  writeFileSync(name === "apple-icon.png" ? "src/app/apple-icon.png" : `public/${name}`, await p.screenshot({ omitBackground: false }));
  await p.close();
}
await browser.close();
