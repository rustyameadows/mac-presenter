import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { _electron as electron } from "playwright-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const outputDir = path.join(repoRoot, "output", "playwright");

mkdirSync(outputDir, { recursive: true });

function builtMainEntry() {
  const candidate = path.join(
    appRoot,
    ".webpack",
    "arm64",
    "main",
    "index.js"
  );

  if (!existsSync(candidate)) {
    throw new Error(`Missing compiled main bundle at ${candidate}. Run npm run build first.`);
  }

  return candidate;
}

async function launchWithPaths(paths) {
  return electron.launch({
    args: [builtMainEntry()],
    cwd: appRoot,
    env: {
      ...process.env,
      PRESENTER_OPEN_PATHS_JSON: JSON.stringify(paths)
    }
  });
}

async function runImageCompareScenario() {
  const app = await launchWithPaths([
    path.join(appRoot, "test", "fixtures", "image-alpha.svg"),
    path.join(appRoot, "test", "fixtures", "image-beta.svg")
  ]);
  try {
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await window.waitForSelector("text=image-alpha.svg");
    await window.getByRole("button", { name: "Diff" }).click();
    await window.waitForSelector("text=changed pixels");
    await window.screenshot({ path: path.join(outputDir, "compare-image-diff.png") });
  } finally {
    await app.close();
  }
}

async function runGridScenario() {
  const app = await launchWithPaths([path.join(appRoot, "test", "fixtures", "grid-set")]);
  try {
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await window.waitForSelector("text=Asset Browser");
    await window.screenshot({ path: path.join(outputDir, "grid-browser.png") });
  } finally {
    await app.close();
  }
}

async function runTextDiffScenario() {
  const app = await launchWithPaths([
    path.join(appRoot, "test", "fixtures", "text-a.ts"),
    path.join(appRoot, "test", "fixtures", "text-b.ts")
  ]);
  try {
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await window.waitForSelector("text=text-a.ts");
    await window.getByRole("button", { name: "Diff" }).click();
    await window.waitForSelector("text=Text/code diff");
    await window.screenshot({ path: path.join(outputDir, "text-diff.png") });
  } finally {
    await app.close();
  }
}

await runImageCompareScenario();
await runGridScenario();
await runTextDiffScenario();

console.log(`Smoke artifacts written to ${outputDir}`);
