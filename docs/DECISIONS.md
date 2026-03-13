# Decisions

## 2026-03-13

### Session share package export
- Added a persistent top-rail `Share` CTA that creates a local zip export for the active Session.
- Export payload includes original assets plus a lightweight static `index.html` viewer so handoffs are browsable via local file URL (`file://`).
- Static viewer keeps Presenter-adjacent visual affordances (background modes and single/split layout) while intentionally omitting app-only interactive tooling such as diffing.

### Packaged file-open integration
- The packaged macOS app now declares the same supported extensions as the app support contract so Finder can offer `Open With > Presenter`.
- macOS `open-file` events are batched into one intake load so multi-file Finder selections reopen as one Presenter session instead of one window update per file.

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

### Manifest-driven support contract
- Supported asset coverage is defined by the committed fixture corpus in `test/fixtures/supported/`.
- The fixture manifest is shared by core tests, renderer tests, and built Electron smoke so support claims are validated end to end.
- Adding a new supported extension now requires adding committed fixtures and manifest coverage in the same change.

### Test-only debug bridge
- A debug snapshot bridge is exposed only when `PRESENTER_TEST_MODE` is enabled.
- It reports the current routed surface, selected assets, compare capability, and intake warnings so smoke automation can validate behavior without weakening production security boundaries.

### TIFF remains unsupported
- The app can inspect TIFF metadata, but Electron/Chromium does not render TIFF assets reliably in the shipped viewer surface.
- `.tif` and `.tiff` are therefore treated as unsupported in the current support contract and are covered by unsupported-state fixtures instead of preview fixtures.

### Flat-canvas renderer
- The viewer, grid browser, and empty state now use a shared flat canvas language instead of pane cards and layered chrome.
- White is the default session background, while checker, black, white, and custom remain available as persisted options.
- Metadata now opens as an overlay sheet so compare layouts never reflow when detailed info is shown.

### Grid-first refinement behavior
- Sessions that route to the grid browser now start with no selected assets instead of auto-selecting the full intake set.
- Bulk selection is explicit through `Select All`, `Deselect All`, `Cmd+A`, and `Cmd+Shift+A`, scoped to the currently visible filtered assets.

### Measured visual zoom
- Visual panes use a real scrollable media canvas instead of transform-only scaling.
- Zoom steps preserve the current viewport center, while fit mode still centers content that fully fits.
- Grid, text, diff, and zoomed visual surfaces each own their own inner scrolling instead of relying on page scroll.
