"use client";

import dynamic from "next/dynamic";
import PermissionsPrompt from "@/components/PermissionsPrompt";

const BusMap = dynamic(() => import("@/components/BusMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-dvh flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="flex flex-col items-center gap-4 chrome-enter">
        <div className="w-16 h-16 rounded-[1.15rem] overflow-hidden shadow-lg shadow-blue-500/30 bg-[#0B5FFF]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt=""
            className="w-full h-full object-cover"
          />
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
      <PermissionsPrompt />
    </main>
  );
}
