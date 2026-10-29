const fs = require("fs");
const path = require("path");
const readline = require("readline");

async function main() {
  console.log("Reading routes...");
  const routesTxt = fs.readFileSync(path.resolve(__dirname, "../../gtt_gtfs_extracted/routes.txt"), "utf8");
  const routeMap = {}; // route_id -> clean line
  for (const line of routesTxt.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    const routeId = parts[0];
    let shortName = parts[2] || "";
    if (shortName.startsWith('"') && shortName.endsWith('"')) shortName = shortName.slice(1, -1);
    let clean = shortName.replace(/\s+/g, "").trim();
    if (/([0-9]|CD|CS)[UES]$/i.test(clean)) clean = clean.slice(0, -1);
    routeMap[routeId] = clean;
  }

  console.log("Reading trips...");
  // trip_id -> { line, dir, headsign, shapeId }
  const tripsTxt = fs.readFileSync(path.resolve(__dirname, "../../gtt_gtfs_extracted/trips.txt"), "utf8");
  const tripInfo = {};
  for (const line of tripsTxt.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    const routeId = parts[0];
    const tripId = parts[2];
    const headsign = (parts[3] || "").replace(/"/g, "").trim();
    const dir = parts[5] || "0";
    const lineName = routeMap[routeId];
    if (lineName) {
      tripInfo[tripId] = { line: lineName, dir, headsign };
    }
  }
  console.log(`Mapped ${Object.keys(tripInfo).length} trips.`);

  console.log("Streaming stop_times.txt to group stops per line and direction...");
  const stopTimesPath = path.resolve(__dirname, "../../gtt_gtfs_extracted/stop_times.txt");
  const rl = readline.createInterface({
    input: fs.createReadStream(stopTimesPath),
    crlfDelay: Infinity,
  });

  // We want to find representative stop sequences for each (line, dir)
  // Let's store: tripStopCounts[tripId] = [stopCode, stopCode...]
  // Since stop_times is huge (118MB), let's track the longest stop sequence per (line, dir)
  const lineDirPatterns = {}; // key: `${line}_${dir}` -> Map of tripId -> array of { seq, stopId }
  const stopLinesMap = {}; // stopId -> Set of lines

  let lineCount = 0;
  // We can collect trips by selecting the first few representative trips for each (line, dir)
  const sampledTrips = new Map(); // tripId -> { line, dir, stops: [] }
  const lineDirTrips = new Map(); // `${line}_${dir}` -> Set of tripIds (limit to 3 per line_dir)

  for await (const rawLine of rl) {
    lineCount++;
    if (lineCount === 1) continue; // header
    const parts = rawLine.split(",");
    const tripId = parts[0];
    const stopId = parts[3];
    const stopSeq = parseInt(parts[4], 10);

    const trip = tripInfo[tripId];
    if (!trip) continue;

    const key = `${trip.line}_${trip.dir}`;
    if (!lineDirTrips.has(key)) {
      lineDirTrips.set(key, new Set());
    }
    const set = lineDirTrips.get(key);
    if (set.size < 3 || set.has(tripId)) {
      set.add(tripId);
      if (!sampledTrips.has(tripId)) {
        sampledTrips.set(tripId, {
          line: trip.line,
          dir: trip.dir,
          headsign: trip.headsign,
          stops: [],
        });
      }
      sampledTrips.get(tripId).stops.push({ seq: stopSeq, stopId });
    }

    if (!stopLinesMap[stopId]) {
      stopLinesMap[stopId] = new Set();
    }
    stopLinesMap[stopId].add(trip.line);
  }

  console.log(`Processed ${lineCount} stop_times lines. Selecting best patterns per line...`);

  // For each line_dir, choose the trip with the most stops (the complete line path)
  const linePatterns = {};
  for (const [tripId, data] of sampledTrips.entries()) {
    data.stops.sort((a, b) => a.seq - b.seq);
    const key = `${data.line}_${data.dir}`;
    const stopCodes = data.stops.map((s) => s.stopId);
    if (!linePatterns[key] || linePatterns[key].stops.length < stopCodes.length) {
      linePatterns[key] = {
        line: data.line,
        dir: data.dir,
        headsign: data.headsign,
        stops: stopCodes,
      };
    }
  }

  // Add Metro M1
  const METRO_M1_STOPS = [
    { code: "METRO_FERMI", name: "Fermi", lat: 45.0743, lon: 7.5758 },
    { code: "METRO_PARADISO", name: "Paradiso", lat: 45.0748, lon: 7.5898 },
    { code: "METRO_MARCHE", name: "Marche", lat: 45.0754, lon: 7.6014 },
    { code: "METRO_MASSAUA", name: "Massaua", lat: 45.0759, lon: 7.6108 },
    { code: "METRO_POZZO_STRADA", name: "Pozzo Strada", lat: 45.0763, lon: 7.6206 },
    { code: "METRO_MONTE_GRAPPA", name: "Monte Grappa", lat: 45.0767, lon: 7.6295 },
    { code: "METRO_RIVOLI", name: "Rivoli", lat: 45.0771, lon: 7.6391 },
    { code: "METRO_RACCONIGI", name: "Racconigi", lat: 45.0762, lon: 7.6475 },
    { code: "METRO_BERNINI", name: "Bernini", lat: 45.0753, lon: 7.6548 },
    { code: "METRO_PRINCIPI_D_ACAJA", name: "Principi d'Acaja", lat: 45.0742, lon: 7.6625 },
    { code: "METRO_XVIII_DICEMBRE", name: "XVIII Dicembre", lat: 45.0729, lon: 7.6698 },
    { code: "METRO_PORTA_SUSA", name: "Porta Susa", lat: 45.0707, lon: 7.6672 },
    { code: "METRO_VINZAGLIO", name: "Vinzaglio", lat: 45.0667, lon: 7.6669 },
    { code: "METRO_RE_UMBERTO", name: "Re Umberto", lat: 45.0642, lon: 7.6747 },
    { code: "METRO_PORTA_NUOVA", name: "Porta Nuova", lat: 45.0622, lon: 7.6791 },
    { code: "METRO_MARCONI", name: "Marconi", lat: 45.0573, lon: 7.6793 },
    { code: "METRO_NIZZA", name: "Nizza", lat: 45.0528, lon: 7.6778 },
    { code: "METRO_DANTE", name: "Dante", lat: 45.0475, lon: 7.6756 },
    { code: "METRO_CARDUCCI_MOLINETTE", name: "Carducci-Molinette", lat: 45.0422, lon: 7.6717 },
    { code: "METRO_SPEZIA", name: "Spezia", lat: 45.0372, lon: 7.6692 },
    { code: "METRO_LINGOTTO", name: "Lingotto", lat: 45.0303, lon: 7.6661 },
    { code: "METRO_ITALIA_61", name: "Italia 61", lat: 45.0219, lon: 7.6644 },
    { code: "METRO_BENGASI", name: "Bengasi", lat: 45.0169, lon: 7.6631 },
  ];

  const m1CodesForward = METRO_M1_STOPS.map((s) => s.code);
  const m1CodesBackward = [...m1CodesForward].reverse();

  linePatterns["M1_0"] = {
    line: "M1",
    dir: "0",
    headsign: "BENGASI",
    stops: m1CodesForward,
  };
  linePatterns["M1_1"] = {
    line: "M1",
    dir: "1",
    headsign: "FERMI",
    stops: m1CodesBackward,
  };

  for (const st of METRO_M1_STOPS) {
    if (!stopLinesMap[st.code]) stopLinesMap[st.code] = new Set();
    stopLinesMap[st.code].add("M1");
  }

  // Also convert stopLinesMap Set to Array
  const stopLinesObj = {};
  for (const [sId, set] of Object.entries(stopLinesMap)) {
    stopLinesObj[sId] = Array.from(set);
  }

  const output = {
    patterns: linePatterns,
    stopLines: stopLinesObj,
    metroStations: METRO_M1_STOPS,
  };

  const outPath = path.resolve(__dirname, "../public/transit-network.json");
  fs.writeFileSync(outPath, JSON.stringify(output));
  console.log(`Generated ${outPath}! Patterns: ${Object.keys(linePatterns).length}, Stops indexed: ${Object.keys(stopLinesObj).length}`);
}

main().catch(console.error);
