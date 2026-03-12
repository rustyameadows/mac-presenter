import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "presenter", {
  writable: true,
  value: {
    getBootstrap: async () => ({ currentSession: null, recentSessions: [] }),
    openFilesDialog: async () => ({ session: null, recentSessions: [] }),
    openFolderDialog: async () => ({ session: null, recentSessions: [] }),
    loadPaths: async () => ({ session: null, recentSessions: [] }),
    setSelection: async () => ({ session: null, recentSessions: [] }),
    openSelection: async () => ({ session: null, recentSessions: [] }),
    backToGrid: async () => ({ session: null, recentSessions: [] }),
    updateView: async () => ({ session: null, recentSessions: [] }),
    readTextAsset: async () => ({ path: "", content: "", encoding: "utf-8" }),
    openRecentSession: async () => ({ session: null, recentSessions: [] }),
    reopenCurrentSession: async () => ({ session: null, recentSessions: [] }),
    getMediaUrl: (assetPath: string) => assetPath,
    onSessionChanged: () => () => {}
  }
});
