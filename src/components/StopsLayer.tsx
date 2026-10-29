"use client";

import { useEffect, useState, useMemo } from "react";
import { Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

export interface StopData {
  c: string; // code
  n: string; // name
  d: string; // desc
  lat: number;
  lon: number;
}

interface StopsLayerProps {
  allStops: StopData[];
  onSelectStop: (stop: { code: string; name: string; desc: string; lat: number; lon: number }) => void;
}

// Crisp, lightweight transit stop icon with memory caching
const stopIconCache = new Map<string, L.DivIcon>();

function getStopIcon(code: string, isHighZoom: boolean): L.DivIcon {
  const key = `${code}_${isHighZoom ? "h" : "l"}`;
  let icon = stopIconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: "stop-marker-custom",
      html: `
        <div style="
          position: relative;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        ">
          ${
            isHighZoom
              ? `<div style="
                  background: #0f172a;
                  color: #ffffff;
                  font-size: 9px;
                  font-weight: 800;
                  padding: 1px 4px;
                  border-radius: 4px;
                  margin-bottom: 2px;
                  white-space: nowrap;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
                  line-height: 1.2;
                ">#${code}</div>`
              : ""
          }
          <div style="
            width: ${isHighZoom ? "16px" : "12px"};
            height: ${isHighZoom ? "16px" : "12px"};
            border-radius: 50%;
            background: #1e3a8a;
            border: 2px solid #ffffff;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="${isHighZoom ? "8" : "6"}" height="${isHighZoom ? "8" : "6"}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8" cy="15" r="1.5" fill="#ffffff" />
              <circle cx="16" cy="15" r="1.5" fill="#ffffff" />
              <line x1="3" y1="11" x2="21" y2="11" />
            </svg>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    stopIconCache.set(key, icon);
  }
  return icon;
}

export default function StopsLayer({ allStops, onSelectStop }: StopsLayerProps) {
  const [zoom, setZoom] = useState<number>(14);
  const [bounds, setBounds] = useState<any>(null);

  const map = useMapEvents({
    moveend: () => {
      setZoom(map.getZoom());
      setBounds(map.getBounds());
    },
    zoomend: () => {
      setZoom(map.getZoom());
      setBounds(map.getBounds());
    },
  });

  useEffect(() => {
    if (map) {
      setZoom(map.getZoom());
      setBounds(map.getBounds());
    }
  }, [map]);

  const isHighZoom = zoom >= 17;

  const visibleStops = useMemo(() => {
    if (zoom < 16 || !bounds || allStops.length === 0) return [];

    const south = bounds.getSouth();
    const north = bounds.getNorth();
    const west = bounds.getWest();
    const east = bounds.getEast();

    const filtered: StopData[] = [];
    for (let i = 0; i < allStops.length; i++) {
      const s = allStops[i];
      if (s.lat >= south && s.lat <= north && s.lon >= west && s.lon <= east) {
        filtered.push(s);
        if (filtered.length >= 50) break;
      }
    }
    return filtered;
  }, [allStops, zoom, bounds]);

  if (zoom < 16) return null;

  return (
    <>
      {visibleStops.map((s) => (
        <Marker
          key={`stop-${s.c}`}
          position={[s.lat, s.lon]}
          icon={getStopIcon(s.c, isHighZoom)}
          eventHandlers={{
            click: (e) => {
              e.originalEvent.stopPropagation();
              onSelectStop({
                code: s.c,
                name: s.n,
                desc: s.d,
                lat: s.lat,
                lon: s.lon,
              });
            },
          }}
        />
      ))}
    </>
  );
}
