import { StereoCamera } from 'three';
import type { Camera } from 'three';

/**
 * Vertical eye-offset support for Vergence Base Up / Base Down.
 *
 * `StereoCamera.update(camera)` recomputes both eye matrices from scratch on
 * every render (components/AnaglyphRig.tsx calls it each frame), so a one-off
 * edit of `cameraL.matrixWorld` would be overwritten. We therefore wrap
 * `StereoCamera.prototype.update` and, right after the stock update, nudge the
 * LEFT eye's world matrix vertically (course §3.3.4, mechanism b — a viewpoint
 * translation, exact for the flat stimulus plane at z = 0).
 *
 * Sign: a POSITIVE offset shifts the left-eye IMAGE UP on screen. The prism
 * convention (Base-Up = left image DOWN) is applied by the engine, which passes
 * `BASE_UP_IMAGE_DOWN = -1` × demand (components/exercises/VergenceBase.tsx).
 * The offset is in world units — compute it with `pdToWorldShift`.
 */

let verticalOffset = 0;

/** Set the vertical offset applied to the left eye's render (world units). */
export function setEyeVerticalOffset(v: number): void {
  verticalOffset = v;
}

type PatchableProto = {
  update: (camera: Camera) => void;
  __anaglyphVerticalPatched?: boolean;
};

const proto = StereoCamera.prototype as unknown as PatchableProto;

if (!proto.__anaglyphVerticalPatched) {
  proto.__anaglyphVerticalPatched = true;
  const originalUpdate = proto.update;
  proto.update = function patchedUpdate(this: StereoCamera, camera: Camera) {
    originalUpdate.call(this, camera);
    if (verticalOffset !== 0) {
      // Column-major matrix: elements[13] is the world-space Y translation.
      // Moving the left camera DOWN (subtracting) makes its rendered image
      // shift UP on screen, so we invert the sign here.
      this.cameraL.matrixWorld.elements[13] -= verticalOffset;
      this.cameraL.matrixWorldInverse.copy(this.cameraL.matrixWorld).invert();
    }
  };
}
