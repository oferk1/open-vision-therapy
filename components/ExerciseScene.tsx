'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { EngineProps, ExerciseId } from '../lib/types';
import { SpeckleField } from './SpeckleField';
import PursuitsEngine from './exercises/Pursuits';
import SaccadesEngine from './exercises/Saccades';
import AccommodativeRockEngine from './exercises/AccommodativeRock';
import VergenceBaseEngine, { variantForExercise } from './exercises/VergenceBase';

/** Small central fixation cross shown behind vergence targets. */
function FixationCross() {
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#64748b', transparent: true, opacity: 0.6 }),
    []
  );
  return (
    <group position={[0, 0, -0.05]} renderOrder={-5}>
      <mesh material={material} position={[0, 0, 0]} renderOrder={-5}>
        <planeGeometry args={[0.08, 0.5]} />
      </mesh>
      <mesh material={material} renderOrder={-5}>
        <planeGeometry args={[0.5, 0.08]} />
      </mesh>
    </group>
  );
}

function EngineFor({ id, engineProps }: { id: ExerciseId; engineProps: EngineProps }) {
  const vergenceVariant = variantForExercise(id);
  if (id === 'pursuits') return <PursuitsEngine {...engineProps} />;
  if (id === 'saccades') return <SaccadesEngine {...engineProps} />;
  if (id === 'accommodative-rock') return <AccommodativeRockEngine {...engineProps} />;
  if (vergenceVariant) return <VergenceBaseEngine variant={vergenceVariant} {...engineProps} />;
  return null;
}

export default function ExerciseScene({ id, engineProps }: { id: ExerciseId; engineProps: EngineProps }) {
  const vergenceVariant = variantForExercise(id);
  const showFixation = !vergenceVariant && id !== 'pursuits' && id !== 'saccades' && id !== 'accommodative-rock';
  // Vergence modes render the HTS-style tri-band display, which replaces the
  // surround entirely — a world-wide speckle field would bleed under the
  // monocular strips in the opposite eye's pass and break channel isolation.
  return (
    <>
      {!vergenceVariant && <SpeckleField />}
      {showFixation && <FixationCross />}
      <EngineFor id={id} engineProps={engineProps} />
    </>
  );
}
