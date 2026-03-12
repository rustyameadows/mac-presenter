import {
  Menu,
  Tray,
  dialog,
  nativeImage,
  type BrowserWindow,
  type OpenDialogOptions
} from "electron";

import type { RecentSessionSummary } from "@presenter/core";

function createTrayImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <rect x="2" y="2" width="14" height="14" rx="3" fill="black" />
      <rect x="5" y="5" width="8" height="8" rx="1.5" fill="white" />
      <path d="M9 6.3v5.4M6.3 9h5.4" stroke="black" stroke-width="1.4" stroke-linecap="round" />
    </svg>
  `;
  const image = nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
  );
  image.setTemplateImage(true);
  return image.resize({ width: 18, height: 18 });
}

export function createPresenterTray(input: {
  getWindow: () => BrowserWindow | null;
  showWindow: () => BrowserWindow;
  openFiles: () => Promise<void>;
  openFolder: () => Promise<void>;
  loadPaths: (paths: string[]) => Promise<void>;
  recentSessions: () => RecentSessionSummary[];
  openRecent: (id: string) => Promise<void>;
  reopenCurrent: () => Promise<void>;
  quit: () => void;
}): Tray {
  const tray = new Tray(createTrayImage());
  tray.setToolTip("Presenter");

  const showContextMenu = () => {
    const recentItems = input.recentSessions().slice(0, 10).map((recent) => ({
      label: recent.title,
      click: () => {
        void input.openRecent(recent.id);
      }
    }));

    const menu = Menu.buildFromTemplate([
      {
        label: "Open Files",
        click: () => {
          void input.openFiles();
        }
      },
      {
        label: "Open Folder",
        click: () => {
          void input.openFolder();
        }
      },
      { type: "separator" },
      {
        label: "Reopen Current",
        click: () => {
          void input.reopenCurrent();
        }
      },
      {
        label: "Recent Sessions",
        submenu:
          recentItems.length > 0
            ? recentItems
            : [{ label: "No recent sessions", enabled: false }]
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => input.quit()
      }
    ]);

    tray.popUpContextMenu(menu);
  };

  tray.on("click", () => {
    input.showWindow();
  });

  tray.on("right-click", showContextMenu);

  tray.on("drop-files", (_event, files) => {
    void input.loadPaths(files);
  });

  tray.on("drag-enter", () => {
    tray.setTitle("Drop");
  });

  tray.on("drag-leave", () => {
    tray.setTitle("");
  });

  tray.on("drag-end", () => {
    tray.setTitle("");
  });

  return tray;
}

export async function showOpenFilesDialog(window: BrowserWindow | null): Promise<
  string[]
> {
  const options: OpenDialogOptions = {
    title: "Open files to compare",
    properties: ["openFile", "multiSelections"]
  };
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);

  return result.canceled ? [] : result.filePaths;
}

export async function showOpenFolderDialog(window: BrowserWindow | null): Promise<
  string[]
> {
  const options: OpenDialogOptions = {
    title: "Open folder to compare",
    properties: ["openDirectory"]
  };
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);

  return result.canceled ? [] : result.filePaths;
}
