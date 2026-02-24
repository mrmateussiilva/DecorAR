import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#1e293b,_#020617)] p-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-300">DecorAR</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          Base SaaS para preview 3D de imagens
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Estrutura inicial com Next.js App Router, TailwindCSS e React Three Fiber pronta para
          evoluir com WebXR.
        </p>
        <Link
          href="/ar"
          className="mt-6 inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
        >
          Abrir workspace AR
        </Link>
      </div>
    </main>
  );
}
