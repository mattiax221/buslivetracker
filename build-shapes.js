const fs = require("fs");
const readline = require("readline");
const path = require("path");

function parseCSVLine(line) {
  return line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g).map(p => {
    let v = p.startsWith(",") ? p.slice(1) : p;
    if (v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1).replace(/""/g, '"');
    }
    return v.trim();
  });
}

async function buildShapes() {
  console.log("1. Mapping routes to best shapes with CSV parser...");
  const tripsStream = fs.createReadStream(path.resolve(__dirname, "../gtt_gtfs_extracted/trips.txt"));
  const rlTrips = readline.createInterface({ input: tripsStream, crlfDelay: Infinity });

  // line -> directionId -> shapeId -> { count, headsign }
  const lineDirShapes = {};

  let isHeader = true;
  for await (const line of rlTrips) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;

    const parts = parseCSVLine(line);
    const routeId = parts[0];
    const headsign = parts[3];
    const directionId = parts[5];
    const shapeId = parts[7];

    if (!routeId || !shapeId) continue;

    let cleanLine = routeId;
    if (/([0-9]|CD|CS)[UES]$/i.test(cleanLine)) {
      cleanLine = cleanLine.slice(0, -1);
    }
    cleanLine = cleanLine.replace(/\s+/g, "").trim();

    const dir = directionId || "0";
    if (!lineDirShapes[cleanLine]) lineDirShapes[cleanLine] = {};
    if (!lineDirShapes[cleanLine][dir]) lineDirShapes[cleanLine][dir] = {};
    if (!lineDirShapes[cleanLine][dir][shapeId]) {
      lineDirShapes[cleanLine][dir][shapeId] = { shapeId, headsign: headsign || "", count: 0 };
    }
    lineDirShapes[cleanLine][dir][shapeId].count++;
  }

  // Pick top shape for each direction
  const targetShapes = new Set();
  const lineToShapeMeta = {};

  for (const [line, dirs] of Object.entries(lineDirShapes)) {
    lineToShapeMeta[line] = [];
    for (const [dir, shapes] of Object.entries(dirs)) {
      // Sort by trip count descending
      const sorted = Object.values(shapes).sort((a, b) => b.count - a.count);
      const best = sorted[0];
      if (best) {
        targetShapes.add(best.shapeId);
        lineToShapeMeta[line].push({
          dir,
          shapeId: best.shapeId,
          headsign: best.headsign,
          trips: best.count,
        });
      }
    }
  }

  console.log(`Found ${Object.keys(lineToShapeMeta).length} lines. Target shapes count: ${targetShapes.size}`);
  console.log("Sample Line 4 targets:", lineToShapeMeta["4"]);
  console.log("Sample Line 15 targets:", lineToShapeMeta["15"]);

  console.log("2. Extracting points from shapes.txt...");
  const shapesStream = fs.createReadStream(path.resolve(__dirname, "../gtt_gtfs_extracted/shapes.txt"));
  const rlShapes = readline.createInterface({ input: shapesStream, crlfDelay: Infinity });

  // shapeId -> [[lat, lon], ...]
  const shapePoints = {};

  isHeader = true;
  for await (const line of rlShapes) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;

    const parts = parseCSVLine(line);
    const shapeId = parts[0];
    const latStr = parts[1];
    const lonStr = parts[2];

    if (!targetShapes.has(shapeId)) continue;

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon)) continue;

    if (!shapePoints[shapeId]) shapePoints[shapeId] = [];
    shapePoints[shapeId].push([
      Math.round(lat * 100000) / 100000,
      Math.round(lon * 100000) / 100000,
    ]);
  }

  // Combine into final line dictionary
  const finalLineShapes = {};
  for (const [line, metas] of Object.entries(lineToShapeMeta)) {
    finalLineShapes[line] = [];
    for (const meta of metas) {
      const pts = shapePoints[meta.shapeId];
      if (pts && pts.length > 0) {
        finalLineShapes[line].push({
          dir: meta.dir,
          headsign: meta.headsign,
          pts,
        });
      }
    }
  }

  const outPath = path.resolve(__dirname, "public/line-shapes.json");
  fs.writeFileSync(outPath, JSON.stringify(finalLineShapes));
  const stats = fs.statSync(outPath);
  console.log(`SUCCESS! Saved line shapes to ${outPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`Line 4: ${finalLineShapes["4"]?.length} directions. D0: ${finalLineShapes["4"]?.[0]?.pts?.length} pts, D1: ${finalLineShapes["4"]?.[1]?.pts?.length} pts`);
  console.log(`Line 15: ${finalLineShapes["15"]?.length} directions. D0: ${finalLineShapes["15"]?.[0]?.pts?.length} pts, D1: ${finalLineShapes["15"]?.[1]?.pts?.length} pts`);
}

buildShapes().catch(console.error);
