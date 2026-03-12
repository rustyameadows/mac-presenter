import { BrowserWindow } from "electron";

export class WindowManager {
  private window: BrowserWindow | null = null;
  private quitting = false;

  setQuitting(): void {
    this.quitting = true;
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  createWindow(): BrowserWindow {
    if (this.window) {
      return this.window;
    }

    const window = new BrowserWindow({
      width: 1440,
      height: 920,
      minWidth: 960,
      minHeight: 680,
      show: false,
      backgroundColor: "#0f1116",
      titleBarStyle: "hiddenInset",
      autoHideMenuBar: true,
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    window.on("close", (event) => {
      if (!this.quitting) {
        event.preventDefault();
        window.hide();
      }
    });

    window.on("closed", () => {
      this.window = null;
    });

    window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    this.window = window;
    return window;
  }

  showWindow(): BrowserWindow {
    const window = this.createWindow();
    if (!window.isVisible()) {
      window.show();
    }
    if (window.isMinimized()) {
      window.restore();
    }
    window.focus();
    return window;
  }
}
