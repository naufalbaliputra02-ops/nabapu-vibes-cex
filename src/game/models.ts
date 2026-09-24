import * as THREE from "three";
import type { DecorationType } from "./world";

const materials = new Map<string, THREE.MeshLambertMaterial>();
export function material(color: string) {
  const key = color;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshLambertMaterial({ color, flatShading: false }),
    );
  return materials.get(key)!;
}

function mesh(
  geometry: THREE.BufferGeometry,
  color: string,
  x = 0,
  y = 0,
  z = 0,
) {
  const object = new THREE.Mesh(geometry, material(color));
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function ball(
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy = sx,
  sz = sx,
) {
  const object = mesh(new THREE.SphereGeometry(1, 12, 10), color, x, y, z);
  object.scale.set(sx, sy, sz);
  return object;
}

function diamond(
  size: number,
  color: string,
  x: number,
  y: number,
  z: number,
  height = 1.35,
) {
  const shape = new THREE.Shape();
  shape.moveTo(0, size * height);
  shape.lineTo(size, 0);
  shape.lineTo(0, -size * height);
  shape.lineTo(-size, 0);
  shape.closePath();
  return mesh(new THREE.ShapeGeometry(shape), color, x, y, z);
}

export function makeSunny() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const gold = "#ffb600",
    bright = "#ffd348",
    white = "#fffcef",
    ink = "#28382c";
  const torso = mesh(
    new THREE.CylinderGeometry(0.24, 0.32, 0.48, 16),
    gold,
    0,
    0.49,
  );
  body.add(
    torso,
    mesh(new THREE.CylinderGeometry(0.316, 0.33, 0.07, 16), white, 0, 0.26),
  );
  body.add(ball(gold, 0, 1.01, 0, 0.48, 0.49, 0.4));
  body.add(ball(ink, 0, 0.96, 0.294, 0.366, 0.316, 0.12));
  body.add(ball(bright, 0, 0.968, 0.316, 0.346, 0.293, 0.12));
  for (const side of [-1, 1]) {
    body.add(diamond(0.098, ink, side * 0.168, 1.003, 0.427));
    body.add(diamond(0.081, white, side * 0.168, 1.003, 0.429));
    body.add(diamond(0.061, "#17251b", side * 0.168, 1.003, 0.431));
    body.add(diamond(0.022, white, side * 0.168, 1.003, 0.433, 1.6));
    body.add(ball("#ff8f75", side * 0.25, 0.89, 0.411, 0.039, 0.021, 0.011));
  }
  body.add(ball(ink, 0, 0.887, 0.433, 0.073, 0.068, 0.015));
  body.add(ball("#ff8f84", 0, 0.859, 0.449, 0.044, 0.025, 0.006));
  const badge = mesh(
    new THREE.TorusGeometry(0.09, 0.031, 8, 24),
    white,
    0,
    0.49,
    0.273,
  );
  body.add(badge, diamond(0.038, white, 0, 0.49, 0.282, 1));
  const slash = mesh(
    new THREE.CapsuleGeometry(0.018, 0.27, 4, 8),
    white,
    0,
    0.49,
    0.277,
  );
  slash.rotation.z = 0.85;
  body.add(slash);
  const arms: THREE.Group[] = [];
  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.26, 0.67, 0);
    arm.rotation.z = side * 0.43;
    arm.add(mesh(new THREE.CapsuleGeometry(0.103, 0.2, 5, 10), gold, 0, -0.16));
    arm.add(
      mesh(
        new THREE.CylinderGeometry(0.106, 0.106, 0.053, 10),
        white,
        0,
        -0.25,
      ),
    );
    arm.add(ball(gold, 0, -0.33, 0.005, 0.108, 0.105, 0.085));
    arm.add(ball(gold, -side * 0.079, -0.29, 0.04, 0.045));
    body.add(arm);
    arms.push(arm);
    const leg = new THREE.Group();
    leg.position.set(side * 0.15, 0.25, 0);
    leg.add(mesh(new THREE.CapsuleGeometry(0.108, 0.12, 5, 10), gold, 0, -0.1));
    leg.add(
      mesh(
        new THREE.CylinderGeometry(0.111, 0.111, 0.047, 10),
        white,
        0,
        -0.13,
      ),
    );
    leg.add(ball(gold, 0, -0.215, 0.037, 0.125, 0.08, 0.17));
    body.add(leg);
    legs.push(leg);
  }
  return { root, body, arms, legs };
}

export function makeTree(variant = 0) {
  const group = new THREE.Group();
  group.add(
    mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.48, 7), "#886c47", 0, 0.24),
  );
  if (variant % 3 === 0) {
    group.add(mesh(new THREE.ConeGeometry(0.36, 0.6, 7), "#527b56", 0, 0.61));
    group.add(mesh(new THREE.ConeGeometry(0.28, 0.54, 7), "#688c61", 0, 0.84));
    group.add(mesh(new THREE.ConeGeometry(0.19, 0.42, 7), "#8fa571", 0, 1.03));
  } else {
    const green = variant % 2 ? "#7e9c5d" : "#4c835e";
    group.add(ball(green, 0, 0.72, 0, 0.38, 0.43, 0.34));
    group.add(
      ball(
        variant % 2 ? "#a4b971" : "#78a36e",
        -0.17,
        0.83,
        0.05,
        0.24,
        0.29,
        0.25,
      ),
    );
    group.add(ball(green, 0.19, 0.68, 0.02, 0.26));
  }
  return group;
}

