import { NextRequest, NextResponse } from "next/server";

type GeoHit = {
  name: string;
  label: string;
  lat: number;
  lon: number;
  kind: "street" | "address" | "place";
};

const TORINO_VIEWBOX = "7.5,45.15,7.85,44.95"; // lon_max,lat_max,lon_min,lat_min for Nominatim

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] as GeoHit[] });
  }
  if (q.length > 80) {
    return NextResponse.json({ error: "Query troppo lunga" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${q}, Torino`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "it");
  url.searchParams.set("viewbox", TORINO_VIEWBOX);
  url.searchParams.set("bounded", "1");

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "GTT-Live/1.0 (https://github.com/mattiax221/buslivetracker)",
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoding non disponibile", results: [] as GeoHit[] },
        { status: 502 }
      );
    }
    const raw = (await res.json()) as Array<{
      lat: string;
      lon: string;
      name?: string;
      display_name?: string;
      class?: string;
      type?: string;
      addresstype?: string;
    }>;

    const results: GeoHit[] = [];
    const seen = new Set<string>();
    for (const row of raw) {
      const lat = Number(row.lat);
      const lon = Number(row.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (lat < 44.85 || lat > 45.25 || lon < 7.4 || lon > 8.0) continue;
      const name = (row.name || row.display_name || q).split(",")[0].trim();
      const label = (row.display_name || name).replace(/, Italia$/i, "");
      const key = `${name}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const kind: GeoHit["kind"] =
        row.class === "highway" || row.addresstype === "road"
          ? "street"
          : row.class === "place" || row.class === "boundary"
            ? "place"
            : "address";
      results.push({ name, label, lat, lon, kind });
    }
    return NextResponse.json({ results });
  } catch (err) {
    console.warn("geocode failed", err);
    return NextResponse.json(
      { error: "Geocoding fallito", results: [] as GeoHit[] },
      { status: 502 }
    );
  }
}
