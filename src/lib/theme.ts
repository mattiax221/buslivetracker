export type ThemeMode = "light" | "dark";

const KEY = "gtt.theme.v1";
export const THEME_EVENT = "gtt-theme";

export function readTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  // Default: notte dalle 19 alle 7
  const h = new Date().getHours();
  return h >= 19 || h < 7 ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", mode);
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = readTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
