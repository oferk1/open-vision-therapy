'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { makeEmptyMaskTexture } from '../lib/textures';
import { RdsMaterial } from '../lib/rdsEyePass';

/** Full-screen speckle surround (covers the frustum at the default camera). */
const SURROUND_SIZE = 16;

/**
 * World-locked zero-disparity speckle field — the RDS camouflage that hides
 * masked targets from the naked eye. Rendered behind everything (renderOrder
 * -10); masked targets render at higher order on top.
 */
export function SpeckleField() {
  const emptyMask = useMemo(() => makeEmptyMaskTexture(), []);
  const material = useMemo(() => new RdsMaterial(emptyMask), [emptyMask]);

  useEffect(
    () => () => {
      emptyMask.dispose();
      material.dispose();
    },
    [emptyMask, material]
  );

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <planeGeometry args={[SURROUND_SIZE, SURROUND_SIZE]} />
    </mesh>
  );
}
