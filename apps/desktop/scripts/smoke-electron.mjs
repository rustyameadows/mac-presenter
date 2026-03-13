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
  return openPaths(window, resolvedPaths, entry.expectedSurface, entry.expectedSelection, entry.id);
}

async function openPaths(window, resolvedPaths, expectedSurface, expectedSelection, debugLabel = "scenario") {
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
      expectedSurface,
      expectedSelection
    }
  );

  const debug = await getDebugState(window);
  assert(debug, `Missing debug state for ${debugLabel}`);
  assert.equal(debug.enabled, true, `Debug state disabled for ${debugLabel}`);
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
  const metadataPanelsBeforeToggle = await window.locator('[data-testid="metadata-panel"]').count();
  assert.equal(metadataPanelsBeforeToggle, 0, `${entry.id} should start with metadata hidden`);

  const stageWidthBefore = await window.evaluate(() => {
    const stage = document.querySelector('[data-testid="compare-stage"]');
    return stage instanceof HTMLElement ? stage.getBoundingClientRect().width : null;
  });

  await window.getByRole("button", { name: "Show Metadata" }).click();
  await window.waitForSelector('[data-testid="metadata-overlay"]');
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

  const stageWidthAfter = await window.evaluate(() => {
    const stage = document.querySelector('[data-testid="compare-stage"]');
    return stage instanceof HTMLElement ? stage.getBoundingClientRect().width : null;
  });

  assert.equal(stageWidthAfter, stageWidthBefore, `${entry.id} metadata overlay reflowed the stage`);

  await window.getByRole("button", { name: "Hide Metadata" }).click();
  await window.waitForFunction(
    () => document.querySelector('[data-testid="metadata-panel"]') === null
  );
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

