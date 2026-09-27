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
      camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 100 }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <color attach="background" args={['#05070a']} />
      <AnaglyphRig eyeOffsetRef={eyeOffsetRef} enabledRef={enabledRef} />
      {children}
    </Canvas>
  );
}
