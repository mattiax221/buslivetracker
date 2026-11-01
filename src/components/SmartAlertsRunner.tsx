"use client";

import { useEffect, useRef } from "react";
import {
  isSmartAlertsEnabled,
  runSmartAlertCheck,
  syncSmartAlertPrefs,
  type SmartAlertVehicle,
} from "../lib/smartAlerts";
import { checkGpsApproachToWatchedStops } from "../lib/gpsStopWatch";

const INTERVAL_MS = 50_000;

export default function SmartAlertsRunner({
  savedLines,
  savedStops,
  userCoords,
  vehicles,
}: {
  savedLines: string[];
  savedStops: { code: string; name: string }[];
  userCoords: [number, number] | null;
  vehicles: SmartAlertVehicle[];
}) {
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;
  const coordsRef = useRef(userCoords);
  coordsRef.current = userCoords;
  const linesRef = useRef(savedLines);
  linesRef.current = savedLines;
  const stopsRef = useRef(savedStops);
  stopsRef.current = savedStops;

  const linesKey = savedLines.join("\n");
  const stopsKey = savedStops.map((s) => `${s.code}:${s.name}`).join("\n");

  // GPS→fermata watch: run on every vehicle list change (already polled)
  useEffect(() => {
    if (document.visibilityState !== "visible") return;
    void checkGpsApproachToWatchedStops(
      vehicles.map((v) => ({
        id: v.id,
        lat: v.lat,
        lon: v.lon,
        line: v.line,
        speed: v.speed ?? 0,
        isEstimated: v.isEstimated,
        isSimulated: v.isSimulated,
      }))
    );
  }, [vehicles]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState !== "visible") return;
      if (!isSmartAlertsEnabled()) return;
      await runSmartAlertCheck({
        lines: linesRef.current,
        stops: stopsRef.current,
        userCoords: coordsRef.current,
        vehicles: vehiclesRef.current,
      });
    };

    const sync = () => {
      if (!isSmartAlertsEnabled()) return;
      void syncSmartAlertPrefs({
        enabled: true,
        lines: linesRef.current,
        stops: stopsRef.current,
      });
    };

    const boot = window.setTimeout(() => {
      void tick();
      sync();
    }, 8000);

    const id = window.setInterval(() => {
      void tick();
    }, INTERVAL_MS);

    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearTimeout(boot);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [linesKey, stopsKey]);

  return null;
}
