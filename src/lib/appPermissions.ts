const DISMISS_KEY = "gtt.perms.dismissedAt";
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // ripropone dopo 1 giorno

export type PermissionKindState = "granted" | "denied" | "prompt" | "unsupported";

export interface PermissionSnapshot {
  geo: PermissionKindState;
  notifications: PermissionKindState;
  needsAttention: boolean;
}

async function queryPermission(
  name: PermissionName
): Promise<PermissionState | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unsupported";
  }
  try {
    const status = await navigator.permissions.query({ name });
    return status.state;
  } catch {
    return "unsupported";
  }
}

function mapState(
  state: PermissionState | "unsupported",
  fallback: PermissionKindState
): PermissionKindState {
  if (state === "unsupported") return fallback;
  if (state === "granted") return "granted";
  if (state === "denied") return "denied";
  return "prompt";
}

export async function getPermissionSnapshot(): Promise<PermissionSnapshot> {
  let geo: PermissionKindState = "unsupported";
  let notifications: PermissionKindState = "unsupported";

  if (typeof window === "undefined") {
    return { geo, notifications, needsAttention: false };
  }

  if (!("geolocation" in navigator)) {
    geo = "unsupported";
  } else {
    const q = await queryPermission("geolocation");
    geo = mapState(q, "prompt");
  }

  if (!("Notification" in window)) {
    notifications = "unsupported";
  } else {
    const browser = Notification.permission;
    if (browser === "granted") notifications = "granted";
    else if (browser === "denied") notifications = "denied";
    else {
      const q = await queryPermission("notifications");
      notifications = mapState(q, "prompt");
    }
  }

  const needsAttention =
    (geo !== "granted" && geo !== "unsupported") ||
    (notifications !== "granted" && notifications !== "unsupported");

  return { geo, notifications, needsAttention };
}

export function wasRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const t = Number(raw);
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < NUDGE_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function markPermissionsDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearPermissionsDismissed(): void {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

/** Show onboarding / re-ask sheet. */
export function shouldShowPermissionsPrompt(
  snap: PermissionSnapshot
): boolean {
  if (!snap.needsAttention) return false;
  if (wasRecentlyDismissed()) return false;
  return true;
}

/** Trigger the system location prompt (and a reading). */
export function requestLocationAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

/** Ensure push subscription if notification already granted. Silent. */
export async function ensurePushIfGranted(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const { subscribeDevicePush } = await import("./pushClient");
    await subscribeDevicePush();
  } catch {
    /* ignore */
  }
}
