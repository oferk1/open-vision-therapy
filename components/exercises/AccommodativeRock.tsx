'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { makeETexture } from '../../lib/textures';
import type { ArrowDir, EngineProps } from '../../lib/types';
import { randDir } from '../../lib/utils';
import { useEngineInput } from './shared';

const FAR_SIZE = 0.55;
const NEAR_SIZE = 1.5;

export default function AccommodativeRockEngine({ settings, running, statsRef, inputRef, onStats }: EngineProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const orientation = useRef<ArrowDir>(randDir());
  const phaseFar = useRef(true);
  const timer = useRef(0);
  const halfPeriod = useRef(2.4);
  const awaiting = useRef(true);

  const farTextures = useMemo(() => ({
    up: makeETexture('up'),
    down: makeETexture('down'),
    left: makeETexture('left'),
    right: makeETexture('right'),
  }), []);

  const nearTextures = useMemo(() => ({
    up: makeETexture('up', true),
    down: makeETexture('down', true),
    left: makeETexture('left', true),
    right: makeETexture('right', true),
  }), []);

  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, map: farTextures.up }),
    [farTextures]
  );

  useEngineInput({ settings, running, statsRef, inputRef, onStats }, () => orientation.current, onAnswered);

  function onAnswered(_dir: ArrowDir, correct: boolean) {
    if (correct) {
      halfPeriod.current = Math.max(halfPeriod.current * 0.93, 0.8);
    } else {
      halfPeriod.current = Math.min(halfPeriod.current * 1.1, 3.6);
    }
    // Rock to the opposite focus on every response.
    phaseFar.current = !phaseFar.current;
    awaiting.current = true;
  }

  useEffect(() => () => {
    Object.values(farTextures).forEach((t) => t.dispose());
    Object.values(nearTextures).forEach((t) => t.dispose());
    material.dispose();
  }, [farTextures, nearTextures, material]);

  useFrame((_state, delta) => {
    if (!running) return;
    const d = Math.min(delta, 0.05);

    if (awaiting.current) {
      orientation.current = randDir();
      material.map = phaseFar.current ? farTextures[orientation.current] : nearTextures[orientation.current];
      material.needsUpdate = true;
      if (mesh.current) {
        mesh.current.scale.setScalar(phaseFar.current ? FAR_SIZE / 1.2 : NEAR_SIZE / 1.2);
      }
      awaiting.current = false;
      timer.current = 0;
      return;
    }

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
    <group>
      <mesh ref={mesh} material={material}>
        <planeGeometry args={[1.2, 1.2]} />
      </mesh>
    </group>
  );
}
