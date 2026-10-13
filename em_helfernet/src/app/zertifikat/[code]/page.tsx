// Öffentliche Echtheitsprüfung eines Zertifikats (Link/QR-Code auf dem PDF).
import { BadgeCheck, ShieldX } from "lucide-react";
import { verifyCertificate } from "@/server/services/courses";
import { EfMark } from "@/components/brand";
import { fmtDate } from "@/lib/dates";

export const metadata = { title: "Zertifikat prüfen", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const c = await verifyCertificate((await params).code);
  const valid = c && !c.revokedAt;
  const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-4 border-b border-line py-2 text-sm last:border-0"><span className="text-fg-muted">{k}</span><span className="text-right font-medium">{v}</span></div>;
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <EfMark className="h-10 w-[4.3rem] text-brand-600" label="EmergencyForge" />
        <div><h1 className="text-xl font-semibold tracking-tight">Zertifikatsprüfung</h1><p className="text-sm text-fg-muted">HelferNet</p></div>
      </div>
      <div className="card card-pad">
        {!c ? (
          <div className="flex items-start gap-3"><ShieldX className="h-7 w-7 shrink-0 text-danger" /><div><p className="font-semibold">Kein Zertifikat gefunden</p><p className="text-sm text-fg-muted">Der Prüf-Link ist ungültig. Bitte prüfe, ob er vollständig übernommen wurde.</p></div></div>
        ) : (
          <>
            <div className="mb-4 flex items-start gap-3">
              {valid ? <BadgeCheck className="h-7 w-7 shrink-0 text-ok" /> : <ShieldX className="h-7 w-7 shrink-0 text-danger" />}
              <div><p className="font-semibold">{valid ? "Dieses Zertifikat ist echt und gültig." : "Dieses Zertifikat wurde widerrufen."}</p>{!valid && c.revokeReason && <p className="text-sm text-fg-muted">Grund: {c.revokeReason}</p>}</div>
            </div>
            <Row k="Inhaber/in" v={c.holderName} />
            <Row k="Lehrgang" v={c.courseTitle} />
            {c.qualificationName && <Row k="Qualifikation" v={c.qualificationName} />}
            <Row k="Zeitraum" v={fmtDate(c.courseStartsAt) === fmtDate(c.courseEndsAt) ? fmtDate(c.courseStartsAt) : `${fmtDate(c.courseStartsAt)} – ${fmtDate(c.courseEndsAt)}`} />
            {c.validUntil && <Row k="Gültig bis" v={fmtDate(c.validUntil)} />}
            <Row k="Ausgestellt von" v={c.unitName} />
            <Row k="Ausgestellt am" v={fmtDate(c.issuedAt)} />
            <Row k="Nummer" v={c.number} />
          </>
        )}
      </div>
    </main>
  );
}
