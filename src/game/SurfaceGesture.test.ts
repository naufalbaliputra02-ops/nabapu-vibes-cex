import { describe, expect, it } from "vitest";
import { SurfaceGesture } from "./SurfaceGesture";

describe("surface pointer gestures", () => {
  it("distinguishes a small tap from a drag", () => {
    const gesture = new SurfaceGesture();
    gesture.down(1, 10, 10);
    expect(gesture.move(1, 12, 13)).toBeNull();
    expect(gesture.end(1)).toBe(true);
    gesture.down(1, 10, 10);
    expect(gesture.move(1, 30, 15)?.toArray()).toEqual([20, 5]);
    expect(gesture.end(1)).toBe(false);
  });

  it.each([1, 2])(
    "continues looking without a jump when finger %i lifts first",
    (lifted) => {
      const gesture = new SurfaceGesture();
      gesture.down(1, 100, 100);
      gesture.down(2, 200, 200);
      expect(gesture.move(1, 500, 500)).toBeNull();
      expect(gesture.move(2, 700, 700)).toBeNull();
      expect(gesture.end(lifted)).toBe(false);
      const remaining = lifted === 1 ? 2 : 1;
      const last = remaining === 1 ? 500 : 700;
      expect(gesture.move(remaining, last + 5, last + 3)?.toArray()).toEqual([
        5, 3,
      ]);
      expect(gesture.end(remaining)).toBe(false);
      gesture.down(3, 30, 30);
      expect(gesture.end(3)).toBe(true);
    },
  );

  it("hands off after a canceled finger and never treats cancellation as a tap", () => {
    const gesture = new SurfaceGesture();
    gesture.down(1, 0, 0);
    gesture.down(2, 10, 10);
    expect(gesture.end(1, true)).toBe(false);
    expect(gesture.move(2, 15, 15)?.toArray()).toEqual([5, 5]);
    expect(gesture.end(2, true)).toBe(false);
    expect(gesture.move(2, 100, 100)).toBeNull();
  });

  it("clears held gestures on pause, camera changes, and lost focus", () => {
    const gesture = new SurfaceGesture();
    gesture.down(1, 5, 5);
    gesture.reset();
    expect(gesture.move(1, 20, 20)).toBeNull();
    expect(gesture.end(1)).toBe(false);
    gesture.down(2, 20, 20);
    expect(gesture.end(2)).toBe(true);
  });
});
