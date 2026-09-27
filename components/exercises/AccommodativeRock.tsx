'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { makeEMaskTexture } from '../../lib/textures';
import { RdsMaterial } from '../../lib/rdsEyePass';
import type { ArrowDir, EngineProps } from '../../lib/types';
import { randDir } from '../../lib/utils';
import { useEngineInput } from './shared';

/** Disparity (world units) of the far/near rock states. */
const FAR_SHIFT = 0.06;
const NEAR_SHIFT = 0.26;

export default function AccommodativeRockEngine({ settings, running, statsRef, inputRef, onStats }: EngineProps) {
  const group = useRef<THREE.Group>(null);
  const orientation = useRef<ArrowDir>(randDir());
  const phaseFar = useRef(true);
  const timer = useRef(0);
  const halfPeriod = useRef(2.4);
  const awaiting = useRef(true);

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
      halfPeriod.current = Math.max(halfPeriod.current * 0.93, 0.8);
    } else {
      halfPeriod.current = Math.min(halfPeriod.current * 1.1, 3.6);
    }
    // Rock to the opposite depth state on every response.
    phaseFar.current = !phaseFar.current;
    awaiting.current = true;
  }

  useEffect(() => () => {
    Object.values(masks).forEach((t) => t.dispose());
    material.dispose();
  }, [masks, material]);

  useFrame((_state, delta) => {
    if (!running) return;
    const d = Math.min(delta, 0.05);

    if (awaiting.current) {
      orientation.current = randDir();
      material.uniforms.uMask.value = masks[orientation.current];
      awaiting.current = false;
      timer.current = 0;
      return;
    }

    material.uniforms.uShift.value = phaseFar.current ? FAR_SHIFT : NEAR_SHIFT;

    timer.current += d;
    if (timer.current >= halfPeriod.current) {
      const s = statsRef.current;
      s.score.total += 1;
      s.score.incorrect += 1;
      if (onStats) onStats({ score: { ...s.score }, level: s.level });
      phaseFar.current = !phaseFar.current;
      awaiting.current = true;
    }
  });

  return (
    <group ref={group}>
      <mesh material={material}>
        <planeGeometry args={[1.2, 1.2]} />
      </mesh>
    </group>
  );
}
