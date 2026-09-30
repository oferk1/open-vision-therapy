'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { makeArrowMaskTexture, makeBMaskTexture, makeEmptyMaskTexture } from '../../lib/textures';
import { RdsMaterial } from '../../lib/rdsEyePass';
import type { ArrowDir, EngineProps, ExerciseId } from '../../lib/types';
import { ARROW_DIRS, clamp, randDir, randRange } from '../../lib/utils';
import { LIMITS } from '../../lib/clinical';
import {
  DEFAULT_SCREEN,
  DEFAULT_VIEW,
  cameraSpecFrom,
  pdToWorldShift,
} from '../../lib/stereopsis';
import { useEngineInput } from './shared';

export type VergenceVariant =
  | 'convergence'
  | 'divergence'
  | 'jump-ductions'
  | 'jump-random'
  | 'base-up'
  | 'base-down';

interface VergenceBaseProps extends EngineProps {
  variant: VergenceVariant;
}

/**
 * Demands are expressed in PRISM DIOPTERS (course §4.11) and converted to world
 * units by `pdToWorldShift`, which needs the viewing distance, the screen spec
 * and the live camera. The engines used to emit a unitless "depth" scaled by a
 * bare constant — that combined with the RDS shader's texel-unit bug to make the
 * delivered demand both wrong by ~12× and monitor-dependent (course audit §H).
 *
 * The calibration assumption is centralised in DEFAULT_VIEW / DEFAULT_SCREEN;
 * `calibrationLabel()` renders it for the HUD.
 */
const START_SCALE_MIN = 0.25;
const START_SCALE_MAX = 2;

/** Prism convention (course §2.1): Base-Up = left image DOWN over the left eye.
 *  lib/anaglyphEyeOffset.ts takes a POSITIVE value to move the left image UP. */
const BASE_UP_IMAGE_DOWN = -1;
const BASE_DOWN_IMAGE_UP = +1;

/**
 * Horizontal fusion anchor for the vertical modes: a small, fixed crossed
 * demand so the target still has a fusion lock at screen depth while the
 * vertical demand is trained (HTS vertical-vergence modes work the same way).
 */
const HORIZONTAL_ANCHOR_PD = 1.5;

/** Which LIMITS row governs this variant. */
function limitsFor(variant: VergenceVariant) {
  switch (variant) {
    case 'convergence':
      return LIMITS.convergence;
    case 'divergence':
      return LIMITS.divergence;
    case 'jump-ductions':
      return LIMITS.jumpDuctions;
    case 'jump-random':
      return LIMITS.jumpRandom;
    default:
      return LIMITS.baseUp;
  }
}

