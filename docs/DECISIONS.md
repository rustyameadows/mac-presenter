# Decisions

## 2026-03-12

### Menubar-first shell
- The app is a dockless menubar utility first, not a normal dock app with an intake window.
- Dragging assets onto the tray icon is the primary intake path.

### One reusable presenter window
- A single BrowserWindow is created and reused.
- Closing the window hides it so the tray app remains resident.

### Split core exports
- Browser-safe compare/session logic is exported separately from Node-only metadata helpers.
- This keeps renderer bundles free of filesystem and ffprobe dependencies.

### Session model
- Persist the full current session plus lightweight recents.
- Do not add named saved workspaces in v1.
