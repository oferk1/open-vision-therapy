'use client';

import { Canvas } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { AnaglyphRig } from './AnaglyphRig';

interface AnaglyphCanvasProps {
  /** Live left-eye vertical offset in world units (base up/down). */
  eyeOffsetRef: React.MutableRefObject<number>;
  /** When false, the canvas clears to black. */
  enabledRef: React.MutableRefObject<boolean>;
  children: ReactNode;
}

/**
 * Full-screen R3F canvas. Imported only via next/dynamic with ssr:false,
 * so WebGL code never runs during static export or hydration.
 */
export default function AnaglyphCanvas({
  eyeOffsetRef,
  enabledRef,
  children,
}: AnaglyphCanvasProps) {
  return (
    <Canvas
      className="fixed inset-0"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      // `focus` is where THREE.StereoCamera puts the zero-disparity plane
      // (eyeSepOnProjection = eyeSep/2 · near / focus). It must equal the
      // camera → stimulus-plane distance: at the default 10, every point on the
      // z = 0 plane — surround, strips, markers — carried a constant ~6.6 px
      // (0.26 Δ) of spurious crossed disparity (course §3.3.3, harness §J).
      camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 100, focus: 6 }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <color attach="background" args={['#05070a']} />
      <AnaglyphRig eyeOffsetRef={eyeOffsetRef} enabledRef={enabledRef} />
      {children}
    </Canvas>
  );
}
