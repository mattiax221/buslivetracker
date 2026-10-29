import { NextResponse } from "next/server";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const ALERTS_URL = "https://percorsieorari.gtt.to.it/das_gtfsrt/alerts.aspx";

export interface ServiceAlert {
  id: string;
  header: string;
  description: string;
  cause: string;
  effect: string;
  routes: string[];
  startsAt?: string;
  endsAt?: string;
}

const CAUSE_NAMES: Record<number, string> = {
  1: "Altro",
  2: "Lavori stradali",
  3: "Incidente",
  4: "Meteo avverso",
  5: "Manifestazione",
  6: "Sciopero",
  7: "Guasto tecnico",
  8: "Manutenzione",
  9: "Traffico",
};

const EFFECT_NAMES: Record<number, string> = {
  1: "Nessun servizio",
  2: "Servizio ridotto",
  3: "Ritardi consistenti",
  4: "Deviazione di percorso",
  5: "Fermata soppressa",
  6: "Fermata provvisoria",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lineFilter = searchParams.get("line")?.trim().toUpperCase();

  try {
    const res = await fetch(ALERTS_URL, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Feed alerts non disponibile", status: res.status },
        { status: 502 }
      );
    }

    const buffer = await res.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    const alerts: ServiceAlert[] = [];

    for (const entity of feed.entity) {
      const a = entity.alert;
      if (!a) continue;

      const header =
        a.headerText?.translation?.[0]?.text?.trim() ||
        "Avviso di servizio GTT";
      const description =
        a.descriptionText?.translation?.[0]?.text?.trim() || "";

      // Extract informed lines
      const routes = Array.from(
        new Set(
          (a.informedEntity || [])
            .map((ie) => {
              const r = ie.routeId || "";
              return r.replace(/[UES]$/i, "").trim();
            })
            .filter((r) => r.length > 0)
        )
      );

      // If user requested a line filter, check if matches
      if (lineFilter) {
        const matchesRoute = routes.includes(lineFilter);
        const matchesText =
          header.toUpperCase().includes(`LINEA ${lineFilter}`) ||
          header.toUpperCase().includes(`LINEE ${lineFilter}`) ||
          description.toUpperCase().includes(`LINEA ${lineFilter}`);

        if (!matchesRoute && !matchesText) continue;
      }

      const activePeriod = a.activePeriod?.[0];

      alerts.push({
        id: entity.id || `${Math.random()}`,
        header,
        description,
        cause: CAUSE_NAMES[a.cause ?? 1] || "Avviso",
        effect: EFFECT_NAMES[a.effect ?? 4] || "Modifica servizio",
        routes,
        startsAt: activePeriod?.start
          ? new Date(Number(activePeriod.start) * 1000).toISOString()
          : undefined,
        endsAt: activePeriod?.end
          ? new Date(Number(activePeriod.end) * 1000).toISOString()
          : undefined,
      });
    }

    return NextResponse.json({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Alerts API error:", err);
    return NextResponse.json(
      { error: "Errore parsing alerts", message: err.message },
      { status: 500 }
    );
  }
}

