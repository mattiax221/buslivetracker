import { NextResponse } from "next/server";
import { METRO_M1_ACCESSIBILITY } from "@/lib/metroAccessibility";

export async function GET() {
  const operationalElevators = METRO_M1_ACCESSIBILITY.filter(
    (s) =>
      s.elevators.streetToAtrium === "OPERATIONAL" &&
      s.elevators.atriumToFermi === "OPERATIONAL" &&
      s.elevators.atriumToBengasi === "OPERATIONAL"
  ).length;

  return NextResponse.json({
    stations: METRO_M1_ACCESSIBILITY,
    totalStations: METRO_M1_ACCESSIBILITY.length,
    fullyOperationalStations: operationalElevators,
    systemStatus: operationalElevators === METRO_M1_ACCESSIBILITY.length ? "EXCELLENT" : "GOOD",
    pmrAccessibilityPercent: 100,
    timestamp: new Date().toISOString(),
  });
}
