import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  defaultSessionViewState,
  getCompareCapability,
  buildSessionRecord,
  type AssetRecord,
  type FixtureExpectedMetadata,
  type FixtureManifestEntry
} from "@presenter/core";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

const { parseDiffFromFileMock } = vi.hoisted(() => ({
  parseDiffFromFileMock: vi.fn(
    (left: { contents: string }, right: { contents: string }) => ({
      left,
      right
    })
  )
}));

vi.mock("@pierre/diffs", () => ({
  getFiletypeFromFileName: (filename: string) =>
    filename.endsWith(".md") ? "markdown" : filename.endsWith(".ts") ? "typescript" : "text",
  parseDiffFromFile: parseDiffFromFileMock
}));

vi.mock("@pierre/diffs/react", () => ({
  File: ({ file }: { file: { contents: string } }) => (
    <pre data-testid="mock-file">{file.contents}</pre>
  ),
  FileDiff: ({ fileDiff }: { fileDiff: { left: { contents: string }; right: { contents: string } } }) => (
    <pre data-testid="mock-diff">{`${fileDiff.left.contents}\n---\n${fileDiff.right.contents}`}</pre>
  )
}));

import { GridBrowser } from "../src/renderer/components/GridBrowser";
import { CompareStage } from "../src/renderer/components/CompareStage";
import { MetadataPanel } from "../src/renderer/components/MetadataPanel";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureRoot = path.resolve(__dirname, "../../../test/fixtures/supported");
const manifest = JSON.parse(
  readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8")
) as FixtureManifestEntry[];

function resolveFixturePath(relativePath: string) {
  return path.join(fixtureRoot, relativePath);
}

function findEntry(id: string) {
  const entry = manifest.find((item) => item.id === id);
  if (!entry) {
    throw new Error(`Missing fixture manifest entry: ${id}`);
  }

  return entry;
}

function buildMetadata(
  family: AssetRecord["family"],
  relativePath: string,
  expected: FixtureExpectedMetadata
): AssetRecord["metadata"] {
  const absolutePath = resolveFixturePath(relativePath);
  const extension = path.extname(relativePath);
  const common = {
    filename: path.basename(relativePath),
    path: absolutePath,
    extension,
    fileTypeLabel: expected.fileTypeLabel ?? extension.slice(1).toUpperCase(),
    sizeBytes: 1,
    createdAt: new Date("2026-03-12T00:00:00.000Z").toISOString(),
    modifiedAt: new Date("2026-03-12T00:00:00.000Z").toISOString()
  };

  if (family === "text") {
    return {
      ...common,
      family: "text",
      lineCount: expected.lineCount ?? 1,
      wordCount: expected.wordCount ?? 1,
      characterCount: expected.characterCountMin ?? 1,
      encoding: expected.encoding ?? "utf-8"
    };
  }

  if (family === "image" || family === "gif") {
    return {
      ...common,
      family,
      width: expected.width ?? 160,
      height: expected.height ?? 96,
      aspectRatio:
        expected.width && expected.height
          ? Number((expected.width / expected.height).toFixed(4))
          : 1.6667,
      format: expected.format ?? extension.slice(1).toLowerCase()
    };
  }

  if (family === "video") {
    return {
      ...common,
      family: "video",
      width: expected.width ?? 160,
      height: expected.height ?? 96,
      aspectRatio:
        expected.width && expected.height
          ? Number((expected.width / expected.height).toFixed(4))
          : 1.6667,
      durationSeconds: expected.durationSecondsMin ?? 1.2,
      frameRate: 25,
      codec: expected.codec ?? "h264",
      container: expected.containerIncludes ?? "mp4"
    };
  }

  return {
    ...common,
    family: "unsupported"
  };
}

function buildAsset(relativePath: string, family: AssetRecord["family"], expected: FixtureExpectedMetadata): AssetRecord {
  const absolutePath = resolveFixturePath(relativePath);
  return {
    id: `asset-${path.basename(relativePath)}`,
    name: path.basename(relativePath),
    path: absolutePath,
    extension: path.extname(relativePath),
    family,
    supported: family !== "unsupported",
    previewable: family !== "unsupported",
    metadata: buildMetadata(family, relativePath, expected)
  };
}

