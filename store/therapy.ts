'use client';

/**
 * Plain vanilla app store — no React Context, no external libraries.
 *
 * A module-level singleton object holds the app state; components subscribe
 * with `useTherapy()` (a thin wrapper over React's `useSyncExternalStore`).
 * Actions are plain exported functions. sessionStorage persistence lives
 * here too, so no component ever touches storage directly.
 */

import { useSyncExternalStore } from 'react';
import { EXERCISE_MAP } from '../lib/exercises';
import type {
  ExerciseId,
  ExerciseResult,
  ExerciseSettings,
} from '../lib/types';

export interface ActiveSession {
  id: ExerciseId;
  settings: ExerciseSettings;
  /** Monotonic session key so every start mounts a fresh engine. */
  runKey: number;
}

export interface TherapyState {
  /** Active running session, if any. */
  session: ActiveSession | null;
  /** Result of the most recent completed run. */
  lastResult: ExerciseResult | null;
  /** All completed results this browser session, oldest first. */
  history: ExerciseResult[];
}

const STORAGE_KEY = 'vt-history-v1';

/** The single app state. Reads go through getState(); writes go through actions. */
let state: TherapyState = { session: null, lastResult: null, history: [] };

const listeners = new Set<() => void>();

function setState(next: TherapyState) {
  state = next;
  persist();
  for (const notify of listeners) notify();
}

// ---------------------------------------------------------------------------
// Persistence (history only, browser-tab scoped)
// ---------------------------------------------------------------------------

function persist() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
  } catch {
    // Storage unavailable — history stays in memory.
  }
}

function hydrate() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as ExerciseResult[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      state = { ...state, history: parsed };
    }
  } catch {
    // Malformed storage — start with empty history.
  }
}

// Hydrate stored history once when the client bundle first loads. During the
// hydration render useSyncExternalStore uses the (empty) server snapshot and
// re-renders with the hydrated value right after — no mismatch warnings.
if (typeof window !== 'undefined') {
  hydrate();
}

// ---------------------------------------------------------------------------
// Actions — plain functions, importable anywhere (no provider needed)
// ---------------------------------------------------------------------------

let runCounter = 0;

export function startSession(id: ExerciseId, settings: ExerciseSettings) {
  runCounter += 1;
  setState({
    ...state,
    session: { id, settings, runKey: runCounter },
    lastResult: null,
  });
}

export function finishSession(result: ExerciseResult) {
  const meta = EXERCISE_MAP[result.id];
  const named: ExerciseResult = { ...result, name: meta?.name ?? result.id };
  setState({
    session: null,
    lastResult: named,
    history: [...state.history, named],
  });
}

export function exitEarly() {
  setState({ ...state, session: null });
}

export function clearHistory() {
  setState({ ...state, history: [] });
}

// ---------------------------------------------------------------------------
// React binding + raw access for non-React code
// ---------------------------------------------------------------------------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): TherapyState {
  return state;
}

const SERVER_SNAPSHOT: TherapyState = {
  session: null,
  lastResult: null,
  history: [],
};

/**
 * Subscribe to the store from any component:
 *
 *   const { session, history } = useTherapy();
 */
export function useTherapy(): TherapyState {
  return useSyncExternalStore(subscribe, getState, () => SERVER_SNAPSHOT);
}
