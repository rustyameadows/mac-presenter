# UX: Menubar And Compare

## Primary Entry Point
- The menubar icon is the default starting surface.
- Dragging files or folders onto the tray should feel immediate and bypass extra intake UI.
- Left click reopens the active presenter window.
- Right click opens the native menu for fallback actions and recents.

## Grid Browser
Used when:
- a folder is dropped/opened
- more than four assets are provided
- the intake set is incompatible for direct compare

Features:
- responsive preview card grid
- multi-select
- sort and filter controls
- compare button with eligibility feedback
- recent sessions sidebar

## Compare Workspace
Used when:
- one asset is active for single view
- two to four compatible assets are active for direct review

Layout modes:
- single
- left / right
- top / bottom
- 3-up
- 4-up
- vertical reveal
- horizontal reveal
- diff

## Top Rail
Controls:
- checker, black, white, custom background
- zoom `1x`, `2x`, `4x`, `10x`
- layout buttons
- diff toggle
- fit / fill / actual size
- sync pan for visual pairs
- sync playback and frame-step for video pairs
- metadata toggle
- back to grid when relevant

## Family-Specific Behavior
### Images
- all visual compare layouts
- pixel diff

### GIFs
- same compare layouts as images where browser playback is reliable
- reveal/diff use poster-style rendering when live layered playback is unstable

### Videos
- single, side-by-side, top-bottom, 3-up, 4-up
- synced play / pause / scrub / frame-step
- no reveal and no motion diff

### Text / Code
- single, side-by-side, top-bottom, 3-up, 4-up
- diff via `@pierre/diffs`
- syntax-aware rendering when language detection is available

## Metadata Presentation
- asset labels stay with each viewport
- full metadata lives in a collapsible side panel
- unsupported files still appear with metadata cards in grid mode
