/**
 * GTT fleet number → series.
 * Ranges from the GTT vehicle-park index and published series lists
 * (parco veicoli GTT, tplitalia). Unknown numbers stay unlabeled.
 */

export type FleetPhoto = {
  src: string;
  author: string;
  license: string;
  licenseUrl: string;
};

export type FleetInfo = {
  fleet: string;
  name: string;
  detail: string;
  photo?: FleetPhoto;
};

type Series = {
  from: number;
  to: number;
  name: string;
  detail: string;
  photo?: FleetPhoto;
};

const CITYWAY: FleetPhoto = {
  src: "https://commons.wikimedia.org/wiki/Special:FilePath/CitywayReal2.jpg?width=640",
  author: "LL90TO",
  license: "CC BY-SA 3.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
};

const TRAM_5000: FleetPhoto = {
  src: "https://commons.wikimedia.org/wiki/Special:FilePath/Tram%20Torino%205043.JPG?width=640",
  author: "Ale Sasso",
  license: "CC BY-SA 3.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
};

const SERIES: Series[] = [
  { from: 2801, to: 2857, name: "Tram serie 2800", detail: "1ª serie, motrice articolata" },
  { from: 2858, to: 2902, name: "Tram serie 2800", detail: "2ª serie, motrice articolata" },
  { from: 5000, to: 5053, name: "Tram serie 5000", detail: "Fiat, piano parzialmente ribassato", photo: TRAM_5000 },
  { from: 6000, to: 6005, name: "Alstom Cityway", detail: "Tram serie 6000, monodirezionale, piano ribassato", photo: CITYWAY },
  { from: 6006, to: 6054, name: "Alstom Cityway", detail: "Tram serie 6000, bidirezionale, piano ribassato", photo: CITYWAY },
  { from: 7000, to: 7039, name: "Tram serie 7000", detail: "Motrice AEG" },
  { from: 2300, to: 2334, name: "Irisbus CityClass", detail: "12 m, diesel Euro 3" },
  { from: 2335, to: 2349, name: "Irisbus CityClass", detail: "12 m, diesel Euro 4" },
  { from: 2400, to: 2447, name: "Mercedes Conecto", detail: "12 m, metano" },
  { from: 2600, to: 2699, name: "Iveco CityClass", detail: "12 m, metano" },
  { from: 2700, to: 2787, name: "Irisbus CityClass", detail: "12 m, metano" },
  { from: 3000, to: 3099, name: "Irisbus Citelis", detail: "12 m, diesel" },
  { from: 3300, to: 3380, name: "Iveco Citelis", detail: "12 m, diesel" },
  { from: 3400, to: 3440, name: "Mercedes Conecto", detail: "12 m, diesel Euro 6" },
  { from: 9000, to: 9099, name: "BYD K9", detail: "12 m, elettrico" },
  { from: 790, to: 797, name: "Irisbus Citelis", detail: "18 m, diesel" },
  { from: 800, to: 869, name: "Irisbus Citelis", detail: "18 m, diesel" },
  { from: 870, to: 874, name: "Irisbus Citelis", detail: "18 m, diesel" },
  { from: 930, to: 989, name: "Van Hool AG300", detail: "18 m" },
  { from: 990, to: 1014, name: "Van Hool AG300", detail: "18 m" },
  { from: 1020, to: 1089, name: "Irisbus CityClass", detail: "18 m, metano" },
  { from: 1280, to: 1306, name: "Irisbus CityClass", detail: "18 m, metano" },
  { from: 1310, to: 1313, name: "Irisbus Citelis", detail: "18 m, metano" },
  { from: 1350, to: 1396, name: "Mercedes Conecto G", detail: "18 m, diesel Euro 6" },
  { from: 9300, to: 9356, name: "Iveco Urbanway", detail: "18 m, metano" },
  { from: 9600, to: 9661, name: "Iveco E-Way", detail: "18 m, elettrico" },
  { from: 9700, to: 9727, name: "Iveco E-Way BRT", detail: "18 m, elettrico, linea di forza" },
];

export function cleanFleetNumber(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw.replace(/[UES]$/i, "").trim();
}

export function lookupFleet(raw: string | undefined | null): FleetInfo | null {
  const fleet = cleanFleetNumber(raw);
  const n = Number(fleet);
  if (!fleet || !Number.isFinite(n)) return null;
  const hit = SERIES.find((s) => n >= s.from && n <= s.to);
  if (!hit) return { fleet, name: "", detail: "" };
  return { fleet, name: hit.name, detail: hit.detail, photo: hit.photo };
}
