const fs = require("fs");
const path = require("path");

const inputPath = path.resolve("C:/Users/mattiax/.gemini/antigravity/scratch/gtt_gtfs_extracted/routes.txt");
const outputPath = path.resolve("C:/Users/mattiax/.gemini/antigravity/scratch/gtt-live/public/routes.json");

const content = fs.readFileSync(inputPath, "utf8");
const lines = content.split(/\r?\n/);

const TRAM_SET = new Set([
  "3", "3/", "3B",
  "4", "4/", "4B",
  "7",
  "9", "9/", "9B",
  "10", "10/", "10B",
  "13", "13/",
  "15", "15/",
  "16", "16CD", "16CS", "16 CD", "16 CS",
  "79",
]);

function isTram(line) {
  const clean = line.replace(/\s+/g, "").toUpperCase();
  if (TRAM_SET.has(clean) || TRAM_SET.has(line)) return true;
  if (/^16(CD|CS)?$/i.test(clean)) return true;
  return false;
}

function cleanRouteId(raw) {
  let s = raw.trim();
  // If ends with U/E/S preceded by digit or CD/CS, strip trailing U/E/S
  if (/([0-9]|CD|CS)[UES]$/i.test(s)) {
    s = s.slice(0, -1);
  }
  return s.replace(/\s+/g, "").trim();
}

const routes = [];
const seen = new Set();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g).map(p => {
    let v = p.startsWith(",") ? p.slice(1) : p;
    if (v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1).replace(/""/g, '"');
    }
    return v.trim();
  });

  const [routeId, bacino, routeShortName, routeLongName, routeDesc, routeType] = parts;
  if (!routeShortName) continue;

  const cleanLine = cleanRouteId(routeShortName);
  if (!cleanLine || seen.has(cleanLine)) continue;
  seen.add(cleanLine);

  routes.push({
    id: cleanLine,
    name: cleanLine,
    longName: routeLongName || "",
    isTram: isTram(cleanLine),
  });
}

// Natural sort
routes.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }));

fs.writeFileSync(outputPath, JSON.stringify(routes));
const trams = routes.filter(r => r.isTram).map(r => r.id);
console.log(`Updated routes.json! Recognized ${trams.length} Tram lines:`, trams);
