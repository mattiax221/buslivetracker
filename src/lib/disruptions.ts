/** Disruptions worth showing on the map. Routine notices stay in the alerts list. */

export type AlertLike = {
  header: string;
  cause: string;
  effect: string;
  routes: string[];
};

export type DisruptionKind = "strike" | "suspended" | "detour" | "stop" | "reduced";

export type LineDisruption = {
  line: string;
  kind: DisruptionKind;
  label: string;
  header: string;
};

const RANK: Record<DisruptionKind, number> = {
  strike: 5,
  suspended: 4,
  detour: 3,
  stop: 2,
  reduced: 1,
};

function classify(alert: AlertLike): { kind: DisruptionKind; label: string } | null {
  const header = alert.header.toLowerCase();
  const effect = alert.effect.toLowerCase();
  const cause = alert.cause.toLowerCase();
  if (cause.includes("sciopero") || header.includes("sciopero")) {
    return { kind: "strike", label: "Sciopero" };
  }
  if (effect.includes("deviazione") || header.includes("deviat")) {
    return { kind: "detour", label: "Deviata" };
  }
  if (effect.includes("fermata") || header.includes("fermata")) {
    return { kind: "stop", label: "Fermata cambiata" };
  }
  if (effect.includes("nessun servizio") || header.includes("sospes")) {
    return { kind: "suspended", label: "Senza servizio" };
  }
  if (effect.includes("ridotto") || effect.includes("ritard")) {
    return { kind: "reduced", label: "Ritardi" };
  }
  return null;
}

function lineKey(line: string): string {
  return line.replace(/\s+/g, "").toUpperCase();
}

export function indexDisruptions(alerts: AlertLike[]): {
  byLine: Map<string, LineDisruption>;
  citywide: LineDisruption[];
} {
  const byLine = new Map<string, LineDisruption>();
  const citywide: LineDisruption[] = [];
  for (const alert of alerts) {
    const hit = classify(alert);
    if (!hit) continue;
    const item = {
      kind: hit.kind,
      label: hit.label,
      header: alert.header.trim(),
    };
    const routes = alert.routes.map(lineKey).filter(Boolean);
    if (routes.length === 0) {
      citywide.push({ ...item, line: "" });
      continue;
    }
    for (const line of routes) {
      const prev = byLine.get(line);
      if (prev && RANK[prev.kind] >= RANK[hit.kind]) continue;
      byLine.set(line, { ...item, line });
    }
  }
  return { byLine, citywide };
}

export function disruptionSummary(
  byLine: Map<string, LineDisruption>,
  citywide: LineDisruption[] = []
): {
  text: string;
  tone: "red" | "amber";
} | null {
  if (byLine.size === 0 && citywide.length === 0) return null;
  if (byLine.size === 0) {
    const top = citywide.reduce((best, item) =>
      RANK[item.kind] > RANK[best.kind] ? item : best
    );
    const short =
      top.header.length > 80 ? `${top.header.slice(0, 80).trim()}…` : top.header;
    const header = short ? ` · ${short}` : "";
    return {
      text: `${top.label}${header}`,
      tone: top.kind === "strike" || top.kind === "suspended" ? "red" : "amber",
    };
  }
  const items = [...byLine.values()];
  const top = items.reduce((best, item) => (RANK[item.kind] > RANK[best.kind] ? item : best));
  const ofKind = items.filter((item) => item.kind === top.kind);
  const tone = top.kind === "strike" || top.kind === "suspended" ? "red" : "amber";
  const extra = items.length - ofKind.length;

  let text: string;
  if (ofKind.length === 1) {
    text =
      top.kind === "detour"
        ? `Linea ${ofKind[0].line} deviata`
        : top.kind === "strike"
          ? `Sciopero sulla linea ${ofKind[0].line}`
          : top.kind === "suspended"
            ? `Linea ${ofKind[0].line} senza servizio`
            : top.kind === "stop"
              ? `Fermata cambiata sulla linea ${ofKind[0].line}`
              : `Ritardi sulla linea ${ofKind[0].line}`;
  } else if (top.kind === "detour") {
    text = `${ofKind.length} linee deviate`;
  } else if (top.kind === "strike") {
    text = `Sciopero su ${ofKind.length} linee`;
  } else if (top.kind === "suspended") {
    text = `${ofKind.length} linee senza servizio`;
  } else if (top.kind === "stop") {
    text = `Fermate cambiate su ${ofKind.length} linee`;
  } else {
    text = `Ritardi su ${ofKind.length} linee`;
  }

  const detours = items.filter((item) => item.kind === "detour").length;
  if (top.kind !== "detour" && detours > 0) {
    text += detours === 1 ? " · 1 linea deviata" : ` · ${detours} linee deviate`;
  } else if (extra > 0) {
    const rest = items.filter((item) => item.kind !== top.kind);
    const next = rest.reduce((best, item) => (RANK[item.kind] > RANK[best.kind] ? item : best));
    const nextCount = rest.filter((item) => item.kind === next.kind).length;
    const nextText =
      next.kind === "suspended"
        ? nextCount === 1
          ? "1 linea senza servizio"
          : `${nextCount} linee senza servizio`
        : next.kind === "stop"
          ? "fermate cambiate"
          : "ritardi su altre linee";
    text += ` · ${nextText}`;
  }
  return { text, tone };
}
