import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "presenter", {
  writable: true,
  value: {
    getBootstrap: async () => ({ currentSession: null, recentSessions: [] }),
    openFilesDialog: async () => ({ session: null, recentSessions: [], warnings: [] }),
    openFolderDialog: async () => ({ session: null, recentSessions: [], warnings: [] }),
    loadPaths: async () => ({ session: null, recentSessions: [], warnings: [] }),
    setSelection: async () => ({ session: null, recentSessions: [], warnings: [] }),
    openSelection: async () => ({ session: null, recentSessions: [], warnings: [] }),
    backToGrid: async () => ({ session: null, recentSessions: [], warnings: [] }),
    updateView: async () => ({ session: null, recentSessions: [], warnings: [] }),
    readTextAsset: async () => ({ path: "", content: "", encoding: "utf-8" }),
    downloadPackage: async () => ({ canceled: true }),
    openRecentSession: async () => ({ session: null, recentSessions: [], warnings: [] }),
    reopenCurrentSession: async () => ({ session: null, recentSessions: [], warnings: [] }),
    getDebugState: async () => null,
    getMediaUrl: (assetPath: string) => assetPath,
    onSessionChanged: () => () => {}
  }
});
