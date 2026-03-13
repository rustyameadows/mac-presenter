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
- flat asset wall with thin dividers
- multi-select
- initial folder/grid intake starts with no selected assets
- `Select All` and `Deselect All` actions operate on the currently visible filtered set
- `Cmd+A` selects all visible filtered assets and `Cmd+Shift+A` clears them
- sort and filter controls
- compare button with eligibility feedback in the header
- recent sessions list below the asset wall

## Compare Workspace
Used when:
- one asset is active for single view
- two to four compatible assets are active for direct review

Presentation model:
- the chosen background drives the full renderer canvas
- the default background is white
- viewer layouts use one continuous field with thin dividers instead of pane cards
- asset names appear as subtle overlay labels inside each region
- visual panes own their own scroll behavior once zoomed content exceeds the viewport

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

Visual rules:
- the rail sits directly on the active canvas color
- controls use compact monochrome states with contrast based on the current background
- session notices stay lightweight and do not create heavy chrome
- zoom changes preserve the current visual viewport center instead of snapping back to the origin

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
- wrapped content with scroll contained inside the text region instead of the page

## Metadata Presentation
- asset labels stay with each viewport
- full metadata opens in a non-reflowing overlay sheet
- unsupported files still appear with metadata cards in grid mode
