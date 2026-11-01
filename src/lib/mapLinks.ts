/** Shareable map URLs: /linea/68 and /fermata/3151. Also accepts ?line= and ?stop=. */

export function linePath(line: string): string {
  const id = line.trim();
  if (!id) return "/";
  return `/linea/${encodeURIComponent(id)}`;
}

export function stopPath(code: string): string {
  const id = code.trim();
  if (!id) return "/";
  return `/fermata/${encodeURIComponent(id)}`;
}

export function parseMapLink(
  pathname: string,
  search: string
): { line?: string; stop?: string } {
  const params = new URLSearchParams(search);
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "linea" && parts[1]) {
    return { line: safeDecode(parts[1]) };
  }
  if (parts[0] === "fermata" && parts[1]) {
    return { stop: safeDecode(parts[1]) };
  }
  const stop = params.get("stop")?.trim();
  const line = params.get("line")?.trim();
  if (stop) return { stop };
  if (line) return { line };
  return {};
}

/** One line or one stop keeps a pretty URL. A trip with several lines stays on the map root. */
export function pathForMapSelection(
  stopCode: string | null,
  lines: Iterable<string>
): string {
  if (stopCode) return stopPath(stopCode);
  const list = Array.from(lines);
  if (list.length === 1) return linePath(list[0]);
  if (
    list.length === 2 &&
    list.includes("16CD") &&
    list.includes("16CS")
  ) {
    return linePath("16");
  }
  return "/";
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function titleForMapPath(path: string): string {
  if (path.startsWith("/linea/")) {
    const id = safeDecode(path.slice("/linea/".length)).slice(0, 16);
    return `Linea ${id} — GTT Live`;
  }
  if (path.startsWith("/fermata/")) {
    const id = safeDecode(path.slice("/fermata/".length)).slice(0, 16);
    return `Fermata ${id} — GTT Live`;
  }
  return "GTT Live — Torino Bus & Tram Tracker";
}
