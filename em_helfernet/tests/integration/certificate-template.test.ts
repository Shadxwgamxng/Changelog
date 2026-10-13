import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { scenario, mkAccountHelper } from "./fixtures";
import { HttpError } from "../../src/server/errors";
import { getCertificateTemplate, resetCertificateTemplate, sampleCertificate, saveCertificateTemplate, type TemplateInput } from "../../src/server/services/certificate-template";
import { renderCertificatePdf } from "../../src/server/certificate-pdf";
import { DEFAULT_CERT_TEMPLATE } from "../../src/lib/certificate-template";

let S: Awaited<ReturnType<typeof scenario>>;
beforeEach(async () => { S = await scenario(); });
const rejects = (p: Promise<unknown>, status: number, msg?: RegExp) => assert.rejects(p, (e: unknown) => e instanceof HttpError && e.status === status && (!msg || msg.test(e.message)));
// kleinstes gültiges PNG (1×1)
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const input = (extra: Partial<TemplateInput> = {}): TemplateInput => ({ ...DEFAULT_CERT_TEMPLATE, orgName: "LSMD", title: "Urkunde", footerText: "", body: "# {name}\n{lehrgang}", ...extra } as TemplateInput);

test("Zertifikat-Vorlage: Standard, Speichern mit Bildern, Validierung, Zurücksetzen", async () => {
  assert.equal((await getCertificateTemplate()).title, "Zertifikat");
  await saveCertificateTemplate(S.adminCtx, input({ font: "Times", accentColor: "#123abc", logoMode: "EIGENES", sig1Mode: "BILD", images: { logo: { mime: "image/png", data: PNG }, sig1: { mime: "image/png", data: PNG }, background: { mime: "image/png", data: PNG } } }));
  let t = await getCertificateTemplate();
  assert.equal(t.title, "Urkunde");
  assert.equal(t.font, "Times");
  assert.ok(t.logo && t.sig1Image && t.background);
  const pdf = await renderCertificatePdf(sampleCertificate(), t);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");

  // Bild entfernen, andere bleiben
  await saveCertificateTemplate(S.adminCtx, input({ logoMode: "EIGENES", sig1Mode: "AUTO", images: { sig1: null } }));
  t = await getCertificateTemplate();
  assert.equal(t.sig1Image, null);
  assert.ok(t.logo);

  await rejects(saveCertificateTemplate(S.adminCtx, input({ images: { logo: { mime: "image/png", data: Buffer.from("kein bild") } } })), 400, /passt nicht/);
  await rejects(saveCertificateTemplate(S.adminCtx, input({ images: { logo: { mime: "image/gif", data: PNG } } })), 400, /PNG oder JPG/);
  await rejects(saveCertificateTemplate(S.adminCtx, input({ accentColor: "rot" })), 400);
  await rejects(saveCertificateTemplate(S.adminCtx, input({ font: "Comic" })), 400);
  await rejects(saveCertificateTemplate(S.adminCtx, input({ title: " " })), 400);

  // automatische Unterschriften in allen Handschriften
  for (const signatureFont of ["GREAT_VIBES", "SAINT_DELAFIELD", "MUELLERHOFF"]) {
    await saveCertificateTemplate(S.adminCtx, input({ logoMode: "EIGENES", sig1Mode: "AUTO", sig2Mode: "AUTO", signatureFont, signatureForm: "VOLL", signatureInk: "#000000" }));
    const pdf2 = await renderCertificatePdf(sampleCertificate(), await getCertificateTemplate());
    assert.equal(pdf2.subarray(0, 5).toString(), "%PDF-");
    assert.ok(pdf2.toString("latin1").includes("FontFile2") || pdf2.length > 10_000, "Handschrift eingebettet");
  }
  await rejects(saveCertificateTemplate(S.adminCtx, input({ logoMode: "EIGENES", signatureFont: "Comic" })), 400);
  await rejects(saveCertificateTemplate(S.adminCtx, input({ logoMode: "EIGENES", sig1Mode: "BILD" })), 400, /Bild hochladen/);

  await resetCertificateTemplate(S.adminCtx);
  assert.equal((await getCertificateTemplate()).title, "Zertifikat");
  await rejects(saveCertificateTemplate(S.adminCtx, input({ logoMode: "EIGENES" })), 400, /Bild hochladen/);
});

test("Zertifikat-Vorlage: nur Systemadministration", async () => {
  const leitung = await mkAccountHelper(S.ovA.id, "Lea", "Leitung", "EINHEITENLEITER");
  await rejects(saveCertificateTemplate(leitung.ctx, input()), 403);
  await rejects(resetCertificateTemplate(leitung.ctx), 403);
});
