import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import {
  firstPersonFrame,
  MAX_PITCH,
  MIN_PITCH,
  surfaceForward,
  transportForward,
  turnView,
} from "./camera";
import { REGIONS, terrain } from "./world";

describe("Sunny's first-person camera", () => {
  it.each(Object.keys(REGIONS) as (keyof typeof REGIONS)[])(
    "stays above the %s surface with a level local horizon",
    (region) => {
      const normal = REGIONS[region].spawn;
      const surface = terrain(normal);
      const frame = firstPersonFrame(
        normal,
        new Vector3(0, 1, 0),
        -0.3,
        surface.height,
        region === "ocean",
      );
      expect(frame.position.length()).toBeCloseTo(
        surface.height + frame.clearance,
      );
      expect(frame.clearance).toBeGreaterThan(0.5);
      expect(frame.up.dot(normal)).toBeCloseTo(1);
      expect(frame.direction.length()).toBeCloseTo(1);
      expect(frame.direction.dot(normal)).toBeCloseTo(Math.sin(-0.3));
    },
  );

  it("keeps a valid forward direction at both poles and for a zero direction", () => {
    for (const normal of [
      new Vector3(0, 1, 0),
      new Vector3(0, -1, 0),
      new Vector3(1, 0, 0),
    ]) {
      for (const candidate of [normal, new Vector3()]) {
        const forward = surfaceForward(normal, candidate);
        expect(forward.length()).toBeCloseTo(1);
        expect(forward.dot(normal)).toBeCloseTo(0);
      }
    }
  });

  it("clamps vertical looking instead of letting the camera flip", () => {
    for (const [pitch, expected] of [
      [-100, MIN_PITCH],
      [100, MAX_PITCH],
    ]) {
      const frame = firstPersonFrame(
        new Vector3(0, 1, 0),
        new Vector3(0, 0, 1),
        pitch,
        6,
        false,
      );
      expect(frame.direction.y).toBeCloseTo(Math.sin(expected));
      expect(frame.direction.z).toBeGreaterThan(0);
    }
  });

  it("transports the camera heading continuously around an entire planet", () => {
    let normal = new Vector3(0, 1, 0);
    let forward = new Vector3(0, 0, 1);
    for (let i = 1; i <= 360; i++) {
      const next = new Vector3(
        0,
        Math.cos((i * Math.PI) / 180),
        Math.sin((i * Math.PI) / 180),
      );
      forward = transportForward(forward, normal, next);
      expect(forward.dot(next)).toBeCloseTo(0);
      expect(forward.length()).toBeCloseTo(1);
      normal = next;
    }
    expect(forward.distanceTo(new Vector3(0, 0, 1))).toBeLessThan(0.0001);
  });

  it("turns around Sunny's local up axis without adding pitch", () => {
    const normal = REGIONS.desert.spawn;
    const forward = surfaceForward(normal, new Vector3(0, 1, 0));
    const turned = turnView(forward, normal, Math.PI / 2);
    expect(turned.dot(normal)).toBeCloseTo(0);
    expect(turned.dot(forward)).toBeCloseTo(0);
    expect(turned.length()).toBeCloseTo(1);
  });

  it("keeps swimming and jumping cameras safely above the water without idle bobbing", () => {
    const normal = REGIONS.ocean.spawn;
    const base = firstPersonFrame(normal, new Vector3(0, 1, 0), 0, 6, true);
    const jumping = firstPersonFrame(
      normal,
      new Vector3(0, 1, 0),
      0,
      6,
      true,
      0.5,
    );
    expect(jumping.clearance - base.clearance).toBeCloseTo(0.25);
    expect(
      firstPersonFrame(normal, new Vector3(0, 1, 0), 0, 6, true).position,
    ).toEqual(base.position);
  });
});