describe("fixture-driven renderer coverage", () => {
  it("renders plain text output and metadata from a real fixture", () => {
    const entry = findEntry("text-plain-primary");
    const asset = buildAsset(entry.path, "text", entry.expectedMetadata);
    const content = readFileSync(resolveFixturePath(entry.path), "utf8");

    render(
      <>
        <CompareStage
          assets={[asset]}
          sessionView={{ ...defaultSessionViewState, layout: "single" }}
          capability={getCompareCapability([asset])}
          textContent={{ [asset.path]: content }}
          playbackCommand={null}
        />
        <MetadataPanel assets={[asset]} onDismiss={() => {}} />
      </>
    );

    expect(screen.getByTestId("text-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("text-body")).toHaveTextContent(
      entry.expectedOutput.excerpt ?? ""
    );
    expect(screen.getByTestId("metadata-panel")).toHaveTextContent("Lines");
    expect(screen.getByTestId("metadata-panel")).toHaveTextContent(
      String(entry.expectedMetadata.lineCount)
    );
  });

  it("renders text diff output from the real txt pair", () => {
    const entry = findEntry("text-plain-pair");
    const left = buildAsset(entry.path, "text", entry.expectedMetadata);
    const right = buildAsset(entry.variantPath ?? "", "text", entry.expectedMetadata);

    parseDiffFromFileMock.mockClear();
    const { rerender } = render(
      <CompareStage
        assets={[left, right]}
        sessionView={{ ...defaultSessionViewState, layout: "diff", textDiffMode: "split" }}
        capability={getCompareCapability([left, right])}
        textContent={{
          [left.path]: readFileSync(resolveFixturePath(entry.path), "utf8"),
          [right.path]: readFileSync(resolveFixturePath(entry.variantPath ?? ""), "utf8")
        }}
        playbackCommand={null}
      />
    );

    expect(screen.getByTestId("diff-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("diff-summary")).toHaveTextContent("Text/code diff");
    expect(screen.getByTestId("text-body")).toHaveTextContent("viewport honest");

    rerender(
      <CompareStage
        assets={[left, right]}
        sessionView={{ ...defaultSessionViewState, layout: "diff", textDiffMode: "unified" }}
        capability={getCompareCapability([left, right])}
        textContent={{
          [left.path]: readFileSync(resolveFixturePath(entry.path), "utf8"),
          [right.path]: readFileSync(resolveFixturePath(entry.variantPath ?? ""), "utf8")
        }}
        playbackCommand={null}
      />
    );

    expect(parseDiffFromFileMock).toHaveBeenCalledTimes(1);
  });

  it("renders HTML fixtures as source text, not executed markup", () => {
    const entry = findEntry("text-html-primary-html");
    const asset = buildAsset(entry.path, "text", entry.expectedMetadata);
    const content = readFileSync(resolveFixturePath(entry.path), "utf8");

    render(
      <CompareStage
        assets={[asset]}
        sessionView={{ ...defaultSessionViewState, layout: "single" }}
        capability={getCompareCapability([asset])}
        textContent={{ [asset.path]: content }}
        playbackCommand={null}
      />
    );

    expect(screen.getByTestId("text-body").textContent).toContain(
      "<section class=\"callout\">"
    );
  });

  it("renders image compare panes from the shared visual fixtures", () => {
    const entry = findEntry("image-png-pair");
    const left = buildAsset(entry.path, "image", entry.expectedMetadata);
    const right = buildAsset(entry.variantPath ?? "", "image", entry.expectedMetadata);

    render(
      <CompareStage
        assets={[left, right]}
        sessionView={{ ...defaultSessionViewState, layout: "side-by-side" }}
        capability={getCompareCapability([left, right])}
        textContent={{}}
        playbackCommand={null}
      />
    );

    expect(screen.getAllByTestId("image-viewport")).toHaveLength(2);
  });

  it("renders flat three-up and four-up compare layouts", () => {
    const threeUp = findEntry("image-three-up");
    const fourUp = findEntry("image-four-up");
    const threeAssets = threeUp.entryPaths.map((entryPath, index) =>
      buildAsset(
        entryPath,
        "image",
        index === 0 ? threeUp.expectedMetadata : { ...threeUp.expectedMetadata, fileTypeLabel: "JPG" }
      )
    );

    const { rerender } = render(
      <CompareStage
        assets={threeAssets}
        sessionView={{ ...defaultSessionViewState, layout: "grid-3" }}
        capability={getCompareCapability(threeAssets)}
        textContent={{}}
        playbackCommand={null}
      />
    );

    expect(screen.getByTestId("compare-stage")).toHaveClass("stage-grid-three");
    expect(screen.getAllByTestId("image-viewport")).toHaveLength(3);

    const fourAssets = fourUp.entryPaths.map((entryPath, index) =>
      buildAsset(
        entryPath,
        "image",
        index === 0 ? fourUp.expectedMetadata : { ...fourUp.expectedMetadata, fileTypeLabel: "JPG" }
      )
    );

    rerender(
      <CompareStage
        assets={fourAssets}
        sessionView={{ ...defaultSessionViewState, layout: "grid-4" }}
        capability={getCompareCapability(fourAssets)}
        textContent={{}}
        playbackCommand={null}
      />
    );

    expect(screen.getByTestId("compare-stage")).toHaveClass("stage-grid-four");
    expect(screen.getAllByTestId("image-viewport")).toHaveLength(4);
  });

  it("centers a single visual asset in fit mode", () => {
    const entry = findEntry("image-png-primary");
    const asset = buildAsset(entry.path, "image", entry.expectedMetadata);

    render(
      <CompareStage
        assets={[asset]}
        sessionView={{ ...defaultSessionViewState, layout: "single", fitMode: "fit", zoom: 1 }}
        capability={getCompareCapability([asset])}
        textContent={{}}
        playbackCommand={null}
      />
    );

    expect(screen.getByTestId("visual-media-shell")).toHaveClass("media-shell-centered");
    expect(screen.getAllByTestId("compare-stage")[0]).toHaveClass("stage-grid-single");
  });

  it("anchors a single visual asset to the origin when zoomed", () => {
    const entry = findEntry("image-png-primary");
    const asset = buildAsset(entry.path, "image", entry.expectedMetadata);

    render(
      <CompareStage
        assets={[asset]}
        sessionView={{ ...defaultSessionViewState, layout: "single", fitMode: "fit", zoom: 2 }}
        capability={getCompareCapability([asset])}
        textContent={{}}
        playbackCommand={null}
      />
    );

    expect(screen.getByTestId("visual-media-shell")).toHaveClass("media-shell-origin");
  });

  it("renders a direct-manipulation reveal handle instead of a native slider", () => {
    const entry = findEntry("image-png-pair");
    const left = buildAsset(entry.path, "image", entry.expectedMetadata);
    const right = buildAsset(entry.variantPath ?? "", "image", entry.expectedMetadata);

    render(
      <CompareStage
        assets={[left, right]}
        sessionView={{ ...defaultSessionViewState, layout: "reveal-vertical" }}
        capability={getCompareCapability([left, right])}
        textContent={{}}
        playbackCommand={null}
      />
    );

    expect(screen.getByTestId("reveal-handle")).toBeInTheDocument();
    expect(document.querySelector('input[type="range"]')).toBeNull();
  });

  it("renders video compare panes with media controls", () => {
    const entry = findEntry("video-mp4-pair");
    const left = buildAsset(entry.path, "video", entry.expectedMetadata);
    const right = buildAsset(entry.variantPath ?? "", "video", entry.expectedMetadata);

    render(
      <CompareStage
        assets={[left, right]}
        sessionView={{ ...defaultSessionViewState, layout: "side-by-side" }}
        capability={getCompareCapability([left, right])}
        textContent={{}}
        playbackCommand={null}
      />
    );

    const videos = screen.getAllByTestId("video-viewport");
    expect(videos).toHaveLength(2);
    videos.forEach((video) => {
      expect(video).toHaveAttribute("controls");
    });
  });

  it("shows a clear unsupported state in the grid browser", () => {
    const entry = findEntry("unsupported-pdf-primary");
    const asset = buildAsset(entry.path, "unsupported", entry.expectedMetadata);
    const session = buildSessionRecord({
      title: entry.id,
      assets: [asset],
      entryPaths: [resolveFixturePath(entry.path)],
      hadFolderInput: false,
      source: "files"
    });

    render(
      <GridBrowser
        session={session}
        recentSessions={[]}
        onSelect={() => {}}
        onViewChange={() => {}}
        onCompare={() => {}}
        onOpenFiles={() => {}}
        onOpenRecent={() => {}}
      />
    );

    expect(screen.getByTestId("unsupported-state")).toBeInTheDocument();
    expect(screen.getByText("document-primary.pdf")).toBeInTheDocument();
  });
});
