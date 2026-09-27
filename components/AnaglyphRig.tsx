'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AnaglyphEffect } from 'three-stdlib';
import { setEyeVerticalOffset } from '../lib/anaglyphEyeOffset';

interface RigProps {
  /** Live left-eye vertical offset in world units (base up/down). */
  eyeOffsetRef: React.MutableRefObject<number>;
  /** When false, the canvas clears to black (pre-roll / paused). */
  enabledRef: React.MutableRefObject<boolean>;
}

export function AnaglyphRig({ eyeOffsetRef, enabledRef }: RigProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const effect = useMemo(() => new AnaglyphEffect(gl), [gl]);

  // Keep the anaglyph render targets in sync with canvas size without
  // calling effect.setSize (it would fight R3F's own renderer sizing).
  useEffect(() => {
    const w = Math.floor(gl.domElement.width);
    const h = Math.floor(gl.domElement.height);
    const internal = effect as unknown as {
      _renderTargetL?: { setSize: (w: number, h: number) => void };
      _renderTargetR?: { setSize: (w: number, h: number) => void };
    };
    internal._renderTargetL?.setSize(w, h);
    internal._renderTargetR?.setSize(w, h);
  }, [gl, effect, sizeKey(gl)]);

  useFrame(() => {
    if (!enabledRef.current) {
      gl.clear(true, true, true);
      return;
    }
    setEyeVerticalOffset(eyeOffsetRef.current);
    effect.render(scene, camera);
  }, 1);

  return null;
}

function sizeKey(gl: { domElement: HTMLCanvasElement }): string {
  return `${gl.domElement.width}x${gl.domElement.height}`;
}
