import { contextBridge, ipcRenderer } from "electron";

import type {
  BootstrapPayload,
  ExportPackageResponse,
  PresenterDebugSnapshot,
  PresenterApi,
  SessionResponse,
  TextAssetPayload
} from "../common/contracts";

const api: PresenterApi = {
  getBootstrap: () =>
    ipcRenderer.invoke("presenter:get-bootstrap") as Promise<BootstrapPayload>,
  openFilesDialog: () =>
    ipcRenderer.invoke("presenter:open-files") as Promise<SessionResponse>,
  openFolderDialog: () =>
    ipcRenderer.invoke("presenter:open-folder") as Promise<SessionResponse>,
  loadPaths: (paths) =>
    ipcRenderer.invoke("presenter:load-paths", paths) as Promise<SessionResponse>,
  setSelection: (assetIds) =>
    ipcRenderer.invoke("presenter:set-selection", assetIds) as Promise<SessionResponse>,
  openSelection: (assetIds) =>
    ipcRenderer.invoke("presenter:open-selection", assetIds) as Promise<SessionResponse>,
  backToGrid: () =>
    ipcRenderer.invoke("presenter:back-to-grid") as Promise<SessionResponse>,
  updateView: (patch) =>
    ipcRenderer.invoke("presenter:update-view", patch) as Promise<SessionResponse>,
  readTextAsset: (assetPath) =>
    ipcRenderer.invoke("presenter:read-text-asset", assetPath) as Promise<TextAssetPayload>,
  downloadPackage: () =>
    ipcRenderer.invoke("presenter:download-package") as Promise<ExportPackageResponse>,
  openRecentSession: (id) =>
    ipcRenderer.invoke("presenter:open-recent", id) as Promise<SessionResponse>,
  reopenCurrentSession: () =>
    ipcRenderer.invoke("presenter:reopen-current") as Promise<SessionResponse>,
  getDebugState: () =>
    ipcRenderer.invoke("presenter:get-debug-state") as Promise<PresenterDebugSnapshot | null>,
  getMediaUrl: (assetPath) =>
    `presenter-media://asset?path=${encodeURIComponent(assetPath)}`,
  onSessionChanged: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: SessionResponse) => {
      listener(payload);
    };
    ipcRenderer.on("presenter:session-changed", handler);
    return () => {
      ipcRenderer.removeListener("presenter:session-changed", handler);
    };
  }
};

contextBridge.exposeInMainWorld("presenter", api);
