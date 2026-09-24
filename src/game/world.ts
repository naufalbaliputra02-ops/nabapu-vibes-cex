import { Vector3 } from "three";

export type Region = "forest" | "desert" | "ocean";
export type DecorationType = "flower" | "tree" | "shell";
export type Decoration = {
  kind: DecorationType;
  position: [number, number, number];
};
export const RADIUS = 6;
export const SAVE_KEY = "mini-world-v1";
export const MAX_DECORATIONS = 40;

export const REGIONS = {
  forest: {
    name: "Wonder Woods",
    description: "A little wander, a lot of wonder.",
    tag: "Wander & discover",
    color: "#55794e",
    spawn: new Vector3(-0.24, 0.56, 0.79).normalize(),
  },
  desert: {
    name: "Sunny Dunes",
    description: "Warm sands and wonderful surprises.",
    tag: "Roam & play",
    color: "#bf8541",
    spawn: new Vector3(0.67, 0.48, 0.61).normalize(),
  },
  ocean: {
    name: "Sparkle Sea",
    description: "Make a splash. Meet a new friend.",
    tag: "Splash & swim",
    color: "#498d9e",
    spawn: new Vector3(0.18, -0.13, 0.97).normalize(),
  },
};

const continents = [
  {
    center: new Vector3(-0.35, 0.59, 0.73).normalize(),
    size: 0.68,
    kind: "forest" as Region,
  },
  {
    center: new Vector3(0.71, 0.4, 0.53).normalize(),
    size: 0.48,
    kind: "desert" as Region,
  },
  {
    center: new Vector3(-0.7, -0.4, -0.55).normalize(),
    size: 0.54,
    kind: "forest" as Region,
  },
  {
    center: new Vector3(0.45, 0.3, -0.84).normalize(),
    size: 0.6,
    kind: "desert" as Region,
  },
];

export function terrain(normal: Vector3) {
  const noise =
    Math.sin(normal.x * 15 + normal.z * 7) * 0.026 +
    Math.cos(normal.y * 21 - normal.z * 11) * 0.022;
  let closest = -10;
  let region: Region = "ocean";
  for (const land of continents) {
    const inside = land.size - normal.angleTo(land.center) + noise;
    if (inside > closest) {
      closest = inside;
      region = land.kind;
    }
  }
  if (closest < 0)
    return {
      region: "ocean" as Region,
      height: RADIUS,
      shore: false,
      inland: closest,
    };
  const elevation =
    Math.min(closest * 1.5, 0.22) +
    Math.max(0, Math.sin(normal.x * 13) * Math.cos(normal.z * 15)) *
      Math.min(closest, 0.07);
  return {
    region,
    height: RADIUS + elevation,
    shore: closest < 0.065,
    inland: closest,
  };
}

export const DISCOVERIES = [
  {
    id: "forest-star",
    name: "Woodland star",
    icon: "star",
    region: "forest" as Region,
    position: new Vector3(-0.08, 0.39, 0.92).normalize(),
    fact: "A little sparkle hiding in the woods!",
  },
  {
    id: "forest-mushroom",
    name: "Happy mushroom",
    icon: "mushroom",
    region: "forest" as Region,
    position: new Vector3(-0.46, 0.43, 0.78).normalize(),
    fact: "Mushrooms help the forest grow.",
  },
  {
    id: "forest-butterfly",
    name: "Flutter friend",
    icon: "butterfly",
    region: "forest" as Region,
    position: new Vector3(-0.4, 0.77, 0.49).normalize(),
    fact: "Butterflies taste with their feet!",
  },
  {
    id: "desert-star",
    name: "Sunshine star",
    icon: "star",
    region: "desert" as Region,
    position: new Vector3(0.77, 0.44, 0.48).normalize(),
    fact: "You found a little piece of sunshine.",
  },
  {
    id: "desert-cactus",
    name: "Cactus buddy",
    icon: "cactus",
    region: "desert" as Region,
    position: new Vector3(0.6, 0.27, 0.75).normalize(),
    fact: "Cacti keep water inside their stems.",
  },
  {
    id: "desert-crystal",
    name: "Peachy crystal",
    icon: "crystal",
    region: "desert" as Region,
    position: new Vector3(0.85, 0.5, 0.14).normalize(),
    fact: "Nature makes its own tiny treasures.",
  },
  {
    id: "ocean-shell",
    name: "Rainbow shell",
    icon: "shell",
    region: "ocean" as Region,
    position: new Vector3(0.28, -0.05, 0.96).normalize(),
    fact: "Every seashell has its own special shape.",
  },
  {
    id: "ocean-fish",
    name: "Bubble buddy",
    icon: "fish",
    region: "ocean" as Region,
    position: new Vector3(-0.07, -0.23, 0.97).normalize(),
    fact: "Some fish like to swim in big groups of friends.",
  },
  {
    id: "ocean-star",
    name: "Sea sparkle",
    icon: "star",
    region: "ocean" as Region,
    position: new Vector3(0.48, -0.32, 0.81).normalize(),
    fact: "You brought a little magic to the sea!",
  },
];

export type Progress = {
  found: string[];
  decorations: Decoration[];
  sound: boolean;
};
export const freshProgress = (): Progress => ({
  found: [],
  decorations: [],
  sound: false,
});

export function parseProgress(raw: string | null): Progress {
  try {
    const data = JSON.parse(raw || "{}");
    if (!data || typeof data !== "object") return freshProgress();
    const ids = new Set(DISCOVERIES.map((d) => d.id));
    const found = Array.isArray(data.found)
      ? [
          ...new Set<string>(
            data.found.filter(
              (id: unknown) => typeof id === "string" && ids.has(id),
            ),
          ),
        ]
      : [];
    const decorations = Array.isArray(data.decorations)
      ? data.decorations
          .filter(
            (d: Decoration) =>
              d &&
              ["flower", "tree", "shell"].includes(d.kind) &&
              Array.isArray(d.position) &&
              d.position.length === 3 &&
              d.position.every(
                (n) => typeof n === "number" && Number.isFinite(n),
              ) &&
              new Vector3(...d.position).length() > 0.1,
          )
          .slice(0, MAX_DECORATIONS)
      : [];
    return { found, decorations, sound: data.sound === true };
  } catch {
    return freshProgress();
  }
}

export function loadProgress(): Progress {
  try {
    return parseProgress(localStorage.getItem(SAVE_KEY));
  } catch {
    return freshProgress();
  }
}

export function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
