import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const session = "mini-world-verification";
const url = process.env.MINI_WORLD_URL || "http://127.0.0.1:3000";
const artifacts = ".hoplite/artifacts";
mkdirSync(artifacts, { recursive: true });
const results = [];
const env = {
  ...process.env,
  AGENT_BROWSER_ARGS:
    "--use-gl=angle,--use-angle=swiftshader,--enable-unsafe-swiftshader,--disable-gpu-sandbox",
};
const run = (...args) => {
  const output = execFileSync(
    "agent-browser",
    ["--session", session, "--json", ...args],
    { env, encoding: "utf8", timeout: 90_000 },
  );
  const response = JSON.parse(output.trim());
  if (!response.success) throw new Error(JSON.stringify(response.error));
  return response.data;
};
const evaluate = (code) => run("eval", code).result;
const screenshotPage = (path) =>
  copyFileSync(run("screenshot", "--full").path, path);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const state = () =>
  evaluate('({...document.querySelector(".world-stage").dataset})');
const save = () =>
  evaluate('JSON.parse(localStorage.getItem("mini-world-v1"))');
const click = (label) => run("click", `[aria-label=${JSON.stringify(label)}]`);
const clickText = (text) =>
  run("find", "role", "button", "click", "--name", text);
const record = (name) => {
  results.push({ name, passed: true });
  console.log(`✓ ${name}`);
};
async function until(predicate, name, timeout = 45_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) {
      record(name);
      return;
    }
    await wait(400);
  }
  throw new Error(`Timed out: ${name}`);
}
async function holdKey(key, duration = 1200) {
  evaluate(
    `window.dispatchEvent(new KeyboardEvent('keydown', {key:${JSON.stringify(key)},bubbles:true}))`,
  );
  await wait(duration);
  evaluate(
    `window.dispatchEvent(new KeyboardEvent('keyup', {key:${JSON.stringify(key)},bubbles:true}))`,
  );
}
async function tapCanvas(x = 0.52, y = 0.55) {
  const box = evaluate(
    '(()=>{const r=document.querySelector("canvas").getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}})()',
  );
  const targetX = Math.round(box.x + box.w * x);
  const targetY = Math.round(box.y + box.h * y);
  assert.equal(
    evaluate(`document.elementFromPoint(${targetX}, ${targetY})?.tagName`),
    "CANVAS",
    "The test tap must target visible planet space, not an overlaid control",
  );
  run("mouse", "move", String(targetX), String(targetY));
  run("mouse", "down");
  run("mouse", "up");
}

