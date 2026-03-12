# Testing Protocol

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:electron`
- `npm run package:mac`

## Automated Coverage
### Core
- asset family detection
- compare eligibility
- routing decisions
- recent-session updates
- image normalization plan

### Renderer
- grid compare CTA gating
- top rail control availability
- text diff toggle path
- video playback controls wiring

### Built Smoke
Smoke uses the compiled Forge bundle with deterministic fixture paths injected through:
- `PRESENTER_OPEN_PATHS_JSON`

Scenarios:
- two-image compare and diff
- folder intake to grid browser
- two-text diff

Artifacts are written to:
- `output/playwright/`

## Manual QA
- drag two image files onto the menubar icon and confirm direct 2-up open
- drag a folder and confirm grid browser routing
- verify closing the presenter window hides it without quitting the tray app
- verify the menubar app has no Dock icon

## Handoff Expectations
- include the packaged `.app` and `.zip` paths
- include fresh screenshots from the changed renderer surfaces
- note any manual-only checks that were not fully automatable
