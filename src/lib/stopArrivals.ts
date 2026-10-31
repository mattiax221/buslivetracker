export type StopArrival = {
  line: string;
  hour: string;
  minutesRemaining: number;
  realtime: boolean;
  statusText: string;
};

type MadbobArrival = {
  line: string;
  hour: string;
  realtime: boolean;
};

/** Live arrivals from gpa.madbob (same source as /api/stops/arrivals). */
export async function fetchStopArrivals(stopCode: string): Promise<StopArrival[]> {
  if (!/^\d+$/.test(stopCode)) return [];

  const res = await fetch(
    `http://gpa.madbob.org/query.php?stop=${encodeURIComponent(stopCode)}`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );
  if (!res.ok) return [];

  const raw = (await res.json()) as MadbobArrival[];
  if (!Array.isArray(raw)) return [];

  const romeTimeStr = new Date().toLocaleTimeString("it-IT", {
    timeZone: "Europe/Rome",
    hour12: false,
  });
  const [nowH, nowM, nowS] = romeTimeStr.split(":").map(Number);
  const nowSec = nowH * 3600 + nowM * 60 + nowS;

  return raw
    .map((item) => {
      const [h, m, s] = String(item.hour || "0:0:0").split(":").map(Number);
      let arrSec = h * 3600 + m * 60 + (s || 0);
      if (arrSec < nowSec - 3600) arrSec += 86400;
      const diffMin = Math.round((arrSec - nowSec) / 60);
      const cleanLine = String(item.line || "").replace(/\s+/g, "").trim().toUpperCase();
      return {
        line: cleanLine || String(item.line || ""),
        hour: String(item.hour || "").slice(0, 5),
        minutesRemaining: Math.max(0, diffMin),
        realtime: !!item.realtime,
        statusText: item.realtime ? "GPS Live" : "Orario programmato",
      };
    })
    .filter((a) => a.minutesRemaining >= 0 && a.minutesRemaining <= 90)
    .sort((a, b) => a.minutesRemaining - b.minutesRemaining);
}
