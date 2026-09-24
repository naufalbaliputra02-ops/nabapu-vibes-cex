# Mini World

A gentle, playable 3D globe for little explorers. Built with React, TypeScript, Vite, and Three.js. Sunny is a procedural 3D interpretation of the supplied yellow, diamond-eyed character; the interface portraits are derived from that same reference.

The supplied project logo appears in the header, loading screen, and favicon. Its navy, blue, and cyan palette carries through the interface while Sunny stays yellow and each biome keeps its own natural colors.

## Run

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open port 3000. The repository's `.hoplite/settings.json` configures the same setup and managed Preview commands. A WebGL 2-capable browser is required; hardware acceleration is recommended.

## Play

- Tap or click the globe to walk. Drag to orbit, scroll or pinch to zoom, or use the +/− buttons.
- Move with WASD, arrow keys, or the directional pad. Space or the sparkle button makes Sunny hop; in the ocean it makes a splash.
- Region cards take Sunny to Wonder Woods, Sunny Dunes, or Sparkle Sea. Swimming starts and stops automatically at the shoreline.
- Walk into the nine floating discoveries to collect them. The star counter can guide Sunny to a nearby surprise.
- Choose **Decorate**, pick an item, then tap the world. Undo is available; up to 40 decorations are saved.
- **Find Sunny** recenters the camera. **Little planet** returns to the globe view. Big-screen mode exits with Escape.
- The camera switcher offers **Little planet**, **Follow Sunny**, and **POV** (Sunny's eyes). POV places the camera at Sunny's eye level, follows the planet's curvature, and keeps it above the water while swimming. Drag to look, hold the look buttons or Q/E to turn, and use the usual movement controls. Looking up/down is limited to prevent flipping; there is no pointer lock or idle head-bob. Escape returns from POV to the planet; press it again to leave big-screen mode.
- Traveling between regions keeps POV selected. Use the planet or follow camera to see Sunny again. Camera selection is session-only; reloading starts in the gentle planet overview.
- Pause and dialogs stop movement. Progress, decorations, and sound preference are saved locally. Grown-up corner offers a confirmed reset.

No server, login, ads, purchases, chat, timers, or loss conditions. Local progress is specific to the current browser and origin; clearing browser data removes it. Sound uses soft synthesized chimes and requires a user gesture.

## Verification

```sh
pnpm test          # World, regions, discoveries, and persistence validation
pnpm build         # Strict TypeScript check and production build
pnpm check:dist    # Verify build assets work under a GitHub Pages project path
pnpm format:check
pnpm test:browser  # Full running-app interaction loop
```

The browser test requires the `agent-browser` CLI and a running app. Set `MINI_WORLD_URL` to test another origin. It uses its own browser session and resets only that session's Mini World progress. It tests movement, zoom, pause, dialogs, jumping, swimming, all nine discoveries, decoration, undo, persistence, reset, and the phone layout. Results and screenshots are written to the ignored `.hoplite/artifacts` directory.

Headless Linux verification explicitly enables SwiftShader software WebGL. Software-only rendering is slower than a GPU-backed browser; the game uses a lighter graphics profile there. Static landscape meshes are batched, shadows are reused, pixel density is bounded, and hidden tabs stop rendering. Physical-device performance and native touch/pinch should also be checked on the intended child's device.

## GitHub Pages deployment

`docs/github-pages.yml` is an **inactive workflow template**. The connected GitHub App currently cannot publish `.github/workflows` files because it lacks the `workflows` permission. No GitHub Actions checks or automatic deployments run until a repository administrator activates this template.

Once activated, `Verify and deploy Mini World` tests and builds pull requests. On `main`, it publishes the verified `dist` artifact to GitHub Pages. Deployment never runs for pull requests.

One-time repository setup (requires a repository administrator):

1. Open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
2. Copy `docs/github-pages.yml` to `.github/workflows/pages.yml` through an authorized account, or grant the connected GitHub App workflow write access before asking it to activate deployment.
3. Merge the Mini World pull request (and active workflow) into `main`.
4. Open **Actions → Verify and deploy Mini World** and wait for **Publish GitHub Pages** to succeed. If the code was merged before Pages was enabled, run the workflow manually on `main`.

The expected project address is `https://naufalbaliputra02-ops.github.io/nabapu-vibes-cex/`, but it is not live until the deployment succeeds. Relative Vite asset paths support that project URL and custom domains without rebuilding for a different base. No deployment secrets are required: the workflow uses GitHub's scoped Pages token and OIDC permissions.
