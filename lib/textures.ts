import * as THREE from 'three';
import type { ArrowDir } from './types';

/**
 * Canvas-drawn textures for therapy targets. All targets are drawn as
 * high-contrast grayscale shapes; the anaglyph effect handles red/cyan
 * dissociation so each eye gets a clean image through the glasses.
 */

function makeCanvas(size = 256): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

/** Filled square outline with a solid center dot — the fixed frame target. */
export function makeFrameTexture(color: string = '#e2e8f0'): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, 216, 216);
  ctx.beginPath();
  ctx.arc(128, 128, 14, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(canvas);
}

/** Letter 'E' in a given rotation for pursuits/saccades/rock targets. */
export function makeETexture(orientation: ArrowDir, bold: boolean = false): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  ctx.fillStyle = '#ffffff';
  if (bold) {
    ctx.font = '900 210px Arial, sans-serif';
  } else {
    ctx.font = '160px Arial, sans-serif';
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Base 'E' faces right; rotate for other orientations.
  const rot: Record<ArrowDir, number> = { right: 0, up: -Math.PI / 2, left: Math.PI, down: Math.PI / 2 };
  ctx.translate(128, 128);
  ctx.rotate(rot[orientation]);
  ctx.fillText('E', 0, 8);
  return toTexture(canvas);
}

/** Non-directional filled disc for rock 'far' focus. */
export function makeDiscTexture(color: string = '#ffffff'): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(64, 64, 40, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(canvas);
}

/** Fine detail pattern for accommodative 'far' focus simulation. */
export function makeFineDetailTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256);
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let i = 4; i < 256; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 4);
    ctx.lineTo(i, 252);
    ctx.stroke();
  }
  ctx.strokeRect(28, 28, 200, 200);
  return toTexture(canvas);
}

/** Bold rings pattern for accommodative 'near' focus simulation. */
export function makeBoldRingsTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256);
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#ffffff';
  for (const r of [118, 92, 66, 40]) {
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  return toTexture(canvas);
}

/**
 * Disparity target: a filled shape with an open notch marking its local
 * 'up'. The notch lets the fused image be judged by position; rotation of
 * the notch also provides a discriminable feature. We keep it a simple
 * filled square with a bright arrow notch for arrow-key responses.
 */
export function makeDisparityTexture(dir: ArrowDir): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128);
  ctx.fillStyle = '#ffffff';
  // Body
  ctx.fillRect(14, 34, 100, 60);
  // Notch triangle pointing in `dir` local space
  ctx.beginPath();
  const rot: Record<ArrowDir, [number, number]> = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  };
  const [dx, dy] = rot[dir];
  // Draw a small arrow at the body edge.
  const cx = 64;
  const cy = 64;
  const px = -dy;
  const py = dx;
  ctx.beginPath();
  ctx.moveTo(cx + dx * 46, cy + dy * 46);
  ctx.lineTo(cx + dx * 22 + px * 16, cy + dy * 22 + py * 16);
  ctx.lineTo(cx + dx * 22 - px * 16, cy + dy * 22 - py * 16);
  ctx.closePath();
  ctx.fill();
  return toTexture(canvas);
}
