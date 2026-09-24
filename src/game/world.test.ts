import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DISCOVERIES,
  freshProgress,
  loadProgress,
  MAX_DECORATIONS,
  parseProgress,
  random,
  REGIONS,
  terrain,
  type Decoration,
} from "./world";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("world region placement", () => {
  it("places every region spawn in its matching biome", () => {
    for (const [region, details] of Object.entries(REGIONS)) {
      expect(terrain(details.spawn).region, `${region} spawn biome`).toBe(
        region,
      );
    }
  });

  it("assigns every discovery to the biome at its position", () => {
    for (const discovery of DISCOVERIES) {
      expect(terrain(discovery.position).region, `${discovery.id} biome`).toBe(
        discovery.region,
      );
    }
  });
});

describe("progress parsing", () => {
  it.each([null, "", "{not json", "null", "42", '"hello"', "[]"])(
    "returns fresh progress for corrupt or non-object data: %s",
    (raw) => {
      expect(parseProgress(raw)).toEqual(freshProgress());
    },
  );

  it("keeps known unique discoveries and valid decorations while discarding invalid fields", () => {
    const result = parseProgress(
      JSON.stringify({
        found: ["forest-star", "unknown-discovery", "forest-star", 7, null],
        decorations: [
          { kind: "flower", position: [1, 0, 0] },
          null,
          { kind: "rock", position: [1, 0, 0] },
          { kind: "tree", position: [0, 0, 0] },
          { kind: "shell", position: [1, 2] },
          { kind: "shell", position: [1, "2", 3] },
        ],
        sound: "true",
      }),
    );

    expect(result).toEqual({
      found: ["forest-star"],
      decorations: [{ kind: "flower", position: [1, 0, 0] }],
      sound: false,
    });
  });

  it("caps saved decorations at the maximum and preserves their order", () => {
    const decorations: Decoration[] = Array.from(
      { length: MAX_DECORATIONS + 5 },
      (_, index) => ({
        kind: "flower",
        position: [index + 1, 0, 0],
      }),
    );

    const result = parseProgress(JSON.stringify({ decorations }));

    expect(result.decorations).toHaveLength(MAX_DECORATIONS);
    expect(result.decorations).toEqual(decorations.slice(0, MAX_DECORATIONS));
  });

  it("returns fresh progress when browser storage is unavailable or unreadable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("storage unavailable");
      },
    });
    expect(loadProgress()).toEqual(freshProgress());

    vi.stubGlobal("localStorage", {
      getItem: () => "{not json",
    });
    expect(loadProgress()).toEqual(freshProgress());
  });
});

describe("seeded random", () => {
  it("produces the same in-range sequence for the same seed", () => {
    const first = random(2026);
    const second = random(2026);
    const firstSequence = Array.from({ length: 20 }, first);
    const secondSequence = Array.from({ length: 20 }, second);

    expect(firstSequence).toEqual(secondSequence);
    expect(firstSequence.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});
