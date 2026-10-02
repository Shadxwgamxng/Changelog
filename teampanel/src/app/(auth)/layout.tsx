import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo-512.webp" alt="Schleswig-Holstein Airsoft Kommando" width={120} height={120} unoptimized priority className="mb-4 h-28 w-28 rounded-full" />
          <h1 className="text-2xl font-semibold uppercase tracking-[0.12em]">SH Airsoft Kommando</h1>
          <p className="label-caps mt-1 text-accent-400">Team Panel · Wind von vorn</p>
        </div>
        <div className="panel panel-tac p-6 sm:p-7">{children}</div>
        <p className="mt-6 text-center text-xs text-subtle">Interner Bereich – nur für Teammitglieder.</p>
      </div>
    </div>
  );
}
