/** Interpupillary distance, meters. Average adult male ≈ 64 mm, female ≈ 62 mm. */
export const DEFAULT_IPD_M = 0.064;

/** Assume a typical desktop viewing distance unless configured otherwise. */
export const DEFAULT_VIEW_DISTANCE_M = 0.6;

/**
 * Vergence demand, in prism diopters, for a target at distance D:
 *   V ≈ 1000 * IPD[cm] / D[cm]
 */
export function vergenceDemandPD(ipdM: number, distanceM: number): number {
  return (1000 * ipdM) / distanceM;
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

/** Convert arc minutes → prism diopters (small-angle: 1Δ ≈ 0.573°). */
export function arcminToPD(arcmin: number): number {
  return arcmin / 60 / 0.573; // ≈ arcmin * 0.02909
}

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