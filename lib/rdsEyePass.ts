import * as THREE from 'three';
import { getSharedNoiseTexture, NOISE_SIZE, NOISE_UNITS } from './textures';

/**
 * Per-eye random-dot-stereogram material.
 *
 * The anaglyph composer (components/AnaglyphRig.tsx) renders the scene twice
 * per frame — left eye, then right eye — and calls setEyePass() between the
 * passes. Every registered RdsMaterial then samples the shared speckle field
 * with the opposite lateral offset inside its mask region, giving the masked
 * shape a binocular disparity: it fuses at a depth in front of / behind the
 * screen while remaining pure noise to either eye alone.
 *
 * Disparity convention: uShift > 0 shifts the masked dots of the LEFT image
 * right and the RIGHT image left (images move toward each other) = crossed /
 * Base-Out / convergence demand = nearer percept; uShift < 0 sinks the shape
 * behind the field (course §2.1, §2.4).
 *
 * uShift is in WORLD UNITS at the stimulus plane and is snapped to whole noise
 * texels (NOISE_TEXEL_WORLD ≈ 0.0234 wu ≈ 6 px ≈ 0.23 Δ on the reference display
 * with the z = 6, fov 50° camera — course §3.3.5).
 * Compute it with `pdToWorldShift(pd, view, screen, cam)` — never with a bare
 * constant: a demand expressed in world units changes meaning with the monitor
 * and the window size (course §3.3.5, audit §H).
 */

const registry = new Set<RdsMaterial>();

export class RdsMaterial extends THREE.ShaderMaterial {
  constructor(mask: THREE.Texture) {
    super({
      uniforms: {
        uNoise: { value: getSharedNoiseTexture() },
        uMask: { value: mask },
        /** Masked-region lateral disparity, in world units. */
        uShift: { value: 0 },
        /** +1 during the left-eye pass, -1 during the right-eye pass. */
        uEye: { value: 1 },
        /** 0 = left-only, 1 = binocular, 2 = right-only. */
        uMode: { value: 1 },
        /** 1 = component anaglyph union (red+blue dots). */
        uDual: { value: 0 },
        /** 1 = solid uColor fill shape-weighted (markers). */
        uSolid: { value: 0 },
        /** Solid fill color for markers (left: red, right: blue). */
        uColor: { value: new THREE.Color(1, 1, 1) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uNoise;
        uniform sampler2D uMask;
        uniform float uShift;
        // Per-pass sign from the composer: +1 left pass, -1 right pass.
        uniform float uEye;
        // Channel mode: 0 = left-eye-only (red strip), 1 = binocular RDS,
        // 2 = right-eye-only (blue strip).
        uniform float uMode;
        // 1 = component anaglyph: both passes draw noise and the composite
        // unions red+blue dots (classic HTS purple fusion zone).
        uniform float uDual;
        // 1 = solid uColor fill, shape-weighted (fixation markers).
        uniform float uSolid;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vWorld;

        void main() {
          // Visibility comes from the channel mode only: left pass shows
          // modes 0 and 1; right pass modes 1 and 2. (Mask alpha must never
          // gate visibility — empty masks mean "plain noise everywhere".)
          bool leftPass = uEye > 0.0;
          float vis = uMode < 0.5 ? (leftPass ? 1.0 : 0.0)
                    : uMode < 1.5 ? 1.0
                    : (leftPass ? 0.0 : 1.0);
          if (vis < 0.5) discard;
          // Shape alpha weights only the disparity: 1 inside the target,
          // 0 outside (surround strips use empty masks = zero disparity).
          float shape = texture2D(uMask, vUv).a;
          // World-locked noise coords: unmasked regions of every surface
          // sample identical dots in both eyes (zero disparity, fused at the
          // screen plane and camouflaged against the surround field).
          vec2 wuv = vWorld.xy / ${NOISE_UNITS}.0;
          // Snap the disparity to whole noise texels — clean Julesz dot-level
          // shifts fuse crisply; fractional shifts resample the dot grid (dots
          // change width, the two eyes stop seeing pure shifts of each other)
          // and the target shimmers instead of fusing at a depth.
          //
          // UNITS, in this order: world → texels → UV.
          //   texels = shift · (NOISE_SIZE / NOISE_UNITS)
          //   uv offset = texels / NOISE_SIZE
          // Dividing by NOISE_UNITS instead of NOISE_SIZE in the second step is
          // a ~12× disparity error (see course audit §H). Monocular strips stay
          // at zero disparity so they read as continuations of the field in
          // their own eye.
          float shift = uMode < 0.5 || uMode > 1.5 ? 0.0 : uShift * uEye * shape;
          float texels = floor(shift * (${NOISE_SIZE}.0 / ${NOISE_UNITS}.0) + 0.5);
          vec4 texel = texture2D(uNoise, wuv - vec2(texels / ${NOISE_SIZE}.0, 0.0));
          vec3 noise = texel.rgb * 0.85;
          vec3 col = uSolid > 0.5 ? mix(noise, uColor, shape) : noise;
          // Alpha is an isolation signal for the composer: monocular strips
          // and component-mode (dual) content write alpha 0.5 — the composite
          // routes them straight into the red/blue channels; full-alpha
          // content gets the Dubois mix. Replace-mode blending stores that
          // signal without it affecting the color overdraw.
          float alpha = uMode < 0.5 || uMode > 1.5 || uDual > 0.5 ? 0.5 : 1.0;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.ZeroFactor,
    });
    registry.add(this);
  }

  dispose(): void {
    registry.delete(this);
    super.dispose();
  }
}

/** Flip every RDS material to its left- or right-eye sampling offset. */
export function setEyePass(left: boolean): void {
  const eye = left ? 1 : -1;
  for (const m of registry) {
    m.uniforms.uEye.value = eye;
  }
}

/** Speckle-only material (empty mask) for the zero-disparity surround. */
export function createSpeckleMaterial(mask: THREE.Texture): RdsMaterial {
  return new RdsMaterial(mask);
}
