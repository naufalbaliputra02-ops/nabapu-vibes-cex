import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const html = readFileSync("dist/index.html", "utf8");
const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
  (match) => match[1],
);
assert.ok(urls.length > 0, "The build must reference its assets");
function checkAsset(file, url) {
  if (/^(?:data:|https?:|#)/.test(url)) return;
  assert.ok(
    !url.startsWith("/"),
    `Root-relative asset would break project Pages: ${url}`,
  );
  assert.ok(
    !url.includes("%BASE_URL%"),
    "Vite must replace the base placeholder",
  );
  assert.ok(
    existsSync(resolve(dirname(file), url.split(/[?#]/)[0])),
    `Missing production asset in ${file}: ${url}`,
  );
}
for (const url of urls) checkAsset("dist/index.html", url);
for (const file of readdirSync("dist", { recursive: true })) {
  if (!/\.(?:css|js)$/.test(file)) continue;
  const path = resolve("dist", file);
  const content = readFileSync(path, "utf8");
  const references = file.endsWith(".css")
    ? content.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)
    : content.matchAll(
        /["']((?:\.{0,2}\/)[^"'\s]+\.(?:png|jpe?g|webp|svg|gif|woff2?|mp3|ogg|js)(?:\?[^"']*)?)["']/g,
      );
  for (const match of references) {
    // DOM image URLs resolve against the document, unlike module imports.
    const base =
      file.endsWith(".js") && !/\.js(?:\?|$)/.test(match[1])
        ? "dist/index.html"
        : path;
    checkAsset(base, match[1]);
  }
}
for (const image of [
  "project-logo.png",
  "sunny.png",
  "sunny-face.png",
  "favicon.svg",
]) {
  assert.ok(existsSync(resolve("dist", image)), `Missing game image: ${image}`);
}
console.log("Production assets exist and support GitHub Pages subpaths.");
