import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 bg-gradient-to-b from-slate-50 via-white to-blue-50">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 w-16 h-16 rounded-[1.15rem] overflow-hidden shadow-lg shadow-blue-500/25 bg-[#0B5FFF]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-[#0B5FFF] font-black text-sm tracking-wide uppercase mb-2">
          GTT Live
        </p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
          Pagina non trovata
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Questo indirizzo non esiste. Torna alla mappa live di bus e tram a
          Torino.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-2xl bg-[#0B5FFF] text-white font-bold text-sm px-6 py-3.5 shadow-md shadow-blue-500/30 active:scale-[0.98] transition-transform"
        >
          Apri la mappa
        </Link>
      </div>
    </main>
  );
}
