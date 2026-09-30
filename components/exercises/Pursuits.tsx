'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { makeEMaskTexture } from '../../lib/textures';
import { RdsMaterial } from '../../lib/rdsEyePass';
import type { ArrowDir, EngineProps } from '../../lib/types';
import { randDir } from '../../lib/utils';
import {
  DEFAULT_SCREEN,
  DEFAULT_VIEW,
  cameraSpecFrom,
  pdToWorldShift,
} from '../../lib/stereopsis';
import { useEngineInput } from './shared';

const BOUNDS = 2.6;
const TARGET_SIZE = 1.2;

/**
 * Standing disparity of the tracking target, in prism diopters (course §2.4,
 * §4.11). It only has to lift the E off the speckle field for fusion — the dose
 * of this exercise is the *pursuit*, not the vergence — so it is small and must
 * stay inside central Panum's area to fuse effortlessly (~0.2–0.5 Δ, §1.3.3).
 */
const TARGET_PD = 0.4;

export default function PursuitsEngine({ settings, running, statsRef, inputRef, onStats }: EngineProps) {
  const group = useRef<THREE.Group>(null);
  const pos = useRef({ x: 0, y: 0.6, dx: 0.62, dy: 0.38 });
  const orientation = useRef<ArrowDir>(randDir());
  const size = useRef(1.15);
  const speed = useRef(settings.speed);
  const flipTimer = useRef(0);
  const flipInterval = useRef(3.2);
  const awaiting = useRef(true);

  // Four orientation masks, one reusable RDS material — the engine just
  // swaps uMask when the E re-randomizes.
  const masks = useMemo(
    () => ({
      up: makeEMaskTexture('up'),
      down: makeEMaskTexture('down'),
      left: makeEMaskTexture('left'),
      right: makeEMaskTexture('right'),
    }),
    []
  );
  const material = useMemo(() => new RdsMaterial(masks.up), [masks]);

  useEngineInput({ settings, running, statsRef, inputRef, onStats }, () => orientation.current, onAnswered);

  function onAnswered(_dir: ArrowDir, correct: boolean) {
    if (correct) {
      speed.current = Math.min(speed.current * 1.12, 2.6 * settings.speed);
      size.current = Math.max(size.current * 0.97, 0.55);
      flipInterval.current = Math.max(flipInterval.current - 0.25, 1.4);
    }
    awaiting.current = true;
  }

  useEffect(() => () => {
    Object.values(masks).forEach((t) => t.dispose());
    material.dispose();
  }, [masks, material]);

  useFrame((state, delta) => {
    if (!running) return;
    const d = Math.min(delta, 0.05);

    // Δ → world units from the live camera (§3.3.5); never a bare constant.
    const cam = cameraSpecFrom(state.camera as THREE.PerspectiveCamera, state.size.height);

    if (awaiting.current) {
      orientation.current = randDir();
      material.uniforms.uMask.value = masks[orientation.current];
      awaiting.current = false;
    }

    flipTimer.current += d;
    if (flipTimer.current >= flipInterval.current) {
      flipTimer.current = 0;
      const s = statsRef.current;
      s.score.total += 1;
      s.score.incorrect += 1;
      if (onStats) onStats({ score: { ...s.score }, level: s.level });
      awaiting.current = true;
    }

    const g = group.current;
    if (g) {
      const p = pos.current;
      p.x += p.dx * speed.current * d;
      p.y += p.dy * speed.current * d;
      if (Math.abs(p.x) > BOUNDS) { p.x = Math.sign(p.x) * BOUNDS; p.dx *= -1; }
      if (Math.abs(p.y) > BOUNDS) { p.y = Math.sign(p.y) * BOUNDS; p.dy *= -1; }
      g.position.set(p.x, p.y, 0);
      g.scale.setScalar(size.current);
    }
    material.uniforms.uShift.value = pdToWorldShift(TARGET_PD, DEFAULT_VIEW, DEFAULT_SCREEN, cam);
  });

  return (
    <group ref={group} position={[0, 0.6, 0]}>
      <mesh material={material}>
        <planeGeometry args={[TARGET_SIZE, TARGET_SIZE]} />
      </mesh>
    </group>
  );
}
