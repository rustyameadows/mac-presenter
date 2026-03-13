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
  it("starts with compare disabled when nothing is selected", () => {
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

    expect(screen.getByRole("button", { name: "Compare Selected" })).toBeDisabled();
    expect(screen.getByTestId("grid-select-all")).toBeEnabled();
    expect(screen.getByTestId("grid-deselect-all")).toBeDisabled();
  });

  it("enables compare for a valid same-family selection", () => {
    const compareCalls: string[][] = [];
    render(
      <GridBrowser
        session={{ ...session, selectedAssetIds: ["one", "two"] }}
        recentSessions={[]}
        onSelect={() => {}}
        onViewChange={() => {}}
        onCompare={(assetIds) => compareCalls.push(assetIds)}
        onOpenFiles={() => {}}
        onOpenRecent={() => {}}
      />
    );

    const compareButton = screen.getByRole("button", { name: "Compare Selected" });
    expect(compareButton).toBeEnabled();
    fireEvent.click(compareButton);
    expect(compareCalls[0]).toEqual(["one", "two"]);
  });

  it("selects and deselects the visible grid set with buttons and shortcuts", () => {
    const selectCalls: string[][] = [];
    const { rerender } = render(
      <GridBrowser
        session={session}
        recentSessions={[]}
        onSelect={(assetIds) => selectCalls.push(assetIds)}
        onViewChange={() => {}}
        onCompare={() => {}}
        onOpenFiles={() => {}}
        onOpenRecent={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId("grid-select-all"));
    expect(selectCalls.at(-1)).toEqual(["one", "two"]);

    fireEvent.keyDown(window, { key: "a", metaKey: true });
    expect(selectCalls.at(-1)).toEqual(["one", "two"]);

    rerender(
      <GridBrowser
        session={{ ...session, selectedAssetIds: ["one", "two"] }}
        recentSessions={[]}
        onSelect={(assetIds) => selectCalls.push(assetIds)}
        onViewChange={() => {}}
        onCompare={() => {}}
        onOpenFiles={() => {}}
        onOpenRecent={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId("grid-deselect-all"));
    expect(selectCalls.at(-1)).toEqual([]);

    fireEvent.keyDown(window, { key: "a", metaKey: true, shiftKey: true });
    expect(selectCalls.at(-1)).toEqual([]);
  });
});
