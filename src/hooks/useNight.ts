"use client";

import { useEffect, useState } from "react";
import { readTheme, THEME_EVENT, type ThemeMode } from "../lib/theme";

export function useNight(): boolean {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const sync = () => setMode(readTheme());
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  return mode === "dark";
}
