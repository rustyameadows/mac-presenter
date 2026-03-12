# Architecture

## Workspace Shape
- `apps/desktop`: Electron shell, preload bridge, renderer UI, Forge packaging, smoke automation.
- `packages/core`: reusable compare/session logic and Node-side metadata helpers.

## Runtime Layers
### Core
- Asset family detection
- Compare eligibility and routing
- Session/view state helpers
- Image diff normalization plan
- Persistence summary helpers

### Electron Main
- Menubar tray lifecycle
- Native file/folder dialogs
- Recursive intake and asset indexing
- Session persistence in `userData/session-state.json`
- Read-only media protocol for local file rendering

### Preload
- Typed bridge for intake, session updates, text reads, recents, and view updates
- Renderer remains `contextIsolation` on with no direct Node access

### Renderer
- Grid browser for folder or `>4` asset flows
- Single/compare workspace for `1-4` compatible assets
- Top rail controls for background, zoom, layout, diff, fit mode, sync, and metadata
- Collapsible side metadata panel

## Windowing Model
- The app is a dockless menubar utility (`LSUIElement=true`)
- One hidden BrowserWindow is created at startup and reused for all sessions
- Closing the window hides it; quitting happens from the tray menu or app quit events

## Intake Flow
1. Files or folders are dropped on the tray icon, or opened via the tray menu.
2. Main process expands folders recursively and builds asset records.
3. Core routing decides the starting surface:
   - `1` asset -> single viewer
   - `2` assets -> side-by-side compare
   - `3` assets -> 3-up compare
   - `4` assets -> 4-up compare
   - folder input, `>4`, or incompatible selection -> grid browser
4. Main persists the current session and updates recents.
5. Renderer receives a session event and updates in place.

## Security Boundaries
- Renderer gets media via `presenter-media://...`
- Text content is fetched through preload IPC only
- No cloud calls or remote content are required for the app workflow

## Packaging
- Electron Forge with webpack bundles the main, preload, and renderer
- Apple Silicon packaging target is the default build contract
- `npm run package:mac` produces the unsigned `.app` and zipped distribution
