import { StereoCamera } from 'three';
import type { Camera } from 'three';

/**
 * Vertical eye-offset support for Vergence Base Up / Base Down.
 *
 * three-stdlib's AnaglyphEffect owns a private StereoCamera instance and calls
 * `_stereo.update(camera)` on every render, which recomputes both eye matrices
 * from scratch. We can't reach that instance, but it uses the same shared
 * `StereoCamera` class we import here — so we wrap `StereoCamera.prototype.update`
 * and, right after the stock update, nudge the LEFT eye's world matrix
 * vertically. Positive offset shifts the left-eye image UP on screen
 * (Base Up); negative shifts it DOWN (Base Down).
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
