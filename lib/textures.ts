import * as THREE from 'three';
import type { ArrowDir } from './types';

/**
 * Random-dot stereogram (RDS) stimulus textures.
 *
 * Every target is now a Julesz-style random-dot display: a single shared
 * speckle-noise field (world-locked, so dots align across all surfaces at
 * zero disparity) plus per-target alpha masks (the E glyph or a direction
 * arrow). The anaglyph composer renders the scene once per eye; the per-eye
 * RDS material (lib/rdsEyePass.ts) samples the noise with opposite lateral
 * offsets inside the mask, so the shape exists only as binocular disparity —
 * with the naked eye the screen is pure noise, and the target pops out only
 * through red/cyan fusion.
 */

/** World units covered by one repeat of the shared noise texture. */
export const NOISE_UNITS = 12;

const NOISE_SIZE = 512;
/** Fraction of noise cells that are white dots (rest are black). */
const NOISE_DENSITY = 0.5;

let sharedNoise: THREE.CanvasTexture | null = null;

/**
 * The one shared speckle field. All RDS materials sample it in world
 * coordinates, so unmasked regions of every surface align perfectly with
 * the surround field (zero disparity = camouflaged).
 */
export function getSharedNoiseTexture(): THREE.CanvasTexture {
  if (sharedNoise) return sharedNoise;
  const canvas = document.createElement('canvas');
  canvas.width = NOISE_SIZE;
  canvas.height = NOISE_SIZE;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const img = ctx.createImageData(NOISE_SIZE, NOISE_SIZE);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const on = Math.random() < NOISE_DENSITY;
    const v = on ? 255 : 0;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // Crisp dots are the whole point — no filtering, no mipmaps.
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  sharedNoise = tex;
  return tex;
}

function makeMaskCanvas(size: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  return { canvas, ctx };
}

function toMaskTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

/** 1x1 fully transparent mask — renders plain speckle with no disparity. */
export function makeEmptyMaskTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeMaskCanvas(1);
  ctx.clearRect(0, 0, 1, 1);
  return toMaskTexture(canvas);
}

/** E glyph as an alpha mask (opaque where the E is). */
export function makeEMaskTexture(orientation: ArrowDir): THREE.CanvasTexture {
  const { canvas, ctx } = makeMaskCanvas(256);
  ctx.fillStyle = '#ffffff';
  ctx.font = '160px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Base 'E' faces right; rotate for other orientations.
  const rot: Record<ArrowDir, number> = {
    right: 0,
    up: -Math.PI / 2,
    left: Math.PI,
    down: Math.PI / 2,
  };
  ctx.translate(128, 128);
  ctx.rotate(rot[orientation]);
  ctx.fillText('E', 0, 8);
  return toMaskTexture(canvas);
}

/** Letter 'B' as an alpha mask — the monocular fixation markers. */
export function makeBMaskTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeMaskCanvas(128);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 96px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('B', 64, 68);
  return toMaskTexture(canvas);
}

/** Solid direction arrow as an alpha mask (points in `dir` local space). */
export function makeArrowMaskTexture(dir: ArrowDir): THREE.CanvasTexture {
  const { canvas, ctx } = makeMaskCanvas(128);
  ctx.fillStyle = '#ffffff';
  ctx.translate(64, 64);
  const angle: Record<ArrowDir, number> = {
    right: 0,
    up: -Math.PI / 2,
    left: Math.PI,
    down: Math.PI / 2,
  };
  ctx.rotate(angle[dir]);
  // Shaft along +x, then an arrowhead.
  ctx.fillRect(-34, -7, 44, 14);
  ctx.beginPath();
  ctx.moveTo(36, 0);
  ctx.lineTo(8, -22);
  ctx.lineTo(8, 22);
  ctx.closePath();
  ctx.fill();
  return toMaskTexture(canvas);
}
