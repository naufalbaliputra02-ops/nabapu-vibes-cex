import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { SurfaceGesture } from "./SurfaceGesture";
import {
  firstPersonFrame,
  MAX_PITCH,
  MIN_PITCH,
  surfaceForward,
  transportForward,
  turnView,
  type CameraMode,
} from "./camera";
import {
  DISCOVERIES,
  MAX_DECORATIONS,
  RADIUS,
  REGIONS,
  random,
  terrain,
  type Decoration,
  type DecorationType,
  type Progress,
  type Region,
} from "./world";
import {
  disposeMaterials,
  makeCactus,
  makeDecoration,
  makeFlower,
  makeHouse,
  makeMushroom,
  makePalm,
  makeRock,
  makeShell,
  makeStar,
  makeSunny,
  makeTree,
  material,
} from "./models";

export type GameState = {
  cameraMode: CameraMode;
  lookDirection?: number[];
  cameraClearance?: number;
  region: Region;
  moving: boolean;
  swimming: boolean;
  jumping?: boolean;
  zoom: number;
  position: number[];
  playerScreen?: { x: number; y: number; visible: boolean };
};
type Callbacks = {
  state: (state: GameState) => void;
  found: (id: string) => void;
  decorate: (decoration: Decoration) => void;
  ready: () => void;
  error: (message: string) => void;
};

const UP = new THREE.Vector3(0, 1, 0);
const MIN_ZOOM = 9.3;
const MAX_ZOOM = 28;

export class Engine {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  private cameraMode: CameraMode = "planet";
  private firstPersonForward = surfaceForward(REGIONS.forest.spawn, UP);
  private firstPersonPitch = -0.25;
  private lookInput = 0;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private planet: THREE.Mesh;
  private sunny = makeSunny();
  private normal = REGIONS.forest.spawn.clone();
  private destination: THREE.Vector3 | null = null;
  private keys = new Set<string>();
  private input = new THREE.Vector2();
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private previousTime = 0;
  private elapsed = 0;
  private lastState = 0;
  private lastShadowUpdate = 0;
  private lastRegion: Region = "forest";
  private paused = false;
  private disposed = false;
  private jumps = 0;
  private jumpVelocity = 0;
  private facing = 0;
  private cameraTarget: THREE.Vector3 | null = null;
  private zoomTarget: number | null = null;
  private foundIds: Set<string>;
  private collectibles: {
    id: string;
    group: THREE.Group;
    object: THREE.Object3D;
    normal: THREE.Vector3;
  }[] = [];
  private clouds: THREE.Group[] = [];
  private ripples = new THREE.Group();
  private marker = new THREE.Group();
  private decorationMode: DecorationType | null = null;
  private placed: THREE.Group[] = [];
  private gesture = new SurfaceGesture();
  private removeEvents: (() => void)[] = [];

