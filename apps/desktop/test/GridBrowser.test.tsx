import type { SessionRecord } from "@presenter/core";
import { fireEvent, render, screen } from "@testing-library/react";

import { GridBrowser } from "../src/renderer/components/GridBrowser";

const session: SessionRecord = {
  id: "grid-session",
  title: "Grid Session",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: "folders",
  entryPaths: ["/fixtures/grid-set"],
  hadFolderInput: true,
  assets: [
    {
      id: "one",
      name: "one.svg",
      path: "/fixtures/one.svg",
      extension: ".svg",
      family: "image",
      supported: true,
      previewable: true,
      metadata: {
        filename: "one.svg",
        path: "/fixtures/one.svg",
        extension: ".svg",
        fileTypeLabel: "SVG",
        sizeBytes: 1,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        family: "image",
        width: 100,
        height: 100,
        aspectRatio: 1,
        format: "svg"
      }
    },
    {
      id: "two",
      name: "two.svg",
      path: "/fixtures/two.svg",
      extension: ".svg",
      family: "image",
      supported: true,
      previewable: true,
      metadata: {
        filename: "two.svg",
        path: "/fixtures/two.svg",
        extension: ".svg",
        fileTypeLabel: "SVG",
        sizeBytes: 1,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        family: "image",
        width: 100,
        height: 100,
        aspectRatio: 1,
        format: "svg"
      }
    }
  ],
  selectedAssetIds: [],
  surface: "grid",
  view: {
    layout: "grid-3",
    background: "white",
    backgroundColor: "#ffffff",
    zoom: 1,
    fitMode: "fit",
    diffEnabled: false,
    syncPan: false,
    syncPlayback: true,
    metadataOpen: true,
    textDiffMode: "split",
    gridSort: "name",
    gridFilter: "all"
  }
};

describe("GridBrowser", () => {
  it("does not render the old grid intro copy", () => {
    render(
      <GridBrowser
        session={session}
        recentSessions={[]}
        onSelect={() => {}}
        onOpenRecent={() => {}}
      />
    );

    expect(screen.queryByText("Asset Browser")).toBeNull();
    expect(
      screen.queryByText(/Recursive folder intake lands here first/)
    ).toBeNull();
  });

  it("selects and deselects the visible grid set with keyboard shortcuts", () => {
    const selectCalls: string[][] = [];
    const { rerender } = render(
      <GridBrowser
        session={session}
        recentSessions={[]}
        onSelect={(assetIds) => selectCalls.push(assetIds)}
        onOpenRecent={() => {}}
      />
    );

    fireEvent.keyDown(window, { key: "a", metaKey: true });
    expect(selectCalls.at(-1)).toEqual(["one", "two"]);

    rerender(
      <GridBrowser
        session={{ ...session, selectedAssetIds: ["one", "two"] }}
        recentSessions={[]}
        onSelect={(assetIds) => selectCalls.push(assetIds)}
        onOpenRecent={() => {}}
      />
    );

    fireEvent.keyDown(window, { key: "a", metaKey: true, shiftKey: true });
    expect(selectCalls.at(-1)).toEqual([]);
  });

  it("uses an inner accent border for selected tiles", () => {
    render(
      <GridBrowser
        session={{ ...session, selectedAssetIds: ["one"] }}
        recentSessions={[]}
        onSelect={() => {}}
        onOpenRecent={() => {}}
      />
    );

    expect(screen.getAllByTestId("asset-card")[0]).toHaveClass("asset-tile-selected");
  });
});
