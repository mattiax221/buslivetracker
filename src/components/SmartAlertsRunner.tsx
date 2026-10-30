"use client";

import { useEffect, useRef } from "react";
import {
  isSmartAlertsEnabled,
  runSmartAlertCheck,
  syncSmartAlertPrefs,
  type SmartAlertVehicle,
} from "../lib/smartAlerts";

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

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState !== "visible") return;
      if (!isSmartAlertsEnabled()) return;
      await runSmartAlertCheck({
        lines: savedLines,
        stops: savedStops,
        userCoords,
        vehicles: vehiclesRef.current,
      });
    };

    const sync = () => {
      if (!isSmartAlertsEnabled()) return;
      void syncSmartAlertPrefs({
        enabled: true,
        lines: savedLines,
        stops: savedStops,
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
  }, [savedLines, savedStops, userCoords]);

  return null;
}
