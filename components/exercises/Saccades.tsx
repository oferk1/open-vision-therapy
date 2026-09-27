'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { makeEMaskTexture } from '../../lib/textures';
import { RdsMaterial } from '../../lib/rdsEyePass';
import type { ArrowDir, EngineProps } from '../../lib/types';
import { randDir, randRange } from '../../lib/utils';
import { useEngineInput } from './shared';

const BOUND = 2.4;
const TARGET_SIZE = 1.1;

export default function SaccadesEngine({ settings, running, statsRef, inputRef, onStats }: EngineProps) {
  const group = useRef<THREE.Group>(null);
  const orientation = useRef<ArrowDir>(randDir());
  const size = useRef(1.1);
  const timeout = useRef(2.6);
  const timer = useRef(0);
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
      timeout.current = Math.max(timeout.current * 0.94, 1.0);
      size.current = Math.max(size.current * 0.96, 0.5);
    } else {
      timeout.current = Math.min(timeout.current * 1.08, 3.4);
    }
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
      const g = group.current;
      if (g) {
        g.position.set(randRange(-BOUND, BOUND), randRange(-BOUND, BOUND), 0);
        const sc = size.current;
        g.scale.setScalar(sc);
      }
      awaiting.current = false;
      timer.current = 0;
      return;
    }

    timer.current += d;
    if (timer.current >= timeout.current) {
      const s = statsRef.current;
      s.score.total += 1;
      s.score.incorrect += 1;
      if (onStats) onStats({ score: { ...s.score }, level: s.level });
      awaiting.current = true;
    }
    material.uniforms.uShift.value = 0.14;
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      <mesh material={material}>
        <planeGeometry args={[TARGET_SIZE, TARGET_SIZE]} />
      </mesh>
    </group>
  );
}
