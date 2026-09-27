'use client';

import { useEffect, useRef } from 'react';
import { beepCorrect, beepIncorrect } from '../../lib/audio';
import type { ArrowDir, EngineHandles, EngineProps } from '../../lib/types';

/**
 * Registers the engine's respond() handler into inputRef for the lifetime of
 * the component. The handler guards on running state, scores the attempt,
 * fires audio feedback, then delegates to the engine-specific onResult.
 * `getExpected` reads the engine's currently-presented direction.
 */
export function useEngineInput(
  props: EngineProps,
  getExpected: () => ArrowDir,
  onResult: (dir: ArrowDir, correct: boolean) => void
): void {
  const propsRef = useRef(props);
  propsRef.current = props;
  const getExpectedRef = useRef(getExpected);
  getExpectedRef.current = getExpected;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const handles: EngineHandles = {
      respond: (dir: ArrowDir) => {
        const p = propsRef.current;
        if (!p.running) return;
        const stats = p.statsRef.current;
        stats.score.total += 1;
        const correct = getExpectedRef.current() === dir;
        if (correct) {
          stats.score.correct += 1;
          beepCorrect();
        } else {
          stats.score.incorrect += 1;
          beepIncorrect();
        }
        onResultRef.current(dir, correct);
        if (p.onStats) p.onStats({ score: { ...stats.score }, level: stats.level });
      },
    };
    props.inputRef.current = handles;
    return () => {
      if (props.inputRef.current === handles) {
        props.inputRef.current = null;
      }
    };
    // inputRef/statsRef are stable React refs; props identity changes every
    // render on purpose (stored into a ref, not captured).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.inputRef, props.statsRef]);
}
