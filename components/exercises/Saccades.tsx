'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { makeETexture } from '../../lib/textures';
import type { ArrowDir, EngineProps } from '../../lib/types';
import { randDir, randRange } from '../../lib/utils';
import { useEngineInput } from './shared';

const BOUND = 2.4;

export default function SaccadesEngine({ settings, running, statsRef, inputRef, onStats }: EngineProps) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const orientation = useRef<ArrowDir>(randDir());
  const size = useRef(1.1);
  const timeout = useRef(2.6);
  const timer = useRef(0);
  const awaiting = useRef(true);

  const textures = useMemo(() => ({
    up: makeETexture('up'),
    down: makeETexture('down'),
    left: makeETexture('left'),
    right: makeETexture('right'),
  }), []);

  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, map: textures.up }),
    [textures]
  );

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
    Object.values(textures).forEach((t) => t.dispose());
    material.dispose();
  }, [textures, material]);

  useFrame((_state, delta) => {
    if (!running) return;
    const d = Math.min(delta, 0.05);

    if (awaiting.current) {
      orientation.current = randDir();
      material.map = textures[orientation.current];
      material.needsUpdate = true;
      const g = group.current;
      if (g) {
        g.position.set(randRange(-BOUND, BOUND), randRange(-BOUND, BOUND), 0);
        const sc = size.current;
        mesh.current?.scale.setScalar(sc);
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
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      <mesh ref={mesh} material={material}>
        <planeGeometry args={[1.1, 1.1]} />
      </mesh>
    </group>
  );
}
