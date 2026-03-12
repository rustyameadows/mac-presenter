import { BrowserWindow, ipcMain } from "electron";

import type { SessionResponse } from "../common/contracts";
import { createMediaUrl } from "./protocol";
import { SessionService } from "./session-service";
import { WindowManager } from "./window-manager";
import { showOpenFilesDialog, showOpenFolderDialog } from "./tray";

export function registerIpc(input: {
  sessionService: SessionService;
  windowManager: WindowManager;
  broadcast: (response: SessionResponse) => void;
}) {
  ipcMain.handle("presenter:get-bootstrap", () => input.sessionService.getBootstrap());

  ipcMain.handle("presenter:open-files", async () => {
    const filePaths = await showOpenFilesDialog(input.windowManager.getWindow());
    const response = await input.sessionService.loadPaths(filePaths);
    input.broadcast(response);
    return response;
  });

  ipcMain.handle("presenter:open-folder", async () => {
    const filePaths = await showOpenFolderDialog(input.windowManager.getWindow());
    const response = await input.sessionService.loadPaths(filePaths);
    input.broadcast(response);
    return response;
  });

  ipcMain.handle("presenter:load-paths", async (_event, paths: string[]) => {
    const response = await input.sessionService.loadPaths(paths);
    input.broadcast(response);
    return response;
  });

  ipcMain.handle("presenter:set-selection", async (_event, assetIds: string[]) => {
    const response = await input.sessionService.setSelection(assetIds);
    input.broadcast(response);
    return response;
  });

  ipcMain.handle("presenter:open-selection", async (_event, assetIds: string[]) => {
    const response = await input.sessionService.openSelection(assetIds);
    input.broadcast(response);
    return response;
  });

  ipcMain.handle("presenter:back-to-grid", async () => {
    const response = await input.sessionService.backToGrid();
    input.broadcast(response);
    return response;
  });

  ipcMain.handle("presenter:update-view", async (_event, patch) => {
    const response = await input.sessionService.updateView(patch);
    input.broadcast(response);
    return response;
  });

  ipcMain.handle("presenter:read-text-asset", async (_event, assetPath: string) =>
    input.sessionService.readTextAsset(assetPath)
  );

  ipcMain.handle("presenter:open-recent", async (_event, id: string) => {
    const response = await input.sessionService.openRecentSession(id);
    input.broadcast(response);
    return response;
  });

  ipcMain.handle("presenter:reopen-current", async () => {
    const response = await input.sessionService.reopenCurrentSession();
    input.broadcast(response);
    return response;
  });

  ipcMain.handle("presenter:get-media-url", (_event, assetPath: string) =>
    createMediaUrl(assetPath)
  );
}

export function broadcastSessionResponse(response: SessionResponse): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("presenter:session-changed", response);
  });
}
