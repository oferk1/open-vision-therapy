'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { makeArrowMaskTexture } from '../../lib/textures';
import { RdsMaterial } from '../../lib/rdsEyePass';
import type { ArrowDir, EngineProps, ExerciseId } from '../../lib/types';
import { ARROW_DIRS, randDir, randRange } from '../../lib/utils';
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
 * Disparity scaling: engine `depth` values (config demand + escalation steps)
 * map to masked-region lateral shift in world units. The shared noise dot
 * pitch is NOISE_UNITS/512 ≈ 0.008 world units, so SHIFT_SCALE × depth gives
 * a sensible dot count at default depths.
 */
const SHIFT_SCALE = 0.06;

export default function VergenceBaseEngine({
  variant,
  settings,
  running,
  statsRef,
  inputRef,
  eyeOffsetRef,
  onStats,
}: VergenceBaseProps) {
  const subGroup = useRef<THREE.Group>(null);  const orientation = useRef<ArrowDir>('up');
  const depth = useRef(settings.baseDepth);
  const targetDepth = useRef(settings.baseDepth);
  const ductionPhase = useRef(0);
  const timeout = useRef(3.4);
  const timer = useRef(0);
  const pendingPresent = useRef(true);
  const vertical = variant === 'base-up' || variant === 'base-down';

  const subMat = useMemo(() => new RdsMaterial(makeArrowMaskTexture('up')), []);

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

  function onAnswered(_dir: ArrowDir, correct: boolean) {
    if (correct) {
      if (vertical) {
        targetDepth.current = Math.min(targetDepth.current + 0.05, 0.6);
      } else if (variant === 'jump-ductions' || variant === 'jump-random') {
        targetDepth.current = Math.min(targetDepth.current + 0.08, 1.6);
      } else {
        targetDepth.current = Math.min(targetDepth.current + 0.12, 1.8);
      }
      timeout.current = Math.max(timeout.current * 0.97, 1.6);
    } else {
      targetDepth.current = Math.max(targetDepth.current - 0.08, settings.baseDepth * 0.6);
      timeout.current = Math.min(timeout.current * 1.06, 4.4);
    }
    pendingPresent.current = true;
    timer.current = 0;
  }

  useEffect(() => () => {
    Object.values(arrowMasks).forEach((t) => t.dispose());
    subMat.dispose();
  }, [arrowMasks, subMat]);

  useFrame((_state, delta) => {
    const d = Math.min(delta, 0.05);
    const sg = subGroup.current;
    if (!sg) return;

    // Vertical vergence exercises drive the per-eye vertical offset instead
    // of masked horizontal disparity.
    if (eyeOffsetRef) {
      eyeOffsetRef.current = vertical
        ? (variant === 'base-up' ? 1 : -1) * targetDepth.current * 0.15
        : 0;
    }

    if (!running) {
      sg.visible = false;
      return;
    }
    sg.visible = true;

    if (pendingPresent.current) {
      pendingPresent.current = false;
      timer.current = 0;
      orientation.current = randDir();
      subMat.uniforms.uMask.value = arrowMasks[orientation.current];

      if (variant === 'convergence') {
        depth.current = targetDepth.current;
      } else if (variant === 'divergence') {
        depth.current = -targetDepth.current;
      } else if (variant === 'jump-random') {
        const mag = randRange(0.4, Math.max(0.6, targetDepth.current));
        depth.current = Math.random() < 0.5 ? mag : -mag;
      } else if (variant === 'jump-ductions') {
        ductionPhase.current = 0;
        depth.current = targetDepth.current;
      }
    }

    if (variant === 'jump-ductions') {
      // Snap between near (+) and far (-) every 1.5s.
      ductionPhase.current += d;
      const near = targetDepth.current;
      depth.current = ductionPhase.current % 3.0 < 1.5 ? near : -near;
    }

    // Sub-target sits off-center in a random arrow direction; depth becomes
    // the masked disparity via the RDS material.
    const off = 0.55;
    const ox = orientation.current === 'left' ? -off : orientation.current === 'right' ? off : 0;
    const oy = orientation.current === 'down' ? -off : orientation.current === 'up' ? off : 0;
    sg.position.set(ox, oy, 0);
    subMat.uniforms.uShift.value = depth.current * SHIFT_SCALE;
  });

  return (
    <group>
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
