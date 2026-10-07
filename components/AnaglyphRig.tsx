'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { StereoCamera } from 'three';
import { setEyePass } from '../lib/rdsEyePass';
import { setEyeVerticalOffset } from '../lib/anaglyphEyeOffset';

interface RigProps {
  /** Live left-eye vertical offset in world units (base up/down). */
  eyeOffsetRef: React.MutableRefObject<number>;
  /** When false, the canvas clears to black (pre-roll / paused). */
  enabledRef: React.MutableRefObject<boolean>;
}

/**
 * Dubois red/cyan matrices, verbatim from three.js' AnaglyphEffect
 * (three@0.166.1). `fromArray` is COLUMN-major: each triple below is one input
 * channel's contribution to (out R, out G, out B). Row sums: a white left image
 * renders (1.13, −0.09, −0.04) → red; a white right image (−0.13, 1.09, 1.04) →
 * cyan (course §3.3.6, harness §K).
 *
 * The previous hand-written dot() form used the columns of the left matrix as
 * rows — sending 44 % of the left image into the green (cyan-eye) channel — and
 * a right matrix whose last two rows were not Dubois coefficients at all.
 */
const DUBOIS_L = new THREE.Matrix3().fromArray([
  0.4561, -0.0400822, -0.0152161,
  0.500484, -0.0378246, -0.0205971,
  0.176381, -0.0157589, -0.00546856,
]);
const DUBOIS_R = new THREE.Matrix3().fromArray([
  -0.0434706, 0.378476, -0.0721527,
  -0.0879388, 0.73364, -0.112961,
  -0.00155529, -0.0184503, 1.2264,
]);

/**
 * Custom red/cyan anaglyph composer with random-dot-stereogram support.
 *
 * Replaces three-stdlib's AnaglyphEffect so the per-eye RDS materials
 * (lib/rdsEyePass.ts) can switch sampling offset between the two renders:
 * the scene is drawn once per eye through a StereoCamera into a render
 * target each, then composited — left pass into the RED channel, right pass
 * into the CYAN channel (Dubois-style weighting). StereoCamera is used
 * directly so lib/anaglyphEyeOffset.ts's prototype patch (vertical eye
 * shift for Base Up/Down) keeps applying.
 */
export function AnaglyphRig({ eyeOffsetRef, enabledRef }: RigProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const rig = useMemo(() => {
    const stereo = new StereoCamera();
    stereo.eyeSep = 0.064;
    return {
      stereo,
      targetL: new THREE.WebGLRenderTarget(1, 1, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
      }),
      targetR: new THREE.WebGLRenderTarget(1, 1, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
      }),
    };
  }, []);

  // Composite quad: R = red-weighted left view + cyan-weighted right view.
  const composite = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        mapL: { value: rig.targetL.texture },
        mapR: { value: rig.targetR.texture },
        duboisL: { value: DUBOIS_L },
        duboisR: { value: DUBOIS_R },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D mapL;
        uniform sampler2D mapR;
        uniform mat3 duboisL;
        uniform mat3 duboisR;
        varying vec2 vUv;
        void main() {
          vec4 l = texture2D(mapL, vUv);
          vec4 r = texture2D(mapR, vUv);
          // Alpha 0.5 flags channel-routed content (written by the RDS
          // materials): monocular strips go straight into their own channel,
          // dual (component) content unions red+blue like the classic HTS
          // red/blue display. Everything else gets the Dubois mix.
          bool lSig = l.a < 0.99;
          bool rSig = r.a < 0.99;
          if (lSig && !rSig) {
            gl_FragColor = vec4(l.r, 0.0, 0.0, 1.0);
            return;
          }
          if (rSig && !lSig) {
            gl_FragColor = vec4(0.0, 0.0, r.b, 1.0);
            return;
          }
          if (lSig && rSig) {
            gl_FragColor = vec4(l.r, 0.0, r.b, 1.0);
            return;
          }
          // Dubois red/cyan (course §3.3.6): mat3 * vec with column-major
          // uniforms — the exact convention of three.js' AnaglyphEffect, so
          // no coefficient is transposed by hand.
          gl_FragColor = vec4(clamp(duboisL * l.rgb + duboisR * r.rgb, 0.0, 1.0), 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const fsScene = new THREE.Scene();
    fsScene.add(quad);
    return { fsScene, cam, mat };
  }, [rig]);

  useEffect(() => {
    // Render targets must clear to alpha 1 so the composite can distinguish
    // "normal background" from alpha-0 monocular isolation signals.
    gl.setClearColor(0x000000, 1);
  }, [gl]);

  useEffect(() => {
    const w = Math.max(1, Math.floor(size.width * gl.getPixelRatio()));
    const h = Math.max(1, Math.floor(size.height * gl.getPixelRatio()));
    rig.targetL.setSize(w, h);
    rig.targetR.setSize(w, h);
  }, [gl, rig, size]);

  useEffect(
    () => () => {
      rig.targetL.dispose();
      rig.targetR.dispose();
      composite.mat.dispose();
    },
    [rig, composite]
  );

  useFrame(() => {
    if (!enabledRef.current) {
      gl.setRenderTarget(null);
      gl.clear(true, true, true);
      return;
    }

    setEyeVerticalOffset(eyeOffsetRef.current);
    // R3F's default session camera is perspective (see AnaglyphCanvas props);
    // StereoCamera.update's typing just doesn't know it.
    rig.stereo.update(camera as unknown as THREE.PerspectiveCamera);

    // Left pass.
    setEyePass(true);
    gl.setRenderTarget(rig.targetL);
    gl.clear(true, true, true);
    gl.render(scene, rig.stereo.cameraL);

    // Right pass.
    setEyePass(false);
    gl.setRenderTarget(rig.targetR);
    gl.clear(true, true, true);
    gl.render(scene, rig.stereo.cameraR);

    // Composite to screen: left -> red, right -> cyan.
    gl.setRenderTarget(null);
    gl.clear(true, true, true);
    // R3F's render typing narrows to PerspectiveCamera; the full-screen quad
    // pass runs through an OrthographicCamera, which three.js accepts.
    gl.render(composite.fsScene, composite.cam as unknown as THREE.PerspectiveCamera);
  }, 1);

  return null;
}
