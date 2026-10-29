"use client";

import dynamic from "next/dynamic";

/* Leaflet needs `window` — load only on the client */
const BusMap = dynamic(() => import("@/components/BusMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-dvh flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl animate-bounce">🚌</div>
        <p className="text-gray-500 text-sm animate-pulse">
          Caricamento mappa...
        </p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-full h-dvh">
      <BusMap />
    </main>
  );
}
