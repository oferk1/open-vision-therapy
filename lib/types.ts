/** Shared types for the vision therapy suite. */
import type { MutableRefObject } from 'react';


export type ExerciseId =
  | 'pursuits'
  | 'saccades'
  | 'convergence'
  | 'divergence'
  | 'jump-ductions'
  | 'jump-random'
  | 'accommodative-rock'
  | 'vergence-base-up'
  | 'vergence-base-down';

export type ArrowDir = 'up' | 'down' | 'left' | 'right';

export interface ExerciseMeta {
  id: ExerciseId;
  name: string;
  /** One-line mechanic summary shown on the menu card. */
  blurb: string;
  /** Default minutes offered in the pre-exercise modal. */
  defaultMinutes: number;
  /** Whether the exercise needs red/cyan fusion (i.e. true stereo demand). */
  stereo: boolean;
  /** Keyboard hint shown before starting. */
  controls: string;
}

export interface Score {
  correct: number;
  incorrect: number;
  total: number;
}

/** Optional per-exercise difficulty settings, populated from the config modal. */
export interface ExerciseSettings {
  durationMinutes: number;
  /**
   * Clinical-demand scale for vergence exercises: 1.0 = the `LIMITS` ladder
   * defaults (course §4.11), clamped to 0.25–2× inside the engines. Demands are
   * always computed in prism diopters, never in world units.
   */
  baseDepth: number;
  /** Movement speed multiplier for pursuits (1 = default). */
  speed: number;
}

export interface ExerciseResult {
  id: ExerciseId;
  name: string;
  /** Session finish time (ms epoch). */
  completedAt: number;
  durationSeconds: number;
  score: Score;
  percent: number;
  /** Highest difficulty level reached, if the exercise escalates. */
  level: number;
}

/** Internal target description each exercise engine produces for the scene. */
export interface TargetState {
  /** X/Y position in world units at the focal plane. */
  x: number;
  y: number;
  /** Signed Z offset from the focal plane (negative = toward viewer). */
  z: number;
  orientation: ArrowDir;
  size: number;
}

/** Mutable per-session stats shared between the view and the engine. */
export interface EngineStats {
  score: Score;
  level: number;
}

/** Input surface an engine registers so the view can forward keystrokes. */
export interface EngineHandles {
  respond: (dir: ArrowDir) => void;
}

/** Props every exercise engine receives from the active exercise view. */
export interface EngineProps {
  settings: ExerciseSettings;
  /** False during the pre-roll countdown; engines freeze and ignore input. */
  running: boolean;
  statsRef: MutableRefObject<EngineStats>;
  inputRef: MutableRefObject<EngineHandles | null>;
  /** Live left-eye vertical offset (world units); only vertical vergence engines write it. */
  eyeOffsetRef?: MutableRefObject<number>;
  onStats?: (stats: EngineStats) => void;
}