try {
  run("open", url);
  run("set", "viewport", "1440", "1000");
  evaluate('localStorage.removeItem("mini-world-v1")');
  run("reload");
  await until(
    () =>
      evaluate(
        '!!document.querySelector("canvas") && !document.querySelector(".game-error")',
      ),
    "3D world starts without an error",
  );
  assert.equal(state().region, "forest");
  assert.equal(evaluate('document.querySelectorAll("canvas").length'), 1);
  record("Exactly one renderer starts in Wonder Woods");
  assert.equal(
    evaluate("document.documentElement.scrollWidth <= innerWidth"),
    true,
  );
  record("Desktop has no horizontal overflow");
  assert.equal(
    evaluate(
      'new URL(document.querySelector(".brand .project-logo").src).pathname',
    ),
    new URL("project-logo.png", url).pathname,
  );
  await until(
    () =>
      evaluate(
        'document.querySelector(".brand .project-logo")?.naturalWidth',
      ) === 400,
    "Supplied project logo loads in the branded header",
  );
  assert.ok(
    evaluate(
      'getComputedStyle(document.documentElement).getPropertyValue("--cyan").trim()',
    ),
  );
  record("Project blue–cyan theme tokens are applied");

  click("Zoom in");
  await until(
    () => +state().zoom < 21.5,
    "Zoom in moves smoothly toward the planet",
  );
  click("Zoom out");
  await until(() => +state().zoom > 22.5, "Zoom out reveals the little planet");
  let before = state().position;
  await holdKey("ArrowRight");
  assert.notEqual(state().position, before);
  record("Arrow keys move Sunny over the spherical surface");
  await until(
    () => state().moving === "false",
    "Releasing a key stops movement",
  );
  before = state().position;
  await holdKey("w");
  assert.notEqual(state().position, before);
  record("WASD movement works");

  before = state().position;
  await tapCanvas(0.54, 0.5);
  await until(
    () => state().position !== before,
    "Tapping the planet starts real point-to-point movement",
  );
  click("Explore Wonder Woods");
  await until(
    () => state().region === "forest" && +state().zoom < 15,
    "Recenter after tap-to-walk",
  );

  clickText("Take a break");
  before = state().position;
  await holdKey("ArrowUp");
  assert.equal(state().position, before);
  assert.equal(evaluate('!!document.querySelector(".pause-overlay")'), true);
  record("Pause prevents movement and presents a clear resume action");
  clickText("Keep exploring");
  clickText("How to play");
  assert.equal(
    evaluate(
      'document.querySelector("[role=dialog]").getAttribute("aria-modal")',
    ),
    "true",
  );
  assert.equal(
    evaluate(
      'document.querySelector("[role=dialog]").contains(document.activeElement)',
    ),
    true,
  );
  run("press", "Escape");
  assert.equal(evaluate('!!document.querySelector("[role=dialog]")'), false);
  record(
    "Instructions open with focus inside the dialog and close with Escape",
  );

  click("Explore Sunny Dunes");
  await until(
    () => state().region === "desert" && +state().zoom < 15,
    "Travel to the desert and focus its environment",
  );
  click("Jump");
  await until(() => state().jumping === "true", "Sunny can jump on land");
  await until(
    () => state().jumping === "false",
    "Sunny lands safely after jumping",
  );
  click("Explore Sparkle Sea");
  await until(
    () => state().region === "ocean" && state().swimming === "true",
    "Entering the ocean automatically enables swimming",
  );
  click("Splash");
  await until(
    () => state().jumping === "true",
    "Splash action works while swimming",
  );
  before = state().position;
  await holdKey("ArrowRight");
  assert.notEqual(state().position, before);
  record("Sunny can move through the water");
  run("screenshot", ".world-stage", `${artifacts}/swimming.png`);

  click("Explore Wonder Woods");
  await until(
    () => state().region === "forest",
    "Start the shoreline crossing on land",
  );
  evaluate(
    "window.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowDown',bubbles:true}))",
  );
  await until(
    () => state().swimming === "true",
    "Walking across the shoreline automatically becomes swimming",
    90_000,
  );
  evaluate(
    "window.dispatchEvent(new KeyboardEvent('keyup', {key:'ArrowDown',bubbles:true}))",
  );
  evaluate(
    "window.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowUp',bubbles:true}))",
  );
  await until(
    () => state().swimming === "false",
    "Swimming back to shore automatically becomes walking",
    90_000,
  );
  evaluate(
    "window.dispatchEvent(new KeyboardEvent('keyup', {key:'ArrowUp',bubbles:true}))",
  );

  for (const [region, name] of [
    ["forest", "Wonder Woods"],
    ["desert", "Sunny Dunes"],
    ["ocean", "Sparkle Sea"],
  ]) {
    click(`Explore ${name}`);
    await until(() => state().region === region, `Arrive in ${name}`);
    for (let i = 0; i < 3; i++) {
      const count = save().found.filter((id) => id.startsWith(region)).length;
      if (count >= 3) break;
      run("click", ".region-progress");
      await until(
        () => save().found.filter((id) => id.startsWith(region)).length > count,
        `Find a real ${region} treasure by moving to it`,
        90_000,
      );
    }
  }
  assert.equal(save().found.length, 9);
  record("All nine discoveries are reachable and collectible");
  clickText("My discoveries 9");
  assert.equal(
    evaluate('document.querySelectorAll(".collection-item.found").length'),
    9,
  );
  assert.equal(evaluate('!!document.querySelector(".all-found")'), true);
  run("screenshot", "[role=dialog]", `${artifacts}/discoveries.png`);
  record(
    "Collection shows all nine real discoveries and celebrates completion",
  );
  click("Close dialog");

  click("Explore Wonder Woods");
  await until(
    () => state().region === "forest" && +state().zoom < 14.2,
    "Return safely from swimming to walking",
  );
  clickText("Decorate");
  clickText("Flowers");
  await tapCanvas();
  await until(
    () => save().decorations.length === 1,
    "Place a decoration by tapping the 3D world",
  );
  clickText("Tree");
  await tapCanvas(0.63, 0.45);
  await until(
    () => save().decorations.length === 2,
    "Place a second decoration",
  );
  click("Undo last decoration");
  assert.equal(save().decorations.length, 1);
  record("Undo removes the most recent decoration");
  click("Close decorations");
  click("Turn sound on");
  await until(
    () => save().sound === true,
    "Sound can be enabled by a user gesture",
  );
  run("reload");
  await until(
    () => evaluate('!!document.querySelector("canvas")'),
    "Renderer restarts after reload",
  );
  assert.equal(save().found.length, 9);
  assert.equal(save().decorations.length, 1);
  assert.equal(save().sound, true);
  record("Discoveries, decorations, and sound preference survive reload");

  click("Enter big screen");
  assert.equal(
    evaluate('!!document.querySelector(".game-card.expanded")'),
    true,
  );
  run("press", "Escape");
  assert.equal(
    evaluate('!!document.querySelector(".game-card.expanded")'),
    false,
  );
  record("Big-screen mode enters and exits with Escape");
  clickText("Grown-up corner");
  clickText("Start a fresh adventure");
  clickText("Keep our world");
  assert.equal(save().found.length, 9);
  record("Cancel reset preserves the existing world");
  clickText("Start a fresh adventure");
  clickText("Yes, start fresh");
  assert.equal(save().found.length, 0);
  assert.equal(save().decorations.length, 0);
  record("Confirmed reset clears discoveries and decorations");

  run("set", "viewport", "390", "844");
  await wait(1400);
  assert.equal(
    evaluate("document.documentElement.scrollWidth <= innerWidth"),
    true,
  );
  record("Phone layout has no horizontal overflow");
  const button = evaluate(
    '(()=>{const r=document.querySelector(".direction-right").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()',
  );
  before = state().position;
  run(
    "mouse",
    "move",
    String(Math.round(button.x)),
    String(Math.round(button.y)),
  );
  run("mouse", "down");
  await wait(1300);
  run("mouse", "up");
  assert.notEqual(state().position, before);
  record("Phone directional pad moves Sunny with a held pointer");
  await until(
    () => state().moving === "false",
    "Releasing the directional pad stops movement",
  );
  screenshotPage(`${artifacts}/mobile.png`);
  run("set", "viewport", "1440", "1000");
  click("Explore Wonder Woods");
  clickText("Little planet");
  await until(
    () => +state().zoom > 23.3,
    "Overview returns after close-up play",
  );
  screenshotPage(`${artifacts}/mini-world.png`);

  clickText("Follow Sunny");
  await until(
    () => state().cameraMode === "follow" && +state().zoom < 12.2,
    "Follow Sunny selects the close-up camera",
  );
  click("Sunny's eyes (POV)");
  await until(
    () => state().cameraMode === "first-person",
    "POV selects Sunny's eye-level camera",
  );
  assert.ok(+state().cameraClearance >= 0.87);
  assert.equal(evaluate('!!document.querySelector(".zoom-controls")'), false);
  assert.equal(
    evaluate(
      'document.querySelectorAll(".camera-switcher [aria-pressed=true]").length',
    ),
    1,
  );
  record(
    "POV stays above terrain, hides orbit zoom, and marks one active view",
  );
  run("screenshot", ".world-stage", `${artifacts}/pov-forest.png`);
  let viewBefore = state();
  await wait(700);
  assert.equal(state().lookDirection, viewBefore.lookDirection);
  assert.equal(state().cameraClearance, viewBefore.cameraClearance);
  record("Idle POV is steady without camera bobbing");

  await holdKey("ArrowUp", 1600);
  const moved = state();
  const from = viewBefore.position.split(",").map(Number);
  const to = moved.position.split(",").map(Number);
  const gaze = viewBefore.lookDirection.split(",").map(Number);
  assert.ok(
    to.reduce((dot, value, i) => dot + (value - from[i]) * gaze[i], 0) > 0,
  );
  record("POV forward movement follows the viewing direction");
  viewBefore = state();
  await holdKey("e");
  assert.notEqual(state().lookDirection, viewBefore.lookDirection);
  assert.equal(state().position, viewBefore.position);
  record("Q/E looking turns the first-person camera without walking");

  const cameraBox = evaluate(
    '(()=>{const r=document.querySelector("canvas").getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()',
  );
  viewBefore = state();
  run(
    "mouse",
    "move",
    String(Math.round(cameraBox.x + cameraBox.w * 0.52)),
    String(Math.round(cameraBox.y + cameraBox.h * 0.47)),
  );
  run("mouse", "down");
  run(
    "mouse",
    "move",
    String(Math.round(cameraBox.x + cameraBox.w * 0.63)),
    String(Math.round(cameraBox.y + cameraBox.h * 0.5)),
  );
  run("mouse", "up");
  await until(
    () => state().lookDirection !== viewBefore.lookDirection,
    "Dragging changes the first-person camera heading",
  );
  assert.equal(state().position, viewBefore.position);
  record("Looking around does not accidentally trigger tap-to-walk");

  clickText("Take a break");
  viewBefore = state();
  await holdKey("e");
  assert.equal(state().lookDirection, viewBefore.lookDirection);
  assert.equal(state().position, viewBefore.position);
  record("Pause freezes first-person camera and movement");
  clickText("Keep exploring");
  clickText("How to play");
  run("press", "Escape");
  assert.equal(state().cameraMode, "first-person");
  record("Closing instructions preserves POV selection");

  click("Explore Sunny Dunes");
  await until(
    () => state().region === "desert" && state().cameraMode === "first-person",
    "POV remains selected when traveling to the desert",
  );
  assert.ok(+state().cameraClearance > 0.8);
  run("screenshot", ".world-stage", `${artifacts}/pov-desert.png`);
  click("Explore Sparkle Sea");
  await until(
    () => state().swimming === "true" && state().cameraMode === "first-person",
    "POV supports swimming in the ocean",
  );
  assert.ok(+state().cameraClearance >= 0.51 && +state().cameraClearance < 0.6);
  before = state().position;
  await holdKey("w");
  assert.notEqual(state().position, before);
  record("POV swimming moves while keeping Sunny's eyes above the water");
  run("screenshot", ".world-stage", `${artifacts}/pov-ocean.png`);

  click("Explore Sunny Dunes");
  await until(() => state().region === "desert", "Return to land in POV");
  clickText("Decorate");
  clickText("Flowers");
  await tapCanvas(0.5, 0.9);
  await until(
    () => save().decorations.length === 1,
    "POV can decorate the ground without leaving the camera mode",
  );
  click("Undo last decoration");
  click("Close decorations");
  before = state().position;
  await tapCanvas(0.5, 0.9);
  await until(
    () => state().position !== before,
    "POV tap-to-walk moves toward visible ground",
  );
  run("press", "Escape");
  await until(
    () => state().cameraMode === "planet" && +state().zoom > 23,
    "Escape safely returns from POV to the planet",
  );
  assert.equal(evaluate('!!document.querySelector(".zoom-controls")'), true);
  record("Orbit controls return after leaving POV");

  for (let i = 0; i < 3; i++) {
    click("Sunny's eyes (POV)");
    await until(
      () => state().cameraMode === "first-person",
      `POV re-entry ${i + 1} works`,
    );
    clickText("Follow Sunny");
    await until(
      () => state().cameraMode === "follow",
      `Follow camera return ${i + 1} works`,
    );
  }
  click("Explore Wonder Woods");
  click("Sunny's eyes (POV)");
  run("set", "viewport", "390", "844");
  evaluate("window.scrollTo(0,0)");
  await wait(900);
  assert.equal(
    evaluate("document.documentElement.scrollWidth <= innerWidth"),
    true,
  );
  const switcherFits = evaluate(
    '(()=>{const s=document.querySelector(".camera-switcher").getBoundingClientRect(),p=document.querySelector(".world-stage").getBoundingClientRect();return s.left>=p.left&&s.right<=p.right})()',
  );
  assert.equal(switcherFits, true);
  record("All three camera choices fit the phone screen");
  let lookBox = evaluate(
    '(()=>{const r=document.querySelector(".pov-look button:last-child").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()',
  );
  viewBefore = state();
  run(
    "mouse",
    "move",
    String(Math.round(lookBox.x)),
    String(Math.round(lookBox.y)),
  );
  run("mouse", "down");
  await wait(1000);
  run("mouse", "up");
  await until(
    () => state().lookDirection !== viewBefore.lookDirection,
    "Phone look button rotates the POV camera",
  );
  await wait(500);
  viewBefore = state();
  await wait(500);
  assert.equal(state().lookDirection, viewBefore.lookDirection);
  record("Releasing the phone look button stops rotation");
  lookBox = evaluate(
    '(()=>{const r=document.querySelector(".direction-up").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()',
  );
  before = state().position;
  run(
    "mouse",
    "move",
    String(Math.round(lookBox.x)),
    String(Math.round(lookBox.y)),
  );
  run("mouse", "down");
  await wait(1000);
  run("mouse", "up");
  assert.notEqual(state().position, before);
  record("Phone movement pad works in POV");
  screenshotPage(`${artifacts}/pov-mobile.png`);
  run("set", "viewport", "1440", "1000");
  clickText("Little planet");
  await until(
    () => state().cameraMode === "planet",
    "Final planet view restores after phone POV play",
  );
  screenshotPage(`${artifacts}/mini-world-branded.png`);
  const errors = run("errors");
  assert.equal(errors.errors?.length || 0, 0);
  record("No uncaught browser errors during the full play loop");
  writeFileSync(
    `${artifacts}/browser-results.json`,
    JSON.stringify({ passed: results.length, results, errors }, null, 2),
  );
  console.log(
    `\n${results.length} browser checks passed. Artifacts: ${artifacts}`,
  );
} catch (error) {
  writeFileSync(
    `${artifacts}/browser-results.json`,
    JSON.stringify(
      { passed: results.length, results, failure: String(error) },
      null,
      2,
    ),
  );
  try {
    screenshotPage(`${artifacts}/browser-failure.png`);
  } catch {
    /* The original failure is more useful. */
  }
  throw error;
}
