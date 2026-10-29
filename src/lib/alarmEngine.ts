// Commute Alarm Engine: Web Audio chime synthesis, Vibration, & Schedule Checker

export interface CommuteAlarm {
  id: string;
  line: string;
  stopCode: string;
  stopName: string;
  days: number[]; // 1=Lun, 2=Mar, 3=Mer, 4=Gio, 5=Ven, 6=Sab, 0=Dom
  startTime: string; // "07:30"
  endTime: string;   // "09:00"
  thresholdMinutes: number; // e.g. 3 or 5 min
  enabled: boolean;
  lastTriggeredDate?: string; // YYYY-MM-DD to avoid repeating on same day
}

// 1. Synthesize a clean, pleasant two-tone transit chime via Web Audio API (zero audio file dependencies)
export function playTransitChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;

    // Tone 1: High crisp ding (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.35, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Tone 2: Warm major third resolution (1108.7 Hz - C#6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1108.7, now + 0.18);
    gain2.gain.setValueAtTime(0, now + 0.18);
    gain2.gain.linearRampToValueAtTime(0.4, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.75);
  } catch (err) {
    console.warn("Web Audio not supported or blocked by autoplay policy", err);
  }
}

// 2. Trigger vibration on smartphone
export function triggerVibration() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 400]);
    } catch {
      // Ignored if browser blocks vibration
    }
  }
}

// 3. Request system browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    const res = await Notification.requestPermission();
    return res === "granted";
  }
  return false;
}

// 4. Send desktop/mobile system notification
export function sendSystemNotification(title: string, body: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });
    } catch {
      // Ignored
    }
  }
}

// 5. Check if current moment falls within alarm schedule
export function isAlarmActiveNow(alarm: CommuteAlarm): boolean {
  if (!alarm.enabled) return false;

  const now = new Date();
  const currentDay = now.getDay(); // 0-6

  // Check if today is one of selected days
  if (!alarm.days.includes(currentDay)) return false;

  // Check current time against startTime and endTime (HH:MM)
  const [currH, currM] = [now.getHours(), now.getMinutes()];
  const currentMinutes = currH * 60 + currM;

  const [startH, startM] = alarm.startTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;

  const [endH, endM] = alarm.endTime.split(":").map(Number);
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}