async function assertGridCanScroll(window) {
  const before = await window.evaluate(() => {
    const grid = document.querySelector('[data-testid="grid-browser"]');
    if (!(grid instanceof HTMLElement)) {
      return null;
    }

    const maxScrollTop = Math.max(0, grid.scrollHeight - grid.clientHeight);
    grid.scrollTop = Math.min(160, maxScrollTop);

    return {
      scrollHeight: grid.scrollHeight,
      clientHeight: grid.clientHeight,
      scrollTop: grid.scrollTop
    };
  });

  assert(before, "Missing grid browser");
  assert.ok(before.scrollHeight > before.clientHeight, "Grid surface did not expose vertical overflow");
  assert.ok(before.scrollTop > 0, "Grid surface did not scroll");
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

async function assertWorkspaceFill(window, entry) {
  if (entry.expectedSurface === "grid") {
    return;
  }

  const widths = await window.evaluate(() => {
    const workspace = document.querySelector('[data-testid="workspace-shell"]');
    const stage = workspace?.firstElementChild;

    if (!(workspace instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
      return null;
    }

    return {
      workspaceWidth: workspace.getBoundingClientRect().width,
      stageWidth: stage.getBoundingClientRect().width
    };
  });

  assert(widths, `${entry.id} missing workspace shell`);
  assert.ok(
    widths.stageWidth >= widths.workspaceWidth * 0.9,
    `${entry.id} left an oversized empty gutter`
  );
}

async function assertSingleRowToolbar(window) {
  await window.waitForSelector('[data-testid="top-rail-main"]');
  const toolbar = await window.evaluate(() => {
    const main = document.querySelector('[data-testid="top-rail-main"]');
    if (!(main instanceof HTMLElement)) {
      return null;
    }

    const tops = [...main.children]
      .filter((node) => node instanceof HTMLElement)
      .map((node) => Math.round(node.getBoundingClientRect().top));

    return {
      tops
    };
  });

  assert(toolbar, "Missing top rail main row");
  assert.equal(new Set(toolbar.tops).size, 1, "Top rail controls wrapped onto multiple rows");
}

async function assertMacTitlebarInset(window) {
  if (process.platform !== "darwin") {
    return;
  }

  const toolbar = await window.evaluate(() => {
    const main = document.querySelector('[data-testid="top-rail-main"]');
    return main instanceof HTMLElement
      ? { top: Math.round(main.getBoundingClientRect().top) }
      : null;
  });

  assert(toolbar, "Missing top rail main row");
  assert.ok(toolbar.top >= 28, "Top rail sits too close to macOS traffic lights");
}

async function assertCenteredFitImage(window) {
  const geometry = await window.evaluate(() => {
    const viewport = document.querySelector('[data-testid="asset-viewport"]');
    const image = document.querySelector('[data-testid="image-viewport"]');
    if (!(viewport instanceof HTMLElement) || !(image instanceof HTMLElement)) {
      return null;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();

    return {
      horizontalDelta: Math.abs(
        (imageRect.left - viewportRect.left) - (viewportRect.right - imageRect.right)
      ),
      verticalDelta: Math.abs(
        (imageRect.top - viewportRect.top) - (viewportRect.bottom - imageRect.bottom)
      )
    };
  });

  assert(geometry, "Missing single-image geometry");
  assert.ok(geometry.horizontalDelta <= 20, "Single image is not horizontally centered");
  assert.ok(geometry.verticalDelta <= 20, "Single image is not vertically centered");
}

async function assertZoomPreservesViewportCenter(window) {
  const readFrameCenter = () =>
    window.evaluate(() => {
      const viewport = document.querySelector('[data-testid="asset-viewport"]');
      const frame = document.querySelector('[data-testid="visual-media-frame"]');
      if (!(viewport instanceof HTMLElement) || !(frame instanceof HTMLElement)) {
        return null;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const frameContentLeft =
        viewport.scrollLeft + (frameRect.left - viewportRect.left);
      const frameContentTop =
        viewport.scrollTop + (frameRect.top - viewportRect.top);

      return {
        centerX:
          frameRect.width > 0
            ? (viewport.scrollLeft + viewport.clientWidth / 2 - frameContentLeft) /
              frameRect.width
            : 0.5,
        centerY:
          frameRect.height > 0
            ? (viewport.scrollTop + viewport.clientHeight / 2 - frameContentTop) /
              frameRect.height
            : 0.5
      };
    });

  await window.getByRole("button", { name: "2x" }).click();
  await window.waitForFunction(() => {
    const viewport = document.querySelector('[data-testid="asset-viewport"]');
    return (
      viewport instanceof HTMLElement &&
      viewport.scrollWidth > viewport.clientWidth &&
      viewport.scrollHeight > viewport.clientHeight
    );
  });

  const centered = await readFrameCenter();
  assert(centered, "Missing zoomed image geometry");
  assert.ok(Math.abs(centered.centerX - 0.5) <= 0.03, "2x zoom drifted off the image center horizontally");
  assert.ok(Math.abs(centered.centerY - 0.5) <= 0.03, "2x zoom drifted off the image center vertically");

  const before = await window.evaluate(() => {
    const viewport = document.querySelector('[data-testid="asset-viewport"]');
    const frame = document.querySelector('[data-testid="visual-media-frame"]');
    if (!(viewport instanceof HTMLElement) || !(frame instanceof HTMLElement)) {
      return null;
    }

    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) * 0.25;
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) * 0.2;

    const viewportRect = viewport.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const frameContentLeft =
      viewport.scrollLeft + (frameRect.left - viewportRect.left);
    const frameContentTop =
      viewport.scrollTop + (frameRect.top - viewportRect.top);

    return {
      centerX:
        frameRect.width > 0
          ? (viewport.scrollLeft + viewport.clientWidth / 2 - frameContentLeft) /
            frameRect.width
          : 0.5,
      centerY:
        frameRect.height > 0
          ? (viewport.scrollTop + viewport.clientHeight / 2 - frameContentTop) /
            frameRect.height
          : 0.5
    };
  });

  assert(before, "Missing zoom frame center before 4x");

  await window.getByRole("button", { name: "4x" }).click();
  await window.waitForFunction(() => {
    const viewport = document.querySelector('[data-testid="asset-viewport"]');
    return viewport instanceof HTMLElement && viewport.scrollWidth > viewport.clientWidth;
  });

  const after = await window.evaluate(() => {
    const viewport = document.querySelector('[data-testid="asset-viewport"]');
    const frame = document.querySelector('[data-testid="visual-media-frame"]');
    if (!(viewport instanceof HTMLElement) || !(frame instanceof HTMLElement)) {
      return null;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const frameContentLeft =
      viewport.scrollLeft + (frameRect.left - viewportRect.left);
    const frameContentTop =
      viewport.scrollTop + (frameRect.top - viewportRect.top);

    return {
      centerX:
        frameRect.width > 0
          ? (viewport.scrollLeft + viewport.clientWidth / 2 - frameContentLeft) /
            frameRect.width
          : 0.5,
      centerY:
        frameRect.height > 0
          ? (viewport.scrollTop + viewport.clientHeight / 2 - frameContentTop) /
            frameRect.height
          : 0.5
    };
  });

  assert(after, "Missing zoom frame center after 4x");
  assert.ok(Math.abs(after.centerX - before.centerX) <= 0.03, "4x zoom reset horizontal viewport center");
  assert.ok(Math.abs(after.centerY - before.centerY) <= 0.03, "4x zoom reset vertical viewport center");
}

async function assertWrappedTextDiff(window) {
  const wrapMetrics = await window.evaluate(() => {
    const body = document.querySelector('[data-testid="text-body"]');
    const viewport = document.querySelector('[data-testid="diff-viewport"]');
    if (!(body instanceof HTMLElement) || !(viewport instanceof HTMLElement)) {
      return null;
    }

    return {
      bodyClientWidth: body.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      viewportClientWidth: viewport.clientWidth,
      viewportScrollWidth: viewport.scrollWidth
    };
  });

  assert(wrapMetrics, "Missing wrapped text diff viewport");
  assert.ok(
    wrapMetrics.bodyScrollWidth <= wrapMetrics.bodyClientWidth + 4,
    "Text diff body still overflows horizontally instead of wrapping"
  );
  assert.ok(
    wrapMetrics.viewportScrollWidth <= wrapMetrics.viewportClientWidth + 4,
    "Text diff viewport still overflows horizontally instead of wrapping"
  );
}

async function assertGridSelectionControls(window, entry) {
  const debug = await openScenario(window, entry);
  assert.equal(debug.selectedAssetIds.length, 0, "Folder grid should start deselected");
  assert.equal(
    await window.getByRole("button", { name: "Compare Selected" }).isDisabled(),
    true,
    "Compare should stay disabled with no grid selection"
  );

  await window.getByRole("combobox", { name: "Grid Filter" }).selectOption("image");
  await window.getByTestId("grid-select-all").click();
  await window.waitForFunction(async () => {
    const state = await window.presenter.getDebugState();
    return JSON.stringify(state?.selectedAssetNames ?? []) === JSON.stringify(["png-primary.png"]);
  });

  await window.keyboard.press("Meta+Shift+A");
  await window.waitForFunction(async () => {
    const state = await window.presenter.getDebugState();
    return (state?.selectedAssetIds ?? []).length === 0;
  });

  await window.getByTestId("grid-deselect-all").waitFor();
  await window.keyboard.press("Meta+A");
  await window.waitForFunction(async () => {
    const state = await window.presenter.getDebugState();
    return JSON.stringify(state?.selectedAssetNames ?? []) === JSON.stringify(["png-primary.png"]);
  });

  await assertGridCanScroll(window);
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

  if (entry.family === "text" && entry.entryPaths.length === 2) {
    await window.getByRole("button", { name: "Diff" }).click();
    await window.waitForSelector('[data-testid="diff-viewport"]');
    await window.waitForSelector("text=Text/code diff");
  }

  if ((entry.family === "image" || entry.family === "gif") && entry.entryPaths.length === 2) {
    await window.getByRole("button", { name: "Diff" }).click();
    await window.waitForSelector('[data-testid="diff-viewport"]');
    await window.waitForSelector("text=changed pixels");
  }

  if (entry.family === "video") {
    await window.getByRole("button", { name: "Sync Playback" }).waitFor();
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
        await assertWorkspaceFill(window, entry);
        await runCompareSpecificAssertions(window, entry);
        await maybeCaptureScreenshot(window, entry);
      } catch (error) {
        console.error(`Smoke scenario failed: ${entry.id}`);
        throw error;
      }
    }

    const toolbarScenario = manifest.find((entry) => entry.id === "text-plain-pair");
    const gridSelectionScenario = manifest.find((entry) => entry.id === "folder-mixed-grid-set");
    const imageScenario = manifest.find((entry) => entry.id === "image-png-primary");

    if (toolbarScenario) {
      await openScenario(window, toolbarScenario);
      await window.setViewportSize({ width: 960, height: 720 });
      await assertSingleRowToolbar(window);
      await assertMacTitlebarInset(window);
      await window.screenshot({
        path: path.join(outputDir, "top-rail-960.png")
      });
    }

    const longWrapPaths = [
      path.join(fixtureRoot, "text", "longer-markdown-demo.md"),
      path.join(fixtureRoot, "text", "longer-markdown-demo-variant.md")
    ];
    await openPaths(
      window,
      longWrapPaths,
      "compare",
      ["longer-markdown-demo.md", "longer-markdown-demo-variant.md"],
      "long-markdown-wrap-check"
    );
    await window.getByRole("button", { name: "Diff" }).click();
    await window.waitForSelector('[data-testid="diff-viewport"]');
    await assertWrappedTextDiff(window);

    if (gridSelectionScenario) {
      await assertGridSelectionControls(window, gridSelectionScenario);
    }

    if (imageScenario) {
      await openScenario(window, imageScenario);
      await assertCenteredFitImage(window);
      await window.screenshot({
        path: path.join(outputDir, "single-image-fit.png")
      });
      await assertZoomPreservesViewportCenter(window);
      await window.screenshot({
        path: path.join(outputDir, "single-image-origin.png")
      });
      await window.getByRole("button", { name: "Show Metadata" }).click();
      await window.waitForSelector('[data-testid="metadata-panel"]');
      await window.screenshot({
        path: path.join(outputDir, "metadata-overlay-open.png")
      });
    }
  } finally {
    await app.close();
  }

  console.log(`Smoke artifacts written to ${outputDir}`);
}

await run();
