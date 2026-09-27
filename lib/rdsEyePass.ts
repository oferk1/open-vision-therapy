import * as THREE from 'three';
import { getSharedNoiseTexture, NOISE_UNITS } from './textures';

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
 * Disparity convention: uShift > 0 behaves like positive world Z (toward the
 * viewer, convergence demand); uShift < 0 sinks the shape behind the field.
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
        uniform float uEye;
        varying vec2 vUv;
        varying vec3 vWorld;

        void main() {
          float m = texture2D(uMask, vUv).a;
          // World-locked noise coords: unmasked regions of every surface
          // sample identical dots in both eyes (zero disparity, fused at the
          // screen plane and camouflaged against the surround field).
          vec2 wuv = vWorld.xy / ${NOISE_UNITS}.0;
          // Snap the disparity to whole noise texels — clean Julesz dot-level
          // shifts fuse crisply; fractional shifts smear dot edges.
          float texels = floor(uShift * uEye * m * ${NOISE_UNITS}.0 + 0.5);
          vec4 texel = texture2D(uNoise, wuv - vec2(texels / ${NOISE_UNITS}.0, 0.0));
          // Fully opaque noise (white/black dots, no holes): the naked-eye
          // image is uniform speckle everywhere — the masked shape exists
          // only as binocular disparity. Slightly dimmed for comfort under
          // the Dubois composite.
          gl_FragColor = vec4(texel.rgb * 0.85, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
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
