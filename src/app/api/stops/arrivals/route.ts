import { NextResponse } from "next/server";
import { fetchStopArrivals } from "../../../../lib/stopArrivals";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stopCode = searchParams.get("stop");

  if (!stopCode || !/^\d+$/.test(stopCode)) {
    return NextResponse.json(
      { error: "Parametro 'stop' non valido (deve essere numerico)" },
      { status: 400 }
    );
  }

  try {
    const arrivals = await fetchStopArrivals(stopCode);
    return NextResponse.json({
      stopCode,
      arrivals,
      count: arrivals.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("Arrivals API error:", err);
    return NextResponse.json(
      {
        error: "Errore recupero arrivi",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 }
    );
  }
}

