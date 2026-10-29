import { NextResponse } from "next/server";

interface MadbobArrival {
  line: string;
  hour: string; // "HH:MM:SS"
  realtime: boolean;
}

export interface StopArrival {
  line: string;
  hour: string;
  minutesRemaining: number;
  realtime: boolean;
  statusText: string;
}

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
    const upstreamUrl = `http://gpa.madbob.org/query.php?stop=${encodeURIComponent(
      stopCode
    )}`;

    const res = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${res.status}` },
        { status: 502 }
      );
    }

    const raw: MadbobArrival[] = await res.json();
    if (!Array.isArray(raw)) {
      return NextResponse.json({ arrivals: [], stopCode });
    }

    // Current time in Rome
    const now = new Date();
    const romeTimeStr = now.toLocaleTimeString("it-IT", {
      timeZone: "Europe/Rome",
      hour12: false,
    });
    const [nowH, nowM, nowS] = romeTimeStr.split(":").map(Number);
    const nowSec = nowH * 3600 + nowM * 60 + nowS;

    const arrivals: StopArrival[] = raw
      .map((item) => {
        const [h, m, s] = item.hour.split(":").map(Number);
        let arrSec = h * 3600 + m * 60 + (s || 0);

        // Handle midnight wrap-around
        if (arrSec < nowSec - 3600) {
          arrSec += 86400;
        }

        const diffSec = arrSec - nowSec;
        const diffMin = Math.round(diffSec / 60);

        let statusText = "In orario";
        if (!item.realtime) {
          statusText = "Orario programmato";
        } else {
          statusText = "GPS Live";
        }

        return {
          line: item.line,
          hour: item.hour.slice(0, 5), // "HH:MM"
          minutesRemaining: Math.max(0, diffMin),
          realtime: item.realtime,
          statusText,
        };
      })
      .filter((a) => a.minutesRemaining >= 0 && a.minutesRemaining <= 90)
      .sort((a, b) => a.minutesRemaining - b.minutesRemaining);

    return NextResponse.json({
      stopCode,
      arrivals,
      count: arrivals.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Arrivals API error:", err);
    return NextResponse.json(
      { error: "Errore recupero arrivi", message: err.message },
      { status: 500 }
    );
  }
}

