import { app, type Tray } from "electron";
import path from "node:path";

import { broadcastSessionResponse, registerIpc } from "./ipc";
import { registerMediaProtocol } from "./protocol";
import { SessionService } from "./session-service";
import { SessionStore } from "./session-store";
import { createPresenterTray, showOpenFilesDialog, showOpenFolderDialog } from "./tray";
import { WindowManager } from "./window-manager";

let presenterTray: Tray | null = null;

async function bootstrap(): Promise<void> {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  await app.whenReady();
  if (app.dock) {
    app.dock.hide();
  }

  await registerMediaProtocol();

  const store = new SessionStore(path.join(app.getPath("userData"), "session-state.json"));
  const sessionService = new SessionService(store);
  await sessionService.load();

  const windowManager = new WindowManager();
  windowManager.createWindow();

  const openFiles = async () => {
    const filePaths = await showOpenFilesDialog(windowManager.getWindow());
    const response = await sessionService.loadPaths(filePaths);
    broadcastSessionResponse(response);
    if (response.session) {
      windowManager.showWindow();
    }
  };

  const openFolder = async () => {
    const filePaths = await showOpenFolderDialog(windowManager.getWindow());
    const response = await sessionService.loadPaths(filePaths);
    broadcastSessionResponse(response);
    if (response.session) {
      windowManager.showWindow();
    }
  };

  registerIpc({
    sessionService,
    windowManager,
    broadcast: (response) => {
      broadcastSessionResponse(response);
      if (response.session) {
        windowManager.showWindow();
      }
    }
  });

  presenterTray = createPresenterTray({
    getWindow: () => windowManager.getWindow(),
    showWindow: () => windowManager.showWindow(),
    openFiles,
    openFolder,
    loadPaths: async (paths) => {
      const response = await sessionService.loadPaths(paths);
      broadcastSessionResponse(response);
      if (response.session) {
        windowManager.showWindow();
      }
    },
    recentSessions: () => sessionService.getBootstrap().recentSessions,
    openRecent: async (id) => {
      const response = await sessionService.openRecentSession(id);
      broadcastSessionResponse(response);
      if (response.session) {
        windowManager.showWindow();
      }
    },
    reopenCurrent: async () => {
      const response = await sessionService.reopenCurrentSession();
      broadcastSessionResponse(response);
      if (response.session) {
        windowManager.showWindow();
      } else {
        windowManager.showWindow();
      }
    },
    quit: () => {
      presenterTray?.destroy();
      windowManager.setQuitting();
      app.quit();
    }
  });

  const requestedPaths = process.env.PRESENTER_OPEN_PATHS_JSON;
  if (requestedPaths) {
    try {
      const parsed = JSON.parse(requestedPaths) as string[];
      const response = await sessionService.loadPaths(parsed, "restore");
      broadcastSessionResponse(response);
      if (response.session) {
        windowManager.showWindow();
      }
    } catch {
      // Ignore malformed fixture input and continue with the normal bootstrap path.
    }
  }

  const initial = sessionService.getBootstrap();
  if (initial.currentSession) {
    broadcastSessionResponse({
      session: initial.currentSession,
      recentSessions: initial.recentSessions,
      warnings: []
    });
    windowManager.showWindow();
  }

  app.on("second-instance", () => {
    windowManager.showWindow();
  });

  app.on("activate", () => {
    windowManager.showWindow();
  });

  app.on("before-quit", () => {
    presenterTray?.destroy();
    windowManager.setQuitting();
  });
}

void bootstrap();