  constructor(
    private container: HTMLElement,
    progress: Progress,
    private callbacks: Callbacks,
  ) {
    this.foundIds = new Set(progress.found);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const gl = this.renderer.getContext();
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const softwareRendering =
      debugInfo &&
      /swiftshader|llvmpipe|software/i.test(
        gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
      );
    if (softwareRendering) {
      this.renderer.setPixelRatio(0.8);
      this.renderer.shadowMap.type = THREE.BasicShadowMap;
    }
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Mini World 3D playground. Tap the planet to walk. Drag to look around.",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.container.appendChild(this.renderer.domElement);
    this.camera.position.copy(this.cameraDirection()).multiplyScalar(23.5);
    this.camera.up.set(0, 1, 0);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.minDistance = MIN_ZOOM;
    this.controls.maxDistance = MAX_ZOOM;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.7;
    this.controls.addEventListener("start", () => {
      this.cameraTarget = null;
      this.zoomTarget = null;
    });

    this.scene.add(new THREE.HemisphereLight("#fff8e2", "#8aa7a0", 2.2));
    const sun = new THREE.DirectionalLight("#fff5db", 2.7);
    sun.position.set(-8, 13, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 9;
    sun.shadow.camera.bottom = -9;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 45;
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight("#b8e6ed", 1.1);
    fill.position.set(10, 3, -5);
    this.scene.add(fill);

    this.planet = this.makePlanet();
    this.scene.add(this.planet);
    this.buildLandscape();
    this.mergeLandscape();
    this.buildDiscoveries();
    this.sunny.root.scale.setScalar(0.87);
    this.scene.add(this.sunny.root);
    this.buildEffects();
    progress.decorations.forEach((d) => this.addDecoration(d));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.bindEvents();
    this.positionSunny(false, false, 0);
    this.frame = requestAnimationFrame(this.tick);
    callbacks.ready();
  }

  private makePlanet() {
    const geometry = new THREE.IcosahedronGeometry(RADIUS, 48);
    const positions = geometry.attributes.position;
    const colors = [];
    const vector = new THREE.Vector3();
    const ocean = new THREE.Color("#86caca"),
      green = new THREE.Color("#a8ba76"),
      sand = new THREE.Color("#e9c48a"),
      beach = new THREE.Color("#f1ddb0");
    for (let i = 0; i < positions.count; i++) {
      vector.fromBufferAttribute(positions, i).normalize();
      const info = terrain(vector);
      const color =
        info.region === "ocean"
          ? ocean.clone()
          : info.shore
            ? beach.clone()
            : info.region === "forest"
              ? green.clone()
              : sand.clone();
      const variation =
        Math.sin(vector.x * 55 + vector.y * 19) *
        Math.cos(vector.z * 44) *
        0.018;
      color.offsetHSL(0, 0, variation);
      colors.push(color.r, color.g, color.b);
      vector.multiplyScalar(info.height);
      positions.setXYZ(i, vector.x, vector.y, vector.z);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const planet = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        flatShading: true,
      }),
    );
    planet.receiveShadow = true;
    planet.castShadow = true;
    return planet;
  }

  private place(object: THREE.Object3D, normal: THREE.Vector3, offset = 0) {
    object.position
      .copy(normal)
      .multiplyScalar(terrain(normal).height + offset);
    object.quaternion.setFromUnitVectors(UP, normal);
    this.scene.add(object);
    return object;
  }

  private buildLandscape() {
    const rand = random(2439);
    let count = 0;
    for (let i = 0; i < 1600 && count < 230; i++) {
      const normal = new THREE.Vector3(
        rand() * 2 - 1,
        rand() * 2 - 1,
        rand() * 2 - 1,
      ).normalize();
      const info = terrain(normal);
      if (info.region === "ocean" || info.shore) continue;
      if (
        Object.values(REGIONS).some((r) => normal.angleTo(r.spawn) < 0.22) ||
        DISCOVERIES.some((d) => normal.angleTo(d.position) < 0.1)
      )
        continue;
      let object: THREE.Group;
      if (info.region === "forest")
        object =
          rand() < 0.77
            ? makeTree(i)
            : rand() < 0.55
              ? makeFlower()
              : makeMushroom();
      else object = rand() < 0.48 ? makeCactus() : makeRock(true);
      const scale = 0.7 + rand() * 0.75;
      object.scale.setScalar(scale);
      this.place(object, normal);
      object.rotateY(rand() * Math.PI * 2);
      count++;
    }
    this.place(makeHouse(), new THREE.Vector3(-0.42, 0.54, 0.73).normalize());
    for (const n of [
      new THREE.Vector3(-0.29, 0.89, 0.35),
      new THREE.Vector3(-0.49, 0.82, 0.27),
      new THREE.Vector3(-0.62, 0.7, 0.26),
    ]) {
      const mountain = new THREE.Group();
      mountain.add(
        new THREE.Mesh(
          new THREE.ConeGeometry(0.55, 1.1, 5),
          material("#8d9e8b"),
        ),
      );
      mountain.children[0].position.y = 0.45;
      const snow = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.35, 5),
        material("#f5f3df"),
      );
      snow.position.y = 0.82;
      mountain.add(snow);
      mountain.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this.place(mountain, n.normalize());
    }
    for (let i = 0; i < 16; i++) {
      const n = REGIONS.forest.spawn
        .clone()
        .lerp(new THREE.Vector3(-0.4, 0.72, 0.56).normalize(), i / 16)
        .normalize();
      n.x += Math.sin(i * 0.5) * 0.025;
      n.normalize();
      const pebble = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 7, 5),
        material("#e8dfbc"),
      );
      pebble.scale.set(1, 0.22, 1.3);
      pebble.receiveShadow = true;
      this.place(pebble, n, 0.02);
    }
    for (const p of [
      [0.5, 0.18, 0.85],
      [-0.64, 0.21, 0.74],
      [0.62, 0.67, 0.4],
    ])
      this.place(makePalm(), new THREE.Vector3(...p).normalize());
    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(0.22 + rand() * 0.1, 12, 8),
          material("#ffffff"),
        );
        puff.position.set(j * 0.21 - 0.32, (j % 2) * 0.05, 0);
        puff.scale.set(1, 0.62, 0.72);
        cloud.add(puff);
      }
      const n = new THREE.Vector3(
        rand() * 2 - 1,
        rand() * 1.5 - 0.15,
        rand() * 2 - 1,
      ).normalize();
      this.place(cloud, n, 1.0 + rand() * 0.65);
      this.clouds.push(cloud);
    }
    // Small white ripples give the quiet ocean a little life.
    for (let i = 0; i < 90; i++) {
      const n = new THREE.Vector3(
        rand() * 2 - 1,
        rand() * 2 - 1,
        rand() * 2 - 1,
      ).normalize();
      if (terrain(n).region !== "ocean") continue;
      const wave = new THREE.Mesh(
        new THREE.TorusGeometry(
          0.12 + rand() * 0.1,
          0.009,
          4,
          10,
          Math.PI * 0.75,
        ),
        material("#cee7dc"),
      );
      const group = new THREE.Group();
      wave.rotation.x = -Math.PI / 2;
      group.add(wave);
      this.place(group, n, 0.015);
      group.rotateY(rand() * Math.PI * 2);
    }
  }

  private buildDiscoveries() {
    for (const item of DISCOVERIES) {
      const group = new THREE.Group();
      let object: THREE.Object3D;
      if (item.icon === "mushroom") object = makeMushroom();
      else if (item.icon === "shell") object = makeShell();
      else if (item.icon === "cactus") object = makeCactus();
      else if (item.icon === "crystal")
        object = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.2),
          material("#d9a5c6"),
        );
      else if (item.icon === "butterfly") {
        object = new THREE.Group();
        for (const s of [-1, 1]) {
          const wing = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 10, 8),
            material("#e8b980"),
          );
          wing.scale.set(1, 0.9, 0.18);
          wing.position.x = s * 0.1;
          object.add(wing);
        }
      } else if (item.icon === "fish") {
        object = new THREE.Group();
        const fish = new THREE.Mesh(
          new THREE.SphereGeometry(0.17, 12, 8),
          material("#edb569"),
        );
        fish.scale.set(1.35, 0.7, 0.6);
        object.add(fish);
        const tail = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.15, 3),
          material("#edb569"),
        );
        tail.rotation.z = -Math.PI / 2;
        tail.position.x = -0.24;
        object.add(tail);
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.022, 8, 6),
          material("#344c47"),
        );
        eye.position.set(0.12, 0.05, 0.085);
        object.add(eye);
      } else object = makeStar();
      object.position.y = 0.5;
      group.add(object);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.27, 0.014, 5, 28),
        new THREE.MeshBasicMaterial({
          color: "#fff3b6",
          transparent: true,
          opacity: 0.8,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.055;
      group.add(ring);
      group.visible = !this.foundIds.has(item.id);
      this.place(group, item.position);
      this.collectibles.push({
        id: item.id,
        group,
        object,
        normal: item.position,
      });
    }
  }

  private mergeLandscape() {
    const batches = new Map<
      THREE.Material,
      { geometries: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }
    >();
    this.scene.updateMatrixWorld(true);
    this.scene.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) ||
        object === this.planet ||
        Array.isArray(object.material)
      )
        return;
      if (this.clouds.some((cloud) => cloud.children.includes(object))) return;
      if (!batches.has(object.material))
        batches.set(object.material, { geometries: [], meshes: [] });
      const batch = batches.get(object.material)!;
      batch.geometries.push(
        object.geometry.clone().applyMatrix4(object.matrixWorld),
      );
      batch.meshes.push(object);
    });
    // Keep the landscape to a few draw calls, even on small devices.
    batches.forEach((batch, material) => {
      const geometry = mergeGeometries(batch.geometries);
      if (geometry) {
        const merged = new THREE.Mesh(geometry, material);
        merged.castShadow = true;
        merged.receiveShadow = true;
        this.scene.add(merged);
        batch.meshes.forEach((mesh) => {
          mesh.removeFromParent();
          mesh.geometry.dispose();
        });
      }
      batch.geometries.forEach((g) => g.dispose());
    });
  }

  private buildEffects() {
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.29 + i * 0.12, 0.012, 4, 32),
        new THREE.MeshBasicMaterial({
          color: "#f5ffef",
          transparent: true,
          opacity: 0.7 - i * 0.18,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      this.ripples.add(ring);
    }
    this.scene.add(this.ripples);
    const target = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.024, 5, 24),
      new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    );
    target.rotation.x = Math.PI / 2;
    this.marker.add(target);
    this.marker.visible = false;
    this.scene.add(this.marker);
  }

  private bindEvents() {
    const listen = (
      target: EventTarget,
      type: string,
      handler: EventListener,
    ) => {
      target.addEventListener(type, handler);
      this.removeEvents.push(() => target.removeEventListener(type, handler));
    };
    const movementKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "w",
      "a",
      "s",
      "d",
      "q",
      "e",
      " ",
    ];
    listen(window, "keydown", ((event: KeyboardEvent) => {
      if (
        this.paused ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof HTMLElement &&
          (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) ||
            (event.key === " " && event.target.tagName === "BUTTON")))
      )
        return;
      if (movementKeys.includes(event.key)) {
        event.preventDefault();
        this.keys.add(event.key);
        if (!["q", "e", " "].includes(event.key)) this.destination = null;
        if (event.key === " " && !event.repeat) this.jump();
      }
    }) as EventListener);
    listen(window, "keyup", ((event: KeyboardEvent) => {
      this.keys.delete(event.key);
    }) as EventListener);
    listen(window, "blur", (() => this.releaseInput()) as EventListener);
    listen(document, "visibilitychange", (() => {
      this.releaseInput();
      this.previousTime = 0;
    }) as EventListener);
    const canvas = this.renderer.domElement;
    listen(canvas, "pointerdown", ((event: PointerEvent) => {
      if (this.paused || (event.pointerType === "mouse" && event.button !== 0))
        return;
      this.gesture.down(event.pointerId, event.clientX, event.clientY);
      if (this.cameraMode === "first-person")
        canvas.setPointerCapture(event.pointerId);
    }) as EventListener);
    listen(canvas, "pointermove", ((event: PointerEvent) => {
      if (this.paused) return;
      const delta = this.gesture.move(
        event.pointerId,
        event.clientX,
        event.clientY,
      );
      if (this.cameraMode === "first-person" && delta) {
        const sensitivity = 2.7 / Math.max(300, canvas.clientHeight);
        this.firstPersonForward.copy(
          turnView(
            this.firstPersonForward,
            this.normal,
            -delta.x * sensitivity,
          ),
        );
        this.firstPersonPitch = THREE.MathUtils.clamp(
          this.firstPersonPitch - delta.y * sensitivity,
          MIN_PITCH,
          MAX_PITCH,
        );
      }
    }) as EventListener);
    listen(canvas, "pointerup", ((event: PointerEvent) => {
      const tap = this.gesture.end(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
      if (!tap || this.paused) return;
      const bounds = canvas.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, this.camera);
      const hit = raycaster.intersectObject(this.planet)[0];
      if (!hit) return;
      const normal = hit.point.normalize();
      if (this.decorationMode) {
        if (this.placed.length >= MAX_DECORATIONS) return;
        const decoration = {
          kind: this.decorationMode,
          position: normal.toArray() as Decoration["position"],
        };
        this.addDecoration(decoration);
        this.callbacks.decorate(decoration);
      } else {
        this.destination = normal;
        this.place(this.marker, normal, 0.07);
        this.marker.visible = true;
      }
    }) as EventListener);
    listen(canvas, "pointercancel", ((event: PointerEvent) => {
      this.gesture.end(event.pointerId, true);
    }) as EventListener);
    listen(canvas, "lostpointercapture", ((event: PointerEvent) => {
      this.gesture.end(event.pointerId, true);
    }) as EventListener);
    listen(canvas, "webglcontextlost", ((event: Event) => {
      event.preventDefault();
      this.paused = true;
      this.callbacks.error(
        "The little world needs a fresh start. Your discoveries are safe.",
      );
    }) as EventListener);
  }

  private resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.fov =
      this.cameraMode === "first-person" ? 72 : width < 500 ? 48 : 38;
    this.camera.updateProjectionMatrix();
  }

  private releaseInput() {
    this.keys.clear();
    this.input.set(0, 0);
    this.lookInput = 0;
    this.gesture.reset();
  }
  setInput(x: number, y: number) {
    this.input.set(x, y);
    if (x || y) this.destination = null;
  }
  setPaused(value: boolean) {
    if (this.paused === value) return;
    this.paused = value;
    this.controls.enabled = !value && this.cameraMode !== "first-person";
    this.releaseInput();
    cancelAnimationFrame(this.frame);
    this.previousTime = 0;
    if (!value && !this.disposed) this.frame = requestAnimationFrame(this.tick);
  }
  setDecoration(kind: DecorationType | null) {
    this.decorationMode = kind;
    this.destination = null;
    this.marker.visible = false;
  }
  jump() {
    if (!this.paused && this.jumps === 0) this.jumpVelocity = 2.6;
  }
  findWonder() {
    const nearest = this.collectibles
      .filter(
        (c) =>
          !this.foundIds.has(c.id) &&
          terrain(c.normal).region === this.lastRegion,
      )
      .sort(
        (a, b) => this.normal.angleTo(a.normal) - this.normal.angleTo(b.normal),
      )[0];
    if (!nearest) return false;
    this.destination = nearest.normal.clone();
    this.place(this.marker, this.destination, 0.07);
    this.marker.visible = true;
    return true;
  }
  zoom(direction: number) {
    if (this.cameraMode === "first-person") return;
    this.zoomTarget = THREE.MathUtils.clamp(
      (this.zoomTarget ?? this.camera.position.length()) + direction * 2.8,
      MIN_ZOOM,
      MAX_ZOOM,
    );
  }
  private cameraDirection() {
    const north = UP.clone().projectOnPlane(this.normal).normalize();
    const east = new THREE.Vector3().crossVectors(UP, this.normal).normalize();
    return this.normal
      .clone()
      .addScaledVector(north, -0.55)
      .addScaledVector(east, 0.3)
      .normalize();
  }
  overview() {
    if (this.cameraMode === "first-person") {
      this.setCameraMode("planet");
      return;
    }
    this.cameraMode = "planet";
    this.zoomTarget = 23.5;
    this.cameraTarget = this.cameraDirection();
  }
  center() {
    if (this.cameraMode === "first-person") {
      this.setCameraMode("follow");
      return;
    }
    this.cameraMode = "follow";
    this.cameraTarget = this.cameraDirection();
    this.zoomTarget = 12;
  }
  travel(region: Region) {
    this.releaseInput();
    this.destination = null;
    this.marker.visible = false;
    this.normal.copy(REGIONS[region].spawn);
    if (this.cameraMode === "first-person") {
      this.firstPersonForward.copy(surfaceForward(this.normal, UP));
      this.firstPersonPitch = -0.25;
      this.cameraTarget = null;
      this.zoomTarget = null;
    } else {
      this.cameraMode = "follow";
      this.cameraTarget = this.cameraDirection();
      this.zoomTarget = 14;
    }
    this.jumps = 0;
    this.jumpVelocity = 0;
    this.facing = 0;
    this.renderer.shadowMap.needsUpdate = true;
  }
  setLookInput(direction: number) {
    this.lookInput = direction;
  }
  setCameraMode(mode: CameraMode) {
    if (this.paused) return;
    if (mode === "first-person" && this.cameraMode === mode) return;
    if (mode === this.cameraMode && mode !== "first-person") {
      if (mode === "planet") this.overview();
      else this.center();
      return;
    }
    this.releaseInput();
    this.destination = null;
    this.marker.visible = false;
    const wasFirstPerson = this.cameraMode === "first-person";
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    if (!wasFirstPerson) this.controls.update();
    this.cameraMode = mode;
    this.controls.enabled = mode !== "first-person";
    this.sunny.root.visible = mode !== "first-person";
    this.cameraTarget = null;
    this.zoomTarget = null;
    if (mode === "first-person") {
      const towardWorld = this.normal
        .clone()
        .multiplyScalar(terrain(this.normal).height)
        .sub(this.camera.position);
      this.firstPersonForward.copy(surfaceForward(this.normal, towardWorld));
      this.firstPersonPitch = -0.25;
      this.scene.fog = new THREE.Fog("#d4edfc", 5, 18);
      this.updateFirstPersonCamera();
    } else {
      this.scene.fog = null;
      this.camera.up.copy(UP);
      this.controls.target.set(0, 0, 0);
      this.camera.position
        .copy(this.cameraDirection())
        .multiplyScalar(mode === "planet" ? 23.5 : 12);
      this.controls.update();
    }
    this.controls.enableDamping = damping;
    this.renderer.shadowMap.needsUpdate = true;
    this.resize();
  }

  private updateFirstPersonCamera() {
    const info = terrain(this.normal);
    const frame = firstPersonFrame(
      this.normal,
      this.firstPersonForward,
      this.firstPersonPitch,
      info.height,
      info.region === "ocean",
      this.jumps,
    );
    this.camera.position.copy(frame.position);
    this.camera.up.copy(frame.up);
    this.camera.lookAt(frame.position.clone().add(frame.direction));
    return frame;
  }
  undoDecoration() {
    const last = this.placed.pop();
    if (last) {
      this.scene.remove(last);
      last.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      this.renderer.shadowMap.needsUpdate = true;
    }
  }
  reset() {
    this.foundIds.clear();
    this.collectibles.forEach((c) => {
      c.group.visible = true;
    });
    while (this.placed.length) this.undoDecoration();
    this.travel("forest");
    this.overview();
  }

  private addDecoration(decoration: Decoration) {
    const group = makeDecoration(decoration.kind);
    const normal = new THREE.Vector3(...decoration.position).normalize();
    this.place(group, normal, terrain(normal).region === "ocean" ? 0.02 : 0);
    this.placed.push(group);
    this.renderer.shadowMap.needsUpdate = true;
  }

  private move(dt: number) {
    const x =
      this.input.x +
      (this.keys.has("d") || this.keys.has("ArrowRight") ? 1 : 0) -
      (this.keys.has("a") || this.keys.has("ArrowLeft") ? 1 : 0);
    const y =
      this.input.y +
      (this.keys.has("w") || this.keys.has("ArrowUp") ? 1 : 0) -
      (this.keys.has("s") || this.keys.has("ArrowDown") ? 1 : 0);
    let tangent = new THREE.Vector3();
    if (x || y) {
      const right =
        this.cameraMode === "first-person"
          ? new THREE.Vector3()
              .crossVectors(this.firstPersonForward, this.normal)
              .normalize()
          : new THREE.Vector3()
              .setFromMatrixColumn(this.camera.matrixWorld, 0)
              .projectOnPlane(this.normal)
              .normalize();
      const forward =
        this.cameraMode === "first-person"
          ? this.firstPersonForward.clone()
          : new THREE.Vector3()
              .setFromMatrixColumn(this.camera.matrixWorld, 1)
              .projectOnPlane(this.normal)
              .normalize();
      tangent
        .copy(right)
        .multiplyScalar(x)
        .addScaledVector(forward, y)
        .normalize();
    } else if (this.destination) {
      if (this.normal.angleTo(this.destination) < 0.018) {
        this.destination = null;
        this.marker.visible = false;
      } else
        tangent.copy(this.destination).projectOnPlane(this.normal).normalize();
    }
    const moving = tangent.lengthSq() > 0.001;
    if (moving) {
      const previous = this.normal.clone();
      const speed = terrain(this.normal).region === "ocean" ? 0.15 : 0.2;
      this.normal.addScaledVector(tangent, dt * speed).normalize();
      const turn = new THREE.Quaternion().setFromUnitVectors(
        previous,
        this.normal,
      );
      if (this.cameraMode === "first-person") {
        this.firstPersonForward.copy(
          transportForward(this.firstPersonForward, previous, this.normal),
        );
        if (this.destination) {
          this.firstPersonForward
            .lerp(surfaceForward(this.normal, tangent), Math.min(1, dt * 3))
            .normalize();
        }
      } else {
        this.camera.position.applyQuaternion(turn);
        if (this.cameraTarget) this.cameraTarget.applyQuaternion(turn);
      }
      const localTangent = tangent.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(UP, this.normal).invert(),
      );
      this.facing = Math.atan2(localTangent.x, localTangent.z);
    }
    return moving;
  }

  private positionSunny(swimming: boolean, moving: boolean, dt: number) {
    const info = terrain(this.normal);
    if (this.jumpVelocity || this.jumps) {
      this.jumpVelocity -= dt * 6;
      this.jumps = Math.max(0, this.jumps + this.jumpVelocity * dt);
      if (this.jumps === 0) this.jumpVelocity = 0;
    }
    this.sunny.root.position
      .copy(this.normal)
      .multiplyScalar(
        info.height +
          0.1 +
          this.jumps +
          (swimming ? -0.2 + Math.sin(this.elapsed * 3) * 0.024 : 0),
      );
    this.sunny.root.quaternion.setFromUnitVectors(UP, this.normal);
    if (!moving && this.cameraMode !== "first-person") {
      const towardsCamera = this.camera.position
        .clone()
        .sub(this.sunny.root.position)
        .projectOnPlane(this.normal)
        .normalize()
        .applyQuaternion(this.sunny.root.quaternion.clone().invert());
      const desired = Math.atan2(towardsCamera.x, towardsCamera.z);
      this.facing +=
        Math.atan2(
          Math.sin(desired - this.facing),
          Math.cos(desired - this.facing),
        ) * Math.min(1, dt * 5);
    }
    this.sunny.body.rotation.y = this.facing;
    this.sunny.body.rotation.x = swimming ? 0.25 : 0;
    this.sunny.body.position.y =
      moving && !swimming
        ? Math.abs(Math.sin(this.elapsed * 10)) * 0.04
        : Math.sin(this.elapsed * 2) * 0.012;
    for (let i = 0; i < 2; i++) {
      this.sunny.legs[i].rotation.x = moving
        ? Math.sin(this.elapsed * (swimming ? 7 : 10) + i * Math.PI) *
          (swimming ? 0.65 : 0.55)
        : 0;
      this.sunny.arms[i].rotation.x = moving
        ? Math.sin(this.elapsed * (swimming ? 5 : 10) + (1 - i) * Math.PI) * 0.6
        : Math.sin(this.elapsed * 2) * 0.04;
      this.sunny.arms[i].rotation.z =
        (i === 0 ? -1 : 1) * (swimming ? 1.15 : 0.43);
    }
    this.ripples.visible = swimming;
    this.ripples.position.copy(this.normal).multiplyScalar(RADIUS + 0.035);
    this.ripples.quaternion.setFromUnitVectors(UP, this.normal);
    this.ripples.scale.setScalar(1 + Math.sin(this.elapsed * 3) * 0.1);
  }

  private tick = (time: number) => {
    if (this.disposed || this.paused) return;
    if (document.hidden) {
      this.previousTime = 0;
      this.frame = requestAnimationFrame(this.tick);
      return;
    }
    const dt = this.previousTime
      ? Math.min((time - this.previousTime) / 1000, 0.1)
      : 0;
    this.previousTime = time;
    let moving = false;
    if (!this.paused && !document.hidden) {
      this.elapsed += dt;
      if (this.cameraMode === "first-person") {
        const yaw =
          this.lookInput +
          (this.keys.has("q") ? 1 : 0) -
          (this.keys.has("e") ? 1 : 0);
        this.firstPersonForward.copy(
          turnView(this.firstPersonForward, this.normal, yaw * dt * 1.4),
        );
      }
      moving = this.move(dt);
      const info = terrain(this.normal);
      this.lastRegion = info.region;
      this.positionSunny(info.region === "ocean", moving, dt);
      if (this.cameraTarget) {
        const distance = this.camera.position.length();
        this.camera.position
          .lerp(
            this.cameraTarget.clone().multiplyScalar(distance),
            Math.min(1, dt * 3.5),
          )
          .normalize()
          .multiplyScalar(distance);
        if (
          this.camera.position
            .clone()
            .normalize()
            .distanceTo(this.cameraTarget) < 0.002
        )
          this.cameraTarget = null;
      }
      if (this.zoomTarget !== null) {
        const next = THREE.MathUtils.lerp(
          this.camera.position.length(),
          this.zoomTarget,
          Math.min(1, dt * 5),
        );
        this.camera.position.setLength(next);
        if (Math.abs(next - this.zoomTarget) < 0.015) this.zoomTarget = null;
      }
      for (const c of this.collectibles) {
        if (this.foundIds.has(c.id)) continue;
        c.object.position.y = 0.46 + Math.sin(this.elapsed * 2.4) * 0.075;
        c.object.rotation.y += dt * 0.65;
        if (this.normal.angleTo(c.normal) < 0.082) {
          this.foundIds.add(c.id);
          c.group.visible = false;
          this.callbacks.found(c.id);
        }
      }
      this.clouds.forEach((cloud, i) => {
        cloud.rotation.z += Math.sin(this.elapsed * 0.2 + i) * dt * 0.014;
      });
    }
    if (this.cameraMode === "first-person") this.updateFirstPersonCamera();
    else {
      this.controls.update();
      const focus =
        1 - THREE.MathUtils.smoothstep(this.camera.position.length(), 11, 23.5);
      this.camera.lookAt(
        this.normal.clone().multiplyScalar(RADIUS * 0.95 * focus),
      );
    }
    if ((moving || this.jumps > 0) && time - this.lastShadowUpdate > 180) {
      this.renderer.shadowMap.needsUpdate = true;
      this.lastShadowUpdate = time;
    }
    this.renderer.render(this.scene, this.camera);
    if (time - this.lastState > 140) {
      const screen = this.sunny.root.position
        .clone()
        .addScaledVector(this.normal, 1.65)
        .project(this.camera);
      this.callbacks.state({
        cameraMode: this.cameraMode,
        lookDirection: this.camera
          .getWorldDirection(new THREE.Vector3())
          .toArray(),
        cameraClearance:
          this.camera.position.length() - terrain(this.normal).height,
        region: this.lastRegion,
        moving,
        swimming: this.lastRegion === "ocean",
        jumping: this.jumps > 0,
        zoom: this.camera.position.length(),
        position: this.normal.toArray(),
        playerScreen: {
          x: (screen.x + 1) * 50,
          y: (1 - screen.y) * 50,
          visible:
            this.cameraMode !== "first-person" &&
            screen.z < 1 &&
            Math.abs(screen.x) < 0.8 &&
            Math.abs(screen.y) < 0.8 &&
            this.normal.dot(this.camera.position.clone().normalize()) > 0.35,
        },
      });
      this.lastState = time;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.removeEvents.forEach((remove) => remove());
    this.controls.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const mats = Array.isArray(object.material)
          ? object.material
          : [object.material];
        mats.forEach((m) => m.dispose());
      }
    });
    disposeMaterials();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
