/** Interpupillary distance, meters. Average adult male ≈ 64 mm, female ≈ 62 mm. */
export const DEFAULT_IPD_M = 0.064;

/** Assume a typical desktop viewing distance unless configured otherwise. */
export const DEFAULT_VIEW_DISTANCE_M = 0.6;

/**
 * Vergence demand, in prism diopters, for a target at distance D:
 *
 *   V [Δ] ≈ 100 · IPD / D      (same units, e.g. m/m)
 *
 * Anchors (course §1.3.1): 64 mm IPD ⇒ ~16 Δ at 40 cm, ~10.7 Δ at 60 cm,
 * ~1.1 Δ at 6 m. The historical `1000·IPD/D` form (kept in the course draft)
 * was 10× too large — 107 Δ at 60 cm, which no eye can converge to.
 */
export function vergenceDemandPD(ipdM: number, distanceM: number): number {
  return (100 * ipdM) / distanceM;
}

/**
 * Exact form of the same demand: the total convergence angle is
 * 2·atan(IPD/2D), so V[Δ] = 100·tan(that). Differs by <0.5 % for any real
 * screen distance; use it to prove the linear form in tests.
 */
export function vergenceDemandPDExact(ipdM: number, distanceM: number): number {
  return 100 * Math.tan(2 * Math.atan(ipdM / (2 * distanceM)));
}

/** Accommodation in diopters for a target at distance D. */
export function accommodationD(distanceM: number): number {
  return 1 / distanceM;
}

/**
 * Panum's fusional area, central vision, conservative clinical band.
 * Disparities inside this fuse; beyond it, diplopia risk.
 */
export const PANUM_ARCMIN = { min: 6, max: 18 } as const;

/**
 * Convert arc minutes → prism diopters.
 *   1 Δ = 0.5729° = 34.376′   ⇒   1′ = 0.02909 Δ
 * (The course draft multiplied this by 100; 34.4′ is 1 Δ, not 100 Δ.)
 */
export function arcminToPD(arcmin: number): number {
  return arcmin / 60 / 0.5729; // ≈ arcmin * 0.02909
}

/** Exact variant: Δ = 100·tan(arcmin/60°). */
export function arcminToPDExact(arcmin: number): number {
  return 100 * Math.tan(((arcmin / 60) * Math.PI) / 180);
}

/**
 * Vergence–accommodation conflict budget for sustained (ramp/hold) modes,
 * in diopters (course §1.2.5). Above this, reserve the demand for short
 * jump trials or de-escalate. 30 Δ at 60 cm is ≈4.7 D — well past this line.
 */
export const MAX_VAC_D = 2;

/**
 * Screen-viewing assumptions used until a calibration UI exists (course
 * §2.3.5). A 10 % error here is a 10 % dose error; a 2× error is silent.
 */
export const DEFAULT_SCREEN = { diagonalInches: 27, widthPx: 2560, heightPx: 1440 } as const;
export const DEFAULT_VIEW = { distanceM: 0.6, ipdM: DEFAULT_IPD_M } as const;

/** Canonical training start: 4Δ, escalating 1Δ per correct block. */
export const TRAINING_START_PD = 4;
export const TRAINING_STEP_PD = 1;

/** Session safety limits — single source of truth; no engine inlines magic numbers. */
export const LIMITS = {
  convergence:   { startPD: 4,   stepPD: 1,    capPD: 30, floorPD: 0, autoMissSec: 10 },
  divergence:    { startPD: 3,   stepPD: 1,    capPD: 20, floorPD: 0, autoMissSec: 10 },
  jumpDuctions:  { startPD: 4,   stepPD: 1,    capPD: 25, floorPD: 0, holdSec: 2,  autoMissSec: 5 },
  jumpRandom:    { startPD: 4,   stepPD: 1,    capPD: 25, floorPD: 0, holdMin: 1, holdMax: 2.5, autoMissSec: 5 },
  accommodative: { startPD: 4,   stepPD: 0.5,  capPD: 16, floorPD: 0, autoMissSec: 10 },
  baseUp:        { startPD: 0.5, stepPD: 0.25, capPD: 5,  floorPD: 0, autoMissSec: 10 },
  baseDown:      { startPD: 0.5, stepPD: 0.25, capPD: 5,  floorPD: 0, autoMissSec: 10 },
} as const;