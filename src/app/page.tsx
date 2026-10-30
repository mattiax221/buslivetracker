"use client";

import dynamic from "next/dynamic";

const BusMap = dynamic(() => import("@/components/BusMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-dvh flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="flex flex-col items-center gap-4 chrome-enter">
        <div className="w-14 h-14 rounded-2xl bg-[#0B5FFF] text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
          <svg
            viewBox="0 0 24 24"
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 6v6" />
            <path d="M16 6v6" />
            <path d="M2 12h20" />
            <path d="M7 18h0" />
            <path d="M17 18h0" />
            <rect x="4" y="3" width="16" height="16" rx="2" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-slate-900 font-black tracking-tight">GTT Live</p>
          <p className="text-slate-500 text-xs font-medium mt-1 flex items-center justify-center gap-1.5">
            <span className="live-dot live-dot--on" />
            Preparo la mappa…
          </p>
        </div>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-full h-dvh overflow-hidden">
      <BusMap />
    </main>
  );
}
