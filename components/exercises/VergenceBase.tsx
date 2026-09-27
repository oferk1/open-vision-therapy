'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { makeDisparityTexture, makeFrameTexture } from '../../lib/textures';
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

const FRAME_SIZE = 3.6;
const SUB_SIZE = 0.55;

export default function VergenceBaseEngine({
  variant,
  settings,
  running,
  statsRef,
  inputRef,
  eyeOffsetRef,
  onStats,
}: VergenceBaseProps) {
  const frameRef = useRef<THREE.Mesh>(null);
  const subRef = useRef<THREE.Mesh>(null);
  const subGroup = useRef<THREE.Group>(null);
  const orientation = useRef<ArrowDir>('up');
  const depth = useRef(settings.baseDepth);
  const targetDepth = useRef(settings.baseDepth);
  const ductionPhase = useRef(0);
  const timeout = useRef(3.4);
  const timer = useRef(0);
  const pendingPresent = useRef(true);
  const vertical = variant === 'base-up' || variant === 'base-down';

  const textures = useMemo(() => {
    const map = {} as Record<ArrowDir, THREE.Texture>;
    for (const d of ARROW_DIRS) map[d] = makeDisparityTexture(d);
    return map;
  }, []);

  const frameMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: makeFrameTexture(), transparent: true }),
    []
  );
  const subMat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, map: textures.up }),
    [textures]
  );

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
    Object.values(textures).forEach((t) => t.dispose());
    frameMat.dispose();
    subMat.dispose();
  }, [textures, frameMat, subMat]);

  useFrame((_state, delta) => {
    const d = Math.min(delta, 0.05);
    const sub = subRef.current;
    const sg = subGroup.current;
    if (!sub || !sg) return;

    // Vertical vergence exercises drive the per-eye vertical offset instead
    // of Z-axis disparity.
    if (eyeOffsetRef) {
      if (vertical) {
        const off = (variant === 'base-up' ? 1 : -1) * targetDepth.current * 0.15;
        eyeOffsetRef.current = off;
      } else {
        eyeOffsetRef.current = 0;
      }
    }

    if (!running) {
      sub.visible = false;
      return;
    }
    sub.visible = true;

    if (pendingPresent.current) {
      pendingPresent.current = false;
      timer.current = 0;
      orientation.current = randDir();
      subMat.map = textures[orientation.current];
      subMat.needsUpdate = true;

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

    // Sub-target sits off-center in a random arrow direction.
    const off = 0.55;
    const ox = orientation.current === 'left' ? -off : orientation.current === 'right' ? off : 0;
    const oy = orientation.current === 'down' ? -off : orientation.current === 'up' ? off : 0;
    sg.position.set(ox, oy, depth.current);

    timer.current += d;
    if (timer.current >= timeout.current) {
      const s = statsRef.current;
      s.score.total += 1;
      s.score.incorrect += 1;
      if (onStats) onStats({ score: { ...s.score }, level: s.level });
      pendingPresent.current = true;
      timer.current = 0;
    }

    if (frameRef.current) {
      frameRef.current.position.z = 0;
    }
  });

  return (
    <group>
      <mesh ref={frameRef} material={frameMat}>
        <planeGeometry args={[FRAME_SIZE, FRAME_SIZE]} />
      </mesh>
      <group ref={subGroup}>
        <mesh ref={subRef} material={subMat}>
          <planeGeometry args={[SUB_SIZE, SUB_SIZE]} />
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