export function makeCactus() {
  const group = new THREE.Group();
  group.add(
    mesh(new THREE.CapsuleGeometry(0.09, 0.49, 5, 8), "#65936a", 0, 0.35),
  );
  for (const side of [-1, 1]) {
    const branch = mesh(
      new THREE.CapsuleGeometry(0.06, 0.13, 4, 8),
      "#80a47b",
      side * 0.11,
      0.3 + side * 0.06,
    );
    branch.rotation.z = Math.PI / 2;
    group.add(branch);
    group.add(
      mesh(
        new THREE.CapsuleGeometry(0.06, 0.18, 4, 8),
        "#80a47b",
        side * 0.19,
        0.39 + side * 0.06,
      ),
    );
  }
  group.add(ball("#edb27b", 0.014, 0.7, 0, 0.075, 0.05, 0.07));
  return group;
}

export function makePalm() {
  const group = new THREE.Group();
  const trunk = mesh(
    new THREE.CylinderGeometry(0.035, 0.067, 0.67, 7),
    "#aa8155",
    0,
    0.34,
  );
  trunk.rotation.z = -0.13;
  group.add(trunk);
  for (let i = 0; i < 6; i++) {
    const leaf = ball(
      i % 2 ? "#8daf71" : "#5f966c",
      Math.cos((i * Math.PI) / 3) * 0.17 + 0.04,
      0.72,
      Math.sin((i * Math.PI) / 3) * 0.17,
      0.1,
      0.055,
      0.38,
    );
    leaf.rotation.y = Math.PI / 2 - (i * Math.PI) / 3;
    leaf.rotation.z = 0.2;
    group.add(leaf);
  }
  group.add(ball("#a07747", 0.07, 0.64, 0.07, 0.07));
  return group;
}

export function makeRock(desert = false) {
  const group = new THREE.Group();
  if (desert) {
    group.add(
      mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.36, 6), "#c58c64", 0, 0.18),
    );
    group.add(
      mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.3, 6), "#dfac79", 0, 0.48),
    );
    group.add(
      mesh(
        new THREE.CylinderGeometry(0.17, 0.19, 0.07, 6),
        "#edc491",
        0,
        0.665,
      ),
    );
  } else {
    const rock = mesh(
      new THREE.DodecahedronGeometry(0.25, 0),
      "#aeb7a1",
      0,
      0.14,
    );
    rock.scale.set(1.3, 0.85, 1);
    group.add(rock);
  }
  return group;
}

export function makeFlower() {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.1,
      z = (i % 2) * 0.13;
    group.add(
      mesh(
        new THREE.CylinderGeometry(0.012, 0.014, 0.16, 5),
        "#629458",
        x,
        0.08,
        z,
      ),
    );
    for (let p = 0; p < 5; p++)
      group.add(
        ball(
          i % 2 ? "#fff3d8" : "#e9afa5",
          x + Math.sin(p * 1.256) * 0.042,
          0.17,
          z + Math.cos(p * 1.256) * 0.042,
          0.033,
          0.019,
          0.035,
        ),
      );
    group.add(ball("#e6b950", x, 0.18, z, 0.024));
  }
  return group;
}

export function makeShell() {
  const group = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const angle = (i / 6 - 0.5) * Math.PI * 0.75;
    const lobe = ball(
      i % 2 ? "#e7ae98" : "#f9cab1",
      Math.sin(angle) * 0.065,
      0.07,
      Math.cos(angle) * 0.08,
      0.048,
      0.046,
      0.14,
    );
    lobe.rotation.y = angle;
    group.add(lobe);
  }
  return group;
}

export function makeDecoration(kind: DecorationType) {
  return kind === "tree"
    ? makeTree(1)
    : kind === "shell"
      ? makeShell()
      : makeFlower();
}

export function makeStar() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? 0.11 : 0.23,
      angle = (i * Math.PI) / 5 + Math.PI / 2;
    if (i === 0)
      shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.closePath();
  const star = mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.026,
      bevelThickness: 0.025,
    }),
    "#ffcf60",
  );
  return star;
}

export function makeMushroom() {
  const group = new THREE.Group();
  group.add(
    mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.22, 8), "#fff0ce", 0, 0.11),
  );
  const cap = mesh(
    new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    "#d98770",
    0,
    0.2,
  );
  group.add(
    cap,
    ball("#fff5df", 0, 0.35, 0.03, 0.037, 0.012, 0.036),
    ball("#fff5df", 0.1, 0.31, 0.03, 0.027),
  );
  return group;
}

export function makeHouse() {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(0.6, 0.55, 0.53), "#fff1cc", 0, 0.3));
  const roof = mesh(new THREE.ConeGeometry(0.55, 0.4, 4), "#b77960", 0, 0.75);
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
  group.add(
    mesh(new THREE.BoxGeometry(0.18, 0.32, 0.025), "#70876b", 0, 0.18, 0.275),
  );
  group.add(ball("#efcb71", 0.053, 0.17, 0.297, 0.016));
  group.add(
    mesh(
      new THREE.BoxGeometry(0.135, 0.15, 0.025),
      "#a2c8c2",
      -0.21,
      0.36,
      0.275,
    ),
  );
  group.add(
    mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), "#d2b797", 0.2, 0.8, -0.1),
  );
  return group;
}

export function disposeMaterials() {
  materials.forEach((m) => m.dispose());
  materials.clear();
}
