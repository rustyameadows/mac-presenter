import path from "node:path";

import { supportedAssetExtensionsByFamily } from "@presenter/core";

import {
  createMacOpenFileIntake,
  createPresenterDocumentTypes
} from "../src/main/mac-open-file";

describe("macOS file-open integration", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("declares the exact supported extensions for Finder Open With", () => {
    const documentTypes = createPresenterDocumentTypes();

    expect(documentTypes).toHaveLength(1);
    expect(documentTypes[0]).toMatchObject({
      CFBundleTypeName: "Presenter Supported Asset",
      CFBundleTypeRole: "Viewer",
      LSHandlerRank: "Alternate"
    });

    const registeredExtensions = documentTypes[0].CFBundleTypeExtensions;
    const expectedExtensions = Object.values(supportedAssetExtensionsByFamily)
      .flat()
      .map((extension) => extension.slice(1));

    expect(registeredExtensions).toEqual(expectedExtensions);
    expect(registeredExtensions).not.toContain("tif");
    expect(registeredExtensions).not.toContain("tiff");
  });

  it("flushes launch-time file opens as one batch after the app is ready", async () => {
    const loadedBatches: string[][] = [];
    const intake = createMacOpenFileIntake({
      onPaths: async (paths) => {
        loadedBatches.push(paths);
      }
    });

    intake.queue("fixtures/alpha.png");
    intake.queue("./fixtures/alpha.png");
    intake.queue("fixtures/beta.png");

    await intake.setReady();

    expect(loadedBatches).toEqual([
      [path.resolve("fixtures/alpha.png"), path.resolve("fixtures/beta.png")]
    ]);
  });

  it("coalesces runtime open-file events into a single compare session load", async () => {
    vi.useFakeTimers();

    const loadedBatches: string[][] = [];
    const intake = createMacOpenFileIntake({
      batchWindowMs: 25,
      onPaths: async (paths) => {
        loadedBatches.push(paths);
      }
    });

    await intake.setReady();
    intake.queue("fixtures/alpha.png");
    intake.queue("fixtures/beta.png");

    expect(loadedBatches).toEqual([]);

    await vi.advanceTimersByTimeAsync(25);

    expect(loadedBatches).toEqual([
      [path.resolve("fixtures/alpha.png"), path.resolve("fixtures/beta.png")]
    ]);
  });
});
