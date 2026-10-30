import { getDistanceMeters } from "./mapUtils";

export const JUMP_GUARD_METERS = 380;
export const HEADING_BUCKET_DEG = 12;

/** Below this km/h → treat as stopped (feed speed). */
export const STOPPED_SPEED_KMH = 1.8;
/** Above this km/h → clearly moving (hysteresis vs stopped). */
export const MOVING_SPEED_KMH = 3.2;
/** Min displacement over a poll to count as moving when speed is missing/zero. */
export const MIN_MOVE_METERS = 6;
/** While stopped, ignore GPS wander under this. */
export const STOPPED_JITTER_METERS = 12;

export type MotionMode = "moving" | "stopped";

export interface MotionSample {
  lat: number;
  lon: number;
  heading: number;
  /** km/h from GTFS-RT when available */
  speed?: number;
}

export interface VehicleMotionState {
  from: MotionSample;
  to: MotionSample;
  current: MotionSample;
  t0: number;
  durationMs: number;
  iconHeading: number;
  mode: MotionMode;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpHeading(from: number, to: number, t: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return (from + delta * t + 360) % 360;
}

export function easeInOutQuint(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5
    ? 16 * x * x * x * x * x
    : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

export function headingBucket(heading: number): number {
  return Math.round((heading || 0) / HEADING_BUCKET_DEG) * HEADING_BUCKET_DEG;
}

/** Infer moving vs stopped from feed speed + displacement. */
export function classifyMotion(
  speedKmh: number | undefined,
  distMeters: number,
  intervalMs: number,
  prevMode: MotionMode
): MotionMode {
  const inferredKmh =
    intervalMs > 0
      ? (distMeters / (intervalMs / 1000)) * 3.6
      : 0;

  const speed =
    speedKmh != null && Number.isFinite(speedKmh) ? speedKmh : inferredKmh;

  // Hysteresis: harder to leave stopped / enter stopped
  if (prevMode === "stopped") {
    if (speed >= MOVING_SPEED_KMH && distMeters >= MIN_MOVE_METERS) {
      return "moving";
    }
    return "stopped";
  }

  // was moving
  if (speed <= STOPPED_SPEED_KMH || distMeters < MIN_MOVE_METERS) {
    return "stopped";
  }
  return "moving";
}

export function sampleAt(
  state: VehicleMotionState,
  now: number
): MotionSample {
  const raw = (now - state.t0) / Math.max(state.durationMs, 1);
  // Hard hold when stopped with no settle window
  if (state.mode === "stopped" && state.durationMs <= 1) {
    return { ...state.to };
  }
  if (raw <= 0) return { ...state.from };
  if (raw >= 1) return { ...state.to };
  const t = easeInOutQuint(raw);
  return {
    lat: lerp(state.from.lat, state.to.lat, t),
    lon: lerp(state.from.lon, state.to.lon, t),
    heading: lerpHeading(state.from.heading, state.to.heading, t),
    speed: state.to.speed,
  };
}

export function isAnimating(state: VehicleMotionState, now: number): boolean {
  if (state.mode === "moving") return true;
  return now - state.t0 < state.durationMs;
}

function holdStopped(
  prev: VehicleMotionState,
  sample: MotionSample,
  now: number
): VehicleMotionState {
  const held = {
    lat: prev.current.lat,
    lon: prev.current.lon,
    heading: sample.heading ?? prev.current.heading,
    speed: sample.speed ?? 0,
  };
  return {
    from: held,
    to: held,
    current: held,
    t0: now,
    durationMs: 1,
    iconHeading: prev.iconHeading,
    mode: "stopped",
  };
}

/**
 * Apply a GPS poll: stopped buses hold still; moving buses glide.
 */
export function applyPollUpdate(
  states: Map<string, VehicleMotionState>,
  nextById: Map<string, MotionSample>,
  now: number,
  durationMs: number
): void {
  const alive = new Set(nextById.keys());
  const glideMs = Math.max(3000, Math.min(durationMs, 8500));

  for (const [id, sample] of nextById) {
    const prev = states.get(id);

    if (!prev) {
      const speed = sample.speed ?? 0;
      const mode: MotionMode =
        speed >= MOVING_SPEED_KMH ? "moving" : "stopped";
      const pos = { ...sample };
      states.set(id, {
        from: pos,
        to: pos,
        current: pos,
        t0: now,
        durationMs: glideMs,
        iconHeading: headingBucket(sample.heading),
        mode,
      });
      continue;
    }

    const from = sampleAt(prev, now);
    const dist = getDistanceMeters(from.lat, from.lon, sample.lat, sample.lon);
    const mode = classifyMotion(
      sample.speed,
      dist,
      durationMs,
      prev.mode
    );

    // Teleport / bad fix
    if (dist > JUMP_GUARD_METERS) {
      const pos = { ...sample };
      states.set(id, {
        from: pos,
        to: pos,
        current: pos,
        t0: now,
        durationMs: glideMs,
        iconHeading: headingBucket(sample.heading),
        mode,
      });
      continue;
    }

    if (mode === "stopped") {
      // Absorb GPS wander while stopped
      if (dist <= STOPPED_JITTER_METERS) {
        states.set(id, holdStopped(prev, sample, now));
      } else {
        // Real stop a bit away (e.g. crept to bay) — soft settle once
        states.set(id, {
          from,
          to: { ...sample },
          current: from,
          t0: now,
          durationMs: Math.min(900, glideMs),
          iconHeading: prev.iconHeading,
          mode: "stopped",
        });
      }
      continue;
    }

    // Moving → glide toward new GPS
    states.set(id, {
      from,
      to: { ...sample },
      current: from,
      t0: now,
      durationMs: glideMs,
      iconHeading: prev.iconHeading,
      mode: "moving",
    });
  }

  for (const id of states.keys()) {
    if (!alive.has(id)) states.delete(id);
  }
}

export function tickMotions(
  states: Map<string, VehicleMotionState>,
  now: number
): {
  id: string;
  sample: MotionSample;
  headingChanged: boolean;
  mode: MotionMode;
  animating: boolean;
}[] {
  const out: {
    id: string;
    sample: MotionSample;
    headingChanged: boolean;
    mode: MotionMode;
    animating: boolean;
  }[] = [];

  for (const [id, state] of states) {
    const sample = sampleAt(state, now);
    state.current = sample;
    const bucket = headingBucket(sample.heading);
    const headingChanged = bucket !== state.iconHeading;
    if (headingChanged) state.iconHeading = bucket;
    out.push({
      id,
      sample,
      headingChanged,
      mode: state.mode,
      animating: isAnimating(state, now),
    });
  }

  return out;
}
