import { MathUtils, Quaternion, Vector3 } from "three";

export type CameraMode = "planet" | "follow" | "first-person";
export const MIN_PITCH = -Math.PI / 3;
export const MAX_PITCH = Math.PI / 3;

export function surfaceForward(normal: Vector3, candidate: Vector3) {
  const forward = candidate.clone().projectOnPlane(normal);
  if (forward.lengthSq() < 0.0001) {
    const reference =
      Math.abs(normal.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
    forward.copy(reference).projectOnPlane(normal);
  }
  return forward.normalize();
}

export function transportForward(forward: Vector3, from: Vector3, to: Vector3) {
  const turn = new Quaternion().setFromUnitVectors(from, to);
  return surfaceForward(to, forward.clone().applyQuaternion(turn));
}

export function turnView(forward: Vector3, normal: Vector3, yaw: number) {
  return surfaceForward(normal, forward.clone().applyAxisAngle(normal, yaw));
}

export function firstPersonFrame(
  normal: Vector3,
  forward: Vector3,
  pitch: number,
  surfaceHeight: number,
  swimming: boolean,
  jump = 0,
) {
  const tangent = surfaceForward(normal, forward);
  const clampedPitch = MathUtils.clamp(pitch, MIN_PITCH, MAX_PITCH);
  const direction = tangent
    .multiplyScalar(Math.cos(clampedPitch))
    .addScaledVector(normal, Math.sin(clampedPitch))
    .normalize();
  const clearance = (swimming ? 0.52 : 0.88) + Math.max(0, jump) * 0.5;
  const position = normal.clone().multiplyScalar(surfaceHeight + clearance);
  return { position, direction, up: normal.clone(), clearance };
}
