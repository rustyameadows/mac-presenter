import assert from "node:assert/strict";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { _electron as electron } from "playwright-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const fixtureRoot = path.join(repoRoot, "test", "fixtures", "supported");
const outputDir = path.join(repoRoot, "output", "playwright");
const fullManifest = JSON.parse(
  readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8")
);
const smokeIds = process.env.PRESENTER_SMOKE_IDS
  ? new Set(
      process.env.PRESENTER_SMOKE_IDS.split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  : null;
const manifest = smokeIds
  ? fullManifest.filter((entry) => smokeIds.has(entry.id))
  : fullManifest;
const strictTextExcerptEntries = new Set([
  "text-plain-primary",
  "text-plain-long",
  "text-html-primary-html",
  "text-plain-pair"
]);

mkdirSync(outputDir, { recursive: true });

function builtMainEntry() {
  const candidate = path.join(appRoot, ".webpack", "arm64", "main", "index.js");

  if (!existsSync(candidate)) {
    throw new Error(`Missing compiled main bundle at ${candidate}. Run npm run build first.`);
  }

  return candidate;
}

function resolveScenarioPaths(entry) {
  return entry.entryPaths.map((relativePath) => path.join(fixtureRoot, relativePath));
}

async function getDebugState(window) {
  return window.evaluate(() => window.presenter.getDebugState());
}

async function readDeepText(window, selector) {
  return window.evaluate((targetSelector) => {
    function collectText(node) {
      let output = "";

      if (node.nodeType === Node.TEXT_NODE) {
        output += node.textContent ?? "";
      }

      if (node instanceof Element || node instanceof ShadowRoot || node instanceof DocumentFragment) {
        for (const child of node.childNodes) {
          output += collectText(child);
        }

        if (node instanceof Element && node.shadowRoot) {
          output += collectText(node.shadowRoot);
        }
      }

      return output;
    }

    const root = document.querySelector(targetSelector);
    return root ? collectText(root) : "";
  }, selector);
}

async function openScenario(window, entry) {
  const resolvedPaths = resolveScenarioPaths(entry);
  await window.evaluate((paths) => window.presenter.loadPaths(paths), resolvedPaths);
  await window.waitForFunction(
    async ({ expectedSurface, expectedSelection }) => {
      const debug = await window.presenter.getDebugState();
      if (!debug || !debug.session) {
        return false;
      }

      const selected = [...debug.selectedAssetNames].sort();
      return (
        debug.surface === expectedSurface &&
        JSON.stringify(selected) === JSON.stringify([...expectedSelection].sort())
      );
    },
    {
      expectedSurface: entry.expectedSurface,
      expectedSelection: entry.expectedSelection
    }
  );

  const debug = await getDebugState(window);
  assert(debug, `Missing debug state for ${entry.id}`);
  assert.equal(debug.enabled, true, `Debug state disabled for ${entry.id}`);
  return debug;
}

function selectedAssetsFromDebug(debug) {
  const selectedIds = new Set(debug.selectedAssetIds);
  return debug.session.assets.filter((asset) => selectedIds.has(asset.id));
}

function assertMetadata(entry, debug) {
  const asset = selectedAssetsFromDebug(debug)[0];
  if (!asset) {
    return;
  }

  const expected = entry.expectedMetadata;
  if (expected.fileTypeLabel) {
    assert.equal(asset.metadata.fileTypeLabel, expected.fileTypeLabel);
  }

  if (asset.metadata.family === "text") {
    if (expected.lineCount !== undefined) {
      assert.equal(asset.metadata.lineCount, expected.lineCount);
    }
    if (expected.wordCount !== undefined) {
      assert.equal(asset.metadata.wordCount, expected.wordCount);
    }
    if (expected.characterCountMin !== undefined) {
      assert.ok(asset.metadata.characterCount >= expected.characterCountMin);
    }
  }

  if (asset.metadata.family === "image" || asset.metadata.family === "gif") {
    if (expected.width !== undefined) {
      assert.equal(asset.metadata.width, expected.width);
    }
    if (expected.height !== undefined) {
      assert.equal(asset.metadata.height, expected.height);
    }
  }

  if (asset.metadata.family === "video") {
    if (expected.width !== undefined) {
      assert.equal(asset.metadata.width, expected.width);
    }
    if (expected.height !== undefined) {
      assert.equal(asset.metadata.height, expected.height);
    }
    if (expected.durationSecondsMin !== undefined) {
      assert.ok((asset.metadata.durationSeconds ?? 0) >= expected.durationSecondsMin);
    }
    if (expected.codec !== undefined) {
      assert.equal(asset.metadata.codec, expected.codec);
    }
    if (expected.containerIncludes !== undefined) {
      assert.match(asset.metadata.container ?? "", new RegExp(expected.containerIncludes));
    }
  }
}

async function assertMetadataPanel(window, entry) {
  await window.waitForSelector('[data-testid="metadata-panel"]');
  const text = await window.getByTestId("metadata-panel").innerText();

  assert.ok(text.includes("Type"));

  if (entry.family === "text") {
    assert.ok(text.includes("Lines"));
    assert.ok(text.includes("Words"));
    assert.ok(text.includes("Encoding"));
  }

  if (entry.family === "image" || entry.family === "gif") {
    assert.ok(text.includes("Dimensions"));
    assert.ok(text.includes("Format"));
  }

  if (entry.family === "video") {
    assert.ok(text.includes("Dimensions"));
    assert.ok(text.includes("Duration"));
    assert.ok(text.includes("Codec"));
  }
}

async function assertVisibleLabels(window, entry) {
  for (const label of entry.expectedOutput.visibleLabels ?? []) {
    await window.waitForSelector(`text=${label}`);
  }
}

async function assertTextViewport(window, entry) {
  await window.waitForSelector('[data-testid="text-body"]');
  await window.waitForFunction(
    (selector) => {
      function collectText(node) {
        let output = "";

        if (node.nodeType === Node.TEXT_NODE) {
          output += node.textContent ?? "";
        }

        if (node instanceof Element || node instanceof ShadowRoot || node instanceof DocumentFragment) {
          for (const child of node.childNodes) {
            output += collectText(child);
          }

          if (node instanceof Element && node.shadowRoot) {
            output += collectText(node.shadowRoot);
          }
        }

        return output;
      }

      const root = document.querySelector(selector);
      return root ? collectText(root).trim().length > 0 : false;
    },
    '[data-testid="text-body"]'
  );
  const text = await readDeepText(window, '[data-testid="text-body"]');
  if (entry.expectedOutput.excerpt && strictTextExcerptEntries.has(entry.id)) {
    assert.ok(text.includes(entry.expectedOutput.excerpt), `${entry.id} missing expected excerpt`);
  }
  if (entry.expectedOutput.excerptAbsent) {
    assert.ok(!text.includes(entry.expectedOutput.excerptAbsent), `${entry.id} rendered excluded excerpt`);
  }

  if (entry.expectedViewport.scrollable) {
    const hasScrollableDescendant = await window.evaluate(() => {
      function allNodes(root) {
        const nodes = [];
        if (!root) {
          return nodes;
        }

        nodes.push(root);
        if (root instanceof Element || root instanceof ShadowRoot || root instanceof DocumentFragment) {
          for (const child of root.childNodes) {
            nodes.push(...allNodes(child));
          }

          if (root instanceof Element && root.shadowRoot) {
            nodes.push(...allNodes(root.shadowRoot));
          }
        }

        return nodes;
      }

      const root = document.querySelector('[data-testid="text-viewport"]');
      if (!(root instanceof HTMLElement)) {
        return false;
      }

      return allNodes(root).some((node) => {
        if (!(node instanceof HTMLElement)) {
          return false;
        }

        const style = window.getComputedStyle(node);
        return node.scrollHeight > node.clientHeight && style.overflowY !== "visible";
      });
    });
    assert.equal(hasScrollableDescendant, true, `${entry.id} did not expose a scrollable text container`);
  }
}

async function assertImageViewport(window, kind = "image") {
  const selector =
    kind === "gif" ? '[data-testid="gif-viewport"]' : '[data-testid="image-viewport"]';
  await window.waitForSelector(selector);
  await window.waitForFunction(
    (currentKind) =>
      [
        ...document.querySelectorAll(
          currentKind === "gif"
            ? '[data-testid="gif-viewport"]'
            : '[data-testid="image-viewport"]'
        )
      ].every((node) =>
        node instanceof HTMLImageElement ? node.complete && node.naturalWidth > 0 : false
      ),
    kind
  );
}

async function assertVideoViewport(window) {
  await window.waitForSelector('[data-testid="video-viewport"]');
  await window.waitForFunction(() =>
    [...document.querySelectorAll('[data-testid="video-viewport"]')].every((node) =>
      node instanceof HTMLVideoElement ? node.readyState >= 1 : false
    )
  );
}

async function assertUnsupportedViewport(window) {
  await window.waitForSelector('[data-testid="unsupported-state"]');
}

async function assertGridViewport(window, entry) {
  await window.waitForSelector('[data-testid="grid-browser"]');
  await assertVisibleLabels(window, entry);
}

async function assertViewport(window, entry) {
  switch (entry.expectedViewport.kind) {
    case "text":
      await assertTextViewport(window, entry);
      break;
    case "image":
      await assertImageViewport(window);
      break;
    case "gif":
      await assertImageViewport(window, "gif");
      break;
    case "video":
      await assertVideoViewport(window);
      break;
    case "unsupported":
      await assertUnsupportedViewport(window);
      break;
    case "grid":
      await assertGridViewport(window, entry);
      break;
    default:
      break;
  }
}

async function assertSurface(window, entry, debug) {
  await window.waitForSelector(`[data-testid="surface-${entry.expectedSurface}"]`);
  assert.equal(debug.surface, entry.expectedSurface);

  if (entry.expectedSurface !== "grid") {
    await window.waitForSelector('[data-testid="compare-stage"]');
  }
}

async function runCompareSpecificAssertions(window, entry) {
  if (entry.scenario !== "compare") {
    return;
  }

  if (entry.family === "text") {
    await window.getByRole("button", { name: "Diff" }).click();
    await window.waitForSelector('[data-testid="diff-viewport"]');
    await window.waitForSelector("text=Text/code diff");
  }

  if (entry.family === "image" || entry.family === "gif") {
    await window.getByRole("button", { name: "Diff" }).click();
    await window.waitForSelector('[data-testid="diff-viewport"]');
    await window.waitForSelector("text=changed pixels");
  }

  if (entry.family === "video") {
    await window.waitForSelector("text=Sync Playback");
  }
}

async function maybeCaptureScreenshot(window, entry) {
  const screenshotName = entry.expectedViewport.screenshotName;
  if (!screenshotName) {
    return;
  }

  await window.screenshot({
    path: path.join(outputDir, screenshotName)
  });
}

async function run() {
  const initialEntry = manifest[0];
  const app = await electron.launch({
    args: [builtMainEntry()],
    cwd: appRoot,
    env: {
      ...process.env,
      PRESENTER_OPEN_PATHS_JSON: JSON.stringify(resolveScenarioPaths(initialEntry)),
      PRESENTER_TEST_MODE: "1"
    }
  });

  try {
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");

    for (const entry of manifest) {
      console.log(`Smoke scenario: ${entry.id}`);
      try {
        const debug = await openScenario(window, entry);
        assert.equal(
          debug.warnings.length,
          0,
          `${entry.id} reported unexpected load warnings: ${JSON.stringify(debug.warnings)}`
        );
        await assertSurface(window, entry, debug);
        if (entry.expectedSurface !== "grid") {
          await assertMetadataPanel(window, entry);
        }
        await assertVisibleLabels(window, entry);
        assertMetadata(entry, debug);
        await assertViewport(window, entry);
        await runCompareSpecificAssertions(window, entry);
        await maybeCaptureScreenshot(window, entry);
      } catch (error) {
        console.error(`Smoke scenario failed: ${entry.id}`);
        throw error;
      }
    }
  } finally {
    await app.close();
  }

  console.log(`Smoke artifacts written to ${outputDir}`);
}

await run();
