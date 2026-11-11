import { miles, type Point } from "./geo";

// Where a promotion shows: places with a radius, whole states, or the whole US.
export type Target =
  | { kind: "us" }
  | { kind: "state"; state: string; label: string }
  | { kind: "place"; label: string; lat: number; lng: number; radius: number };

export const MAX_RADIUS = 60;
export const AGE_MIN = 18;
export const AGE_MAX = 65;

export function targetText(t: Target) {
  return t.kind === "us" ? "Whole United States" : t.kind === "state" ? t.label : `${t.label} + ${t.radius} mi`;
}

// Does a promotion reach someone searching here? With no idea where they
// are, every promotion counts (as before targeting existed).
export function reaches(targets: Target[] | null | undefined, at: Point | null, state: string | null) {
  if (!targets?.length) return true;
  if (!at && !state) return true;
  return targets.some((t) =>
    t.kind === "us" ? true : t.kind === "state" ? !!state && state === t.state : !!at && miles(at, { lat: t.lat, lng: t.lng }) <= t.radius,
  );
}
