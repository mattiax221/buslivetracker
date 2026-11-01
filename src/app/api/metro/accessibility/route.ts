import { NextResponse } from "next/server";
import { METRO_M1_ACCESSIBILITY } from "@/lib/metroAccessibility";

export async function GET() {
  return NextResponse.json({
    live: false,
    note: "Scheda di impianto delle stazioni. Non è lo stato degli ascensori in questo momento.",
    stations: METRO_M1_ACCESSIBILITY,
    totalStations: METRO_M1_ACCESSIBILITY.length,
  });
}
