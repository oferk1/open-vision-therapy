/**
 * lib/stereopsis.ts — the Δ ↔ pixel ↔ world-unit bridge (course Module 2).
 *
 * This is the single source of truth for turning a clinical demand in prism
 * diopters into something the renderer can draw. Every function is pure, so the
 * course's worked examples can be asserted against them directly.
 *
 * Conventions (course §2.1):
 *   +pd = crossed  = Base-Out  = convergence demand → percept NEARER than screen
 *   −pd = uncrossed = Base-In  = divergence demand  → percept FARTHER
 *   +px = crossed (same sign convention, in pixels)
 *
 * Exactness: because P[Δ] = 100·tan θ by definition, `pdToPixels` is exact for
 * every pd, not a small-angle approximation (§2.3.2).
 */

import type { PerspectiveCamera } from 'three';

export interface ScreenSpec {
  /** Diagonal of the *lit* area, inches (marketing size — see §2.3.5). */
  diagonalInches: number;
  /** Horizontal resolution, px. */
  widthPx: number;
  /** Vertical resolution, px. */
  heightPx: number;
}

export interface ViewingSpec {
  /** Eyes-to-screen distance, metres. */
  distanceM: number;
  /** Interpupillary distance, metres. */
  ipdM: number;
}

/** Camera geometry needed to convert pixels → world units (§3.3.5). */
export interface CameraSpec {
  /** Camera → stimulus-plane distance, world units. */
  distanceWU: number;
  /** Vertical field of view, degrees. */
  fovDeg: number;
  /** Viewport height in CSS px (R3F's `size.height`). */
  viewportHeightCss: number;
}

/**
 * Assumed display, used until a calibration UI exists (§2.3.5).
 * A wrong assumption scales every dose linearly; a 27″ 2560×1440 is the
 * middle of the plausible range (a 14″ laptop is ≈+17 % PPM, a 32″ ≈−19 %).
 */
export const DEFAULT_SCREEN: ScreenSpec = {
  diagonalInches: 27,
  widthPx: 2560,
  heightPx: 1440,
};

/** Assumed posture: desktop viewing distance and an average adult IPD. */
export const DEFAULT_VIEW: ViewingSpec = { distanceM: 0.6, ipdM: 0.064 };

/** ISO/IEC 7810 ID-1 (bank card) width — the calibration reference (§2.3.5). */
export const BANK_CARD_WIDTH_M = 0.0856;

/** Pixels per metre, from a diagonal + resolution spec. */
export function pixelsPerMeter(s: ScreenSpec): number {
  const diagM = s.diagonalInches * 0.0254;
  return Math.hypot(s.widthPx, s.heightPx) / diagM;
}

/** Pixels per metre from an advertised PPI/DPI figure. */
export function ppiToPPM(ppi: number): number {
  return ppi / 0.0254;
}

/** Physical size of each axis, metres (derive from the aspect ratio, not PPM alone). */
export function screenAxesM(s: ScreenSpec): { widthM: number; heightM: number } {
  const d = s.diagonalInches * 0.0254;
  const ratio = Math.hypot(s.widthPx, s.heightPx);
  return { widthM: (d * s.widthPx) / ratio, heightM: (d * s.heightPx) / ratio };
}

/** Calibrate from a known object on the glass: `refPx` ↦ `refM` metres. */
export function calibratePPM(refPx: number, refM: number = BANK_CARD_WIDTH_M): number {
  return refPx / refM;
}

/** Prism diopters → on-screen pixel offset (signed; exact). */
export function pdToPixels(pd: number, v: ViewingSpec, s: ScreenSpec): number {
  return (pd * v.distanceM * pixelsPerMeter(s)) / 100;
}

/** Inverse: a measured pixel offset → prism diopters. */
export function pixelsToPD(px: number, v: ViewingSpec, s: ScreenSpec): number {
  return (px * 100) / (v.distanceM * pixelsPerMeter(s));
}

/** One pixel expressed in prism diopters — the display's step quantum (§2.3.5). */
export function pdPerPixel(v: ViewingSpec, s: ScreenSpec): number {
  return pixelsToPD(1, v, s);
}

/**
 * Signed pixel disparity → perceived distance (m).
 *
 *   separation w = IPD·(Z−D)/Z   ⇒   Z = D·IPD / (IPD − w)
 *
 * Sanity: zero disparity ⇒ Z = D (the screen plane); the patient's full
 * convergence demand (−vergenceDemandPD) ⇒ Z = ∞ (§2.3.3).
 */
export function perceivedDistanceM(disparityPx: number, v: ViewingSpec, s: ScreenSpec): number {
  const w = -disparityPx / pixelsPerMeter(s); // crossed ⇒ images move together ⇒ w < 0
  return (v.distanceM * v.ipdM) / (v.ipdM - w);
}

/**
 * Vergence–accommodation conflict implied by a disparity, in diopters (§1.2.5).
 * `|1/Z − 1/D|` — the accommodation the percept implies minus what the screen
 * actually demands. Keep sustained modes under `MAX_VAC_D`.
 */
export function vacD(disparityPx: number, v: ViewingSpec, s: ScreenSpec): number {
  return Math.abs(1 / perceivedDistanceM(disparityPx, v, s) - 1 / v.distanceM);
}

/** World units per CSS pixel at the stimulus plane, for a given camera. */
export function worldPerPx(cam: CameraSpec): number {
  const hWorld = 2 * cam.distanceWU * Math.tan((cam.fovDeg * Math.PI) / 360);
  return hWorld / cam.viewportHeightCss;
}

/**
 * Prism diopters → world-unit offset at the stimulus plane (§3.3.5).
 *
 * This is the value the RDS material's `uShift` wants, and — because the
 * stimulus plane is flat — also the value the vertical eye-offset patch wants
 * (§3.3.4). Both are "shift the rendered content by d pixels" operations.
 */
export function pdToWorldShift(
  pd: number,
  v: ViewingSpec,
  s: ScreenSpec,
  cam: CameraSpec,
): number {
  return pdToPixels(pd, v, s) * worldPerPx(cam);
}

/** Inverse of `pdToWorldShift` — log the *delivered* demand, not the requested one. */
export function worldShiftToPD(
  worldShift: number,
  v: ViewingSpec,
  s: ScreenSpec,
  cam: CameraSpec,
): number {
  return pixelsToPD(worldShift / worldPerPx(cam), v, s);
}

/** Build a `CameraSpec` from a live R3F camera + viewport. */
export function cameraSpecFrom(camera: PerspectiveCamera, viewportHeightCss: number): CameraSpec {
  return {
    distanceWU: camera.position.z,
    fovDeg: camera.fov,
    viewportHeightCss: Math.max(1, viewportHeightCss),
  };
}

/** Human-readable calibration line for the HUD / results screen (§5.2). */
export function calibrationLabel(
  pd: number,
  v: ViewingSpec = DEFAULT_VIEW,
  s: ScreenSpec = DEFAULT_SCREEN,
): string {
  const px = pdToPixels(pd, v, s);
  return `${pd} Δ = ${px.toFixed(1)} px @ ${(v.distanceM * 100).toFixed(0)} cm, ${s.diagonalInches}″ ${s.widthPx}×${s.heightPx}`;
}