export default function VergenceBaseEngine({
  variant,
  settings,
  running,
  statsRef,
  inputRef,
  eyeOffsetRef,
  onStats,
}: VergenceBaseProps) {
  const subGroup = useRef<THREE.Group>(null);
  const markerL = useRef<THREE.Mesh>(null);
  const markerR = useRef<THREE.Mesh>(null);  const orientation = useRef<ArrowDir>('up');
  const vertical = variant === 'base-up' || variant === 'base-down';
  const limits = limitsFor(variant);
  // The config slider scales the whole clinical ladder rather than setting an
  // opaque "depth": 1.0 = the LIMITS defaults (course §4.11).
  const startScale = clamp(settings.baseDepth / 0.35, START_SCALE_MIN, START_SCALE_MAX);
  const startPD = Math.max(limits.floorPD, limits.startPD * startScale);
  /** Current unsigned demand magnitude, prism diopters. */
  const demandPD = useRef(startPD);
  const ductionPhase = useRef(0);
  /** True when a fresh trial should be presented on the next frame. */
  const presented = useRef(true);
  /** jump-random draws its own magnitude + direction per trial (§4.6). */
  const trialMag = useRef(startPD);
  const trialSign = useRef<1 | -1>(1);
  const timeout = useRef(3.4);
  const timer = useRef(0);

  const subMat = useMemo(() => new RdsMaterial(makeArrowMaskTexture('up')), []);

  // HTS-style tri-band display: left monocular strip (red), central
  // binocular fusion strip, right monocular strip (blue), plus the
  // suppression-check 'B' markers flanking the center.
  const bandL = useMemo(() => new RdsMaterial(makeEmptyMaskTexture()), []);
  const bandC = useMemo(() => new RdsMaterial(makeEmptyMaskTexture()), []);
  const bandR = useMemo(() => new RdsMaterial(makeEmptyMaskTexture()), []);
  const markerMatL = useMemo(() => new RdsMaterial(makeBMaskTexture()), []);
  const markerMatR = useMemo(() => new RdsMaterial(makeBMaskTexture()), []);

  const arrowMasks = useMemo(() => {
    const map = {} as Record<ArrowDir, THREE.Texture>;
    for (const d of ARROW_DIRS) map[d] = makeArrowMaskTexture(d);
    return map;
  }, []);

  useEngineInput(
    { settings, running, statsRef, inputRef, eyeOffsetRef, onStats },
    () => orientation.current,
    onAnswered
  );

  /**
   * Staircase in Δ (course §4.0): +step per correct answer, −2·step per miss,
   * clamped to the mode's LIMITS row. Escalating the clinical unit (not a
   * private "depth") is what keeps dose comparable across monitors and modes.
   */
  function onAnswered(_dir: ArrowDir, correct: boolean) {
    const step = limits.stepPD;
    demandPD.current = correct
      ? clamp(demandPD.current + step, limits.floorPD, limits.capPD)
      : clamp(demandPD.current - 2 * step, Math.max(limits.floorPD, startPD * 0.6), limits.capPD);

    timeout.current = correct
      ? Math.max(timeout.current * 0.97, 1.6)
      : Math.min(timeout.current * 1.06, 4.4);

    presented.current = true;
    timer.current = 0;
  }

  useEffect(() => {
    bandL.uniforms.uMode.value = 0; // left-eye-only → red strip
    bandC.uniforms.uMode.value = 1; // binocular → purple fusion strip
    bandC.uniforms.uDual.value = 1; // red+blue dot union (HTS component style)
    bandR.uniforms.uMode.value = 2; // right-eye-only → blue strip
    markerMatL.uniforms.uMode.value = 0;
    markerMatL.uniforms.uSolid.value = 1;
    markerMatL.uniforms.uColor.value = new THREE.Color('#ef4444');
    markerMatR.uniforms.uMode.value = 2;
    markerMatR.uniforms.uSolid.value = 1;
    markerMatR.uniforms.uColor.value = new THREE.Color('#3b82f6');
  }, [bandL, bandC, bandR, markerMatL, markerMatR]);

  useEffect(() => () => {
    Object.values(arrowMasks).forEach((t) => t.dispose());
    subMat.dispose();
    bandL.dispose();
    bandC.dispose();
    bandR.dispose();
    markerMatL.dispose();
    markerMatR.dispose();
  }, [arrowMasks, subMat, bandL, bandC, bandR, markerMatL, markerMatR]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const sg = subGroup.current;
    if (!sg) return;

    // Live camera → world-units-per-pixel (§3.3.5). Recomputed every frame so a
    // window resize changes the *pixels* a demand occupies, never its Δ value.
    const cam = cameraSpecFrom(state.camera as THREE.PerspectiveCamera, state.size.height);
    const toWorld = (pd: number) => pdToWorldShift(pd, DEFAULT_VIEW, DEFAULT_SCREEN, cam);

    // Vertical vergence drives the per-eye vertical offset instead of masked
    // horizontal disparity; both are "shift the content by d px" (§3.3.4), so
    // the same Δ → world conversion applies. The horizontal anchor below keeps
    // the target fused at screen depth while the vertical demand is trained.
    if (eyeOffsetRef) {
      const vsign = variant === 'base-up' ? BASE_UP_IMAGE_DOWN : BASE_DOWN_IMAGE_UP;
      eyeOffsetRef.current = vertical ? toWorld(vsign * demandPD.current) : 0;
    }

    if (!running) {
      sg.visible = false;
      return;
    }
    sg.visible = true;

    if (presented.current) {
      // New trial: re-randomise the target; draw a fresh magnitude and direction
      // for the unpredictable walk (course §4.6).
      presented.current = false;
      timer.current = 0;
      orientation.current = randDir();
      subMat.uniforms.uMask.value = arrowMasks[orientation.current];
      if (variant === 'jump-ductions') ductionPhase.current = 0;
      if (variant === 'jump-random') {
        trialMag.current = randRange(startPD, Math.max(startPD * 1.5, demandPD.current));
        trialSign.current = Math.random() < 0.5 ? -1 : 1;
      }
    }

    let sign: number;
    let magnitude: number;
    switch (variant) {
      case 'divergence':
      case 'base-down':
        sign = -1;                        // uncrossed / Base-In, §2.1
        magnitude = demandPD.current;
        break;
      case 'jump-random':
        sign = trialSign.current;
        magnitude = trialMag.current;
        break;
      case 'jump-ductions':
        // Square wave: near (+) then far (−) every holdSec (course §4.5).
        ductionPhase.current += d;
        sign =
          ductionPhase.current % (2 * LIMITS.jumpDuctions.holdSec) < LIMITS.jumpDuctions.holdSec
            ? 1
            : -1;
        magnitude = demandPD.current;
        break;
      case 'base-up':
      case 'convergence':
      default:
        sign = 1;
        magnitude = demandPD.current;
        break;
    }

    // Sub-target sits off-center in a random arrow direction; the signed demand
    // becomes the masked disparity via the RDS material (whole-texel snapped).
    const off = 0.55;
    const ox = orientation.current === 'left' ? -off : orientation.current === 'right' ? off : 0;
    const oy = orientation.current === 'down' ? -off : orientation.current === 'up' ? off : 0;
    sg.position.set(ox, oy, 0);

    subMat.uniforms.uShift.value = vertical
      ? toWorld(HORIZONTAL_ANCHOR_PD)     // fusion anchor only; demand is vertical
      : toWorld(sign * magnitude);
  });

  return (
    <group>
      {/* HTS-style tri-band display: three 2.5-wide bands tiling a centered
          7.5×3.8 block — red strip, purple fusion zone, blue strip — with
          black margins all around (like the HTS screen). */}
      <mesh material={bandL} position={[-2.5, 0, -0.06]} renderOrder={-8} frustumCulled={false}>
        <planeGeometry args={[2.5, 3.8]} />
      </mesh>
      <mesh material={bandC} position={[0, 0, -0.06]} renderOrder={-7} frustumCulled={false}>
        <planeGeometry args={[2.5, 3.8]} />
      </mesh>
      <mesh material={bandR} position={[2.5, 0, -0.06]} renderOrder={-6} frustumCulled={false}>
        <planeGeometry args={[2.5, 3.8]} />
      </mesh>
      {/* Suppression-check markers flank the fusion strip, inside its edges. */}
      <mesh ref={markerL} material={markerMatL} position={[-0.55, 0, -0.05]} renderOrder={-5}>
        <planeGeometry args={[0.28, 0.28]} />
      </mesh>
      <mesh ref={markerR} material={markerMatR} position={[0.55, 0, -0.05]} renderOrder={-5}>
        <planeGeometry args={[0.28, 0.28]} />
      </mesh>
      <group ref={subGroup} renderOrder={2}>
        <mesh material={subMat}>
          <planeGeometry args={[0.55, 0.55]} />
        </mesh>
      </group>
    </group>
  );
}

export function variantForExercise(id: ExerciseId): VergenceVariant | null {
  switch (id) {
    case 'convergence':
      return 'convergence';
    case 'divergence':
      return 'divergence';
    case 'jump-ductions':
      return 'jump-ductions';
    case 'jump-random':
      return 'jump-random';
    case 'vergence-base-up':
      return 'base-up';
    case 'vergence-base-down':
      return 'base-down';
    default:
      return null;
  }
}
