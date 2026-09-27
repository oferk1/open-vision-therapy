import type {
  ExerciseId,
  ExerciseMeta,
  ExerciseSettings,
} from './types';

/** The nine HTS2 modes, in menu order (3x3 grid). */
export const EXERCISES: ExerciseMeta[] = [
  {
    id: 'pursuits',
    name: 'Pursuits',
    blurb: 'Smoothly follow a drifting target; report its E orientation.',
    defaultMinutes: 3,
    stereo: false,
    controls: 'Arrow keys',
  },
  {
    id: 'saccades',
    name: 'Saccades',
    blurb: 'Target jumps randomly; snap your eyes to it and report orientation.',
    defaultMinutes: 3,
    stereo: false,
    controls: 'Arrow keys',
  },
  {
    id: 'convergence',
    name: 'Convergence (Base-Out)',
    blurb: 'Sub-target pops toward you; converge to fuse and report its position.',
    defaultMinutes: 5,
    stereo: true,
    controls: 'Arrow keys',
  },
  {
    id: 'divergence',
    name: 'Divergence (Base-In)',
    blurb: 'Sub-target sinks into the screen; relax fusion and report its position.',
    defaultMinutes: 5,
    stereo: true,
    controls: 'Arrow keys',
  },
  {
    id: 'jump-ductions',
    name: 'Jump Ductions',
    blurb: 'Depth snaps between near and far; report the sub-target position at each jump.',
    defaultMinutes: 5,
    stereo: true,
    controls: 'Arrow keys',
  },
  {
    id: 'jump-random',
    name: 'Jump Random',
    blurb: 'Depth jumps to random stereo demand; report the sub-target position.',
    defaultMinutes: 5,
    stereo: true,
    controls: 'Arrow keys',
  },
  {
    id: 'accommodative-rock',
    name: 'Accommodative Rock',
    blurb: 'Target rocks between far (small/fine) and near (large/bold) focus; report orientation.',
    defaultMinutes: 3,
    stereo: false,
    controls: 'Arrow keys',
  },
  {
    id: 'vergence-base-up',
    name: 'Vergence Base Up',
    blurb: 'Left view shifts up; fuse the vertical mismatch and report position.',
    defaultMinutes: 5,
    stereo: true,
    controls: 'Arrow keys',
  },
  {
    id: 'vergence-base-down',
    name: 'Vergence Base Down',
    blurb: 'Left view shifts down; fuse the vertical mismatch and report position.',
    defaultMinutes: 5,
    stereo: true,
    controls: 'Arrow keys',
  },
];

export const EXERCISE_MAP: Record<ExerciseId, ExerciseMeta> = EXERCISES.reduce(
  (acc, e) => {
    acc[e.id] = e;
    return acc;
  },
  {} as Record<ExerciseId, ExerciseMeta>
);

/** All valid exercise ids, used for generateStaticParams and route guards. */
export const EXERCISE_IDS: ExerciseId[] = EXERCISES.map((e) => e.id);

/** Narrow a raw route param to an ExerciseId. */
export function isExerciseId(id: string): id is ExerciseId {
  return Object.prototype.hasOwnProperty.call(EXERCISE_MAP, id);
}

/** Default difficulty settings for an exercise (config page may override). */
export function defaultSettings(meta: ExerciseMeta): ExerciseSettings {
  return { durationMinutes: meta.defaultMinutes, baseDepth: 0.35, speed: 1 };
}
