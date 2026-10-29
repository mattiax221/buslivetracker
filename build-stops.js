const fs = require("fs");
const readline = require("readline");
const path = require("path");

async function processStops() {
  const inputPath = path.resolve(__dirname, "../gtt_gtfs_extracted/stops.txt");
  const outputPath = path.resolve(__dirname, "public/stops.json");

  const fileStream = fs.createReadStream(inputPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const stops = [];
  let isHeader = true;

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;

    // CSV parser handling quoted values
    const parts = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g).map(p => {
      let v = p.startsWith(",") ? p.slice(1) : p;
      if (v.startsWith('"') && v.endsWith('"')) {
        v = v.slice(1, -1).replace(/""/g, '"');
      }
      return v.trim();
    });

    const [stopId, stopCode, stopName, stopDesc, stopLat, stopLon] = parts;

    if (!stopCode || !stopLat || !stopLon) continue;

    const lat = parseFloat(stopLat);
    const lon = parseFloat(stopLon);
    if (isNaN(lat) || isNaN(lon)) continue;

    // Clean name: "Fermata 10 - RUBIANA" -> "RUBIANA"
    let cleanName = stopName.replace(/^Fermata\s+\d+\s*-\s*/i, "").trim();

    stops.push({
      c: stopCode,                          // Code (palina)
      n: cleanName || stopName,             // Name
      d: stopDesc || "",                    // Description/street
      lat: Math.round(lat * 100000) / 100000,
      lon: Math.round(lon * 100000) / 100000,
    });
  }

  fs.writeFileSync(outputPath, JSON.stringify(stops));
  const stats = fs.statSync(outputPath);
  console.log(`Generated ${stops.length} stops -> ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

processStops().catch(console.error);

