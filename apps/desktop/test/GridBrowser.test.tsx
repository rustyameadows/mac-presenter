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
  selectedAssetIds: ["one", "two"],
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
  it("enables compare for a valid same-family selection", () => {
    const compareCalls: string[][] = [];
    render(
      <GridBrowser
        session={session}
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
});
