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
  /** Shown under the picture when it is the model, not a GTT vehicle. */
  note?: string;
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

const CC_BY_4 = "https://creativecommons.org/licenses/by/4.0";
const CC_BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0";

function commons(file: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`;
}

const CONECTO: FleetPhoto = {
  src: commons("Mercedes-Benz Conecto GTT - Torino.jpg"),
  author: "Kyah117",
  license: "CC BY 4.0",
  licenseUrl: CC_BY_4,
};
const CITELIS_12: FleetPhoto = {
  src: commons("Irisbus Citelis 12 line 51 GTT - Torino.jpg"),
  author: "Kyah117",
  license: "CC BY 4.0",
  licenseUrl: CC_BY_4,
};
const CITELIS_18: FleetPhoto = {
  src: commons("Irisbus Citelis 18 GTT - Torino.jpg"),
  author: "Kyah117",
  license: "CC BY 4.0",
  licenseUrl: CC_BY_4,
};
const CITYCLASS: FleetPhoto = {
  src: commons("Irisbus Cityclass n°2321 Torino.jpg"),
  author: "Kyah117",
  license: "CC BY 4.0",
  licenseUrl: CC_BY_4,
};
const BYD: FleetPhoto = {
  src: commons("Byd bus - Torino.jpg"),
  author: "Kyah117",
  license: "CC BY 4.0",
  licenseUrl: CC_BY_4,
};
const CITYMOOD: FleetPhoto = {
  src: commons("GTT Menarinibus Citymod 9225 Piazza Vittorio Veneto 20250411.jpg"),
  author: "Moliva",
  license: "CC BY-SA 4.0",
  licenseUrl: CC_BY_SA_4,
};
const TRAM_8000: FleetPhoto = {
  src: commons("GTT 8015 Corso Vittorio Emanuele Stazione Porta Nuova 20250412.jpg"),
  author: "Moliva",
  license: "CC BY-SA 4.0",
  licenseUrl: CC_BY_SA_4,
};
/** No freely licensed photo of a GTT E-Way exists; this is the same 12 m model. */
const EWAY: FleetPhoto = {
  src: commons("Iveco E-Way SVT.jpg"),
  author: "Berusetti",
  license: "CC BY-SA 4.0",
  licenseUrl: CC_BY_SA_4,
  note: "Esempio del modello, livrea di un'altra città",
};

const SERIES: Series[] = [
  { from: 2801, to: 2857, name: "Tram serie 2800", detail: "1ª serie, motrice articolata" },
  { from: 2858, to: 2902, name: "Tram serie 2800", detail: "2ª serie, motrice articolata" },
  { from: 5000, to: 5053, name: "Tram serie 5000", detail: "Fiat, piano parzialmente ribassato", photo: TRAM_5000 },
  { from: 6000, to: 6005, name: "Alstom Cityway", detail: "Tram serie 6000, monodirezionale, piano ribassato", photo: CITYWAY },
  { from: 6006, to: 6054, name: "Alstom Cityway", detail: "Tram serie 6000, bidirezionale, piano ribassato", photo: CITYWAY },
  { from: 7000, to: 7039, name: "Tram serie 7000", detail: "Motrice AEG" },
  { from: 8001, to: 8070, name: "Hitachi Rail", detail: "Tram serie 8000, 28 m, monodirezionale", photo: TRAM_8000 },
  { from: 85, to: 89, name: "MAN Lion's City", detail: "10 m, diesel Euro 4" },
  { from: 110, to: 115, name: "BMC Neocity", detail: "8,5 m, diesel Euro 6" },
  { from: 320, to: 365, name: "Iveco Crossway", detail: "12 m, extraurbano" },
  { from: 366, to: 406, name: "Iveco Crossway LE", detail: "12 m, extraurbano" },
  { from: 601, to: 650, name: "Iveco Crossway", detail: "12 m, extraurbano" },
  { from: 651, to: 692, name: "Iveco Crossway", detail: "12 m, metano, extraurbano" },
  { from: 790, to: 797, name: "Irisbus Citelis", detail: "18 m, diesel", photo: CITELIS_18 },
  { from: 800, to: 869, name: "Irisbus Citelis", detail: "18 m, diesel", photo: CITELIS_18 },
  { from: 870, to: 874, name: "Irisbus Citelis", detail: "18 m, diesel", photo: CITELIS_18 },
  { from: 930, to: 989, name: "Van Hool AG300", detail: "18 m" },
  { from: 990, to: 1014, name: "Van Hool AG300", detail: "18 m" },
  { from: 1020, to: 1089, name: "Irisbus CityClass", detail: "18 m, metano", photo: CITYCLASS },
  { from: 1150, to: 1168, name: "Iveco Crossway LE", detail: "12 m, suburbano" },
  { from: 1280, to: 1306, name: "Irisbus CityClass", detail: "18 m, metano", photo: CITYCLASS },
  { from: 1310, to: 1313, name: "Irisbus Citelis", detail: "18 m, metano", photo: CITELIS_18 },
  { from: 1350, to: 1396, name: "Mercedes Conecto G", detail: "18 m, diesel Euro 6", photo: CONECTO },
  { from: 2300, to: 2349, name: "Irisbus CityClass", detail: "12 m, diesel", photo: CITYCLASS },
  { from: 2400, to: 2447, name: "Mercedes Conecto", detail: "12 m, metano", photo: CONECTO },
  { from: 2500, to: 2599, name: "Iveco CityClass", detail: "12 m, diesel", photo: CITYCLASS },
  { from: 2600, to: 2699, name: "Iveco CityClass", detail: "12 m, metano", photo: CITYCLASS },
  { from: 2700, to: 2787, name: "Irisbus CityClass", detail: "12 m, metano", photo: CITYCLASS },
  { from: 3000, to: 3099, name: "Irisbus Citelis", detail: "12 m, diesel", photo: CITELIS_12 },
  { from: 3300, to: 3380, name: "Iveco Citelis", detail: "12 m, diesel", photo: CITELIS_12 },
  { from: 3400, to: 3440, name: "Mercedes Conecto", detail: "12 m, diesel Euro 6", photo: CONECTO },
  { from: 9000, to: 9059, name: "BYD K9", detail: "12 m, elettrico", photo: BYD },
  { from: 9060, to: 9121, name: "BYD K9", detail: "12 m, elettrico", photo: BYD },
  { from: 9200, to: 9261, name: "Menarinibus Citymood", detail: "12 m, metano", photo: CITYMOOD },
  { from: 9300, to: 9356, name: "Iveco Urbanway", detail: "18 m, metano" },
  { from: 9400, to: 9535, name: "Iveco E-Way", detail: "12 m, elettrico", photo: EWAY },
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
