# Product Brief / Scope Doc  
## Mac App: Local Asset Presenter + Comparator  
**Working description:** A local-first Electron Mac app for opening files, folders, and groups of assets, then viewing, comparing, and diffing them in clean multi-asset layouts.

## 1. Product summary

This app helps users inspect and compare local assets quickly.

A user can drop in:
- a single file
- two files
- a small set of files
- a folder

The app then routes them into the right viewing flow:

- **1 to 4 assets:** go directly into comparison view
- **More than 4 assets or folder input:** open a grid browser first, then let the user select one or more assets to compare

The product is meant to be:
- local-first
- fast
- visually clean
- useful for creative, editorial, engineering, and production review workflows
- architected so the compare/render engine can later be extracted into a reusable library

## 2. Primary user problem

Today, comparing local assets usually means bouncing between Finder, Preview, code editors, image viewers, video players, or web tools. That breaks focus and makes precise comparison slow.

Users need one tool that can:
- ingest local files or folders
- present them consistently
- switch between compare layouts instantly
- expose simple file metadata side by side
- generate useful visual/text diffs
- support zoomed detail inspection without changing compare mode

## 3. Product goals

### Core goals
- Make local comparison of files and folders fast and obvious
- Support both quick visual inspection and structured diff review
- Handle mixed asset collections at intake, then guide users into compatible compare modes
- Keep the UI minimal and focused on the compared assets
- Separate app shell from compare/render logic so core functionality can become a library later

### Success criteria
A user should be able to:
- drop in assets and understand what happens immediately
- compare 1, 2, 3, or 4 assets without setup friction
- browse a larger set in a grid and move selected assets into compare view
- switch compare layouts without losing context
- inspect detail at 1x / 2x / 4x / 10x
- see basic file facts instantly
- create a meaningful visual diff for images and a meaningful diff view for text/code

## 4. Target users

Primary users:
- designers comparing iterations
- developers comparing code or generated files
- motion/video editors reviewing renders
- content teams comparing docs and revisions
- AI / creative-tool users reviewing many outputs side by side

## 5. First-pass supported asset types

### In scope for v1
- **Text docs**
  - `.txt`, `.md`, `.rtf` if feasible
- **Coding docs**
  - `.js`, `.ts`, `.tsx`, `.jsx`, `.json`, `.html`, `.css`, `.rb`, `.py`, `.yml`, etc.
- **Images**
  - `.png`, `.jpg`, `.jpeg`, `.webp`, possibly `.svg` via rasterized preview
- **Videos**
  - `.mp4`, `.mov`, `.webm` where supported by Electron/Chromium codecs
- **GIFs**
  - animated and static playback/render support

### v1 compatibility rule
Comparison should be **same-family first**:
- image ↔ image
- video ↔ video
- gif ↔ gif
- text/code ↔ text/code

Mixed-type sets can exist in the grid browser, but compare mode should only enable supported combinations.

## 6. Core user flows

### Flow A: 1 asset
1. User opens or drops one file
2. App detects type
3. App opens single-asset viewer
4. User can zoom, inspect metadata, change background, and switch layout only where relevant

### Flow B: 2 to 4 assets
1. User opens or drops 2 to 4 compatible files
2. App skips grid browser
3. App opens direct comparison view
4. User can switch display styles, zoom, inspect metadata, and use diff mode where supported

### Flow C: Folder or 5+ assets
1. User opens folder or drops many assets
2. App builds asset index
3. App opens grid browser
4. User sees thumbnails/previews/cards
5. User selects one or more assets
6. User enters comparison viewer
7. User can return to grid and change selection

## 7. Information architecture

## Main surfaces

### A. Intake surface
- drag and drop files/folders
- open dialog for files/folders
- recent sessions list

### B. Grid browser
Used when input set is large.

Features:
- responsive asset grid
- thumbnail / preview card
- filename
- type badge
- basic metadata preview
- multi-select
- “Compare selected” action
- sort: name, created date, modified date, size, type
- filter: asset type

### C. Comparison viewer
Main analysis space for 1 to 4 selected assets.

Layout rules:
- top rail
- main viewport
- asset labels under each rendered asset
- optional metadata strip / side panel

## 8. UI requirements

## Top rail
Per sketch and requirement:

### Left side
- viewport background control
  - checker
  - black
  - white
  - custom color picker

### Center / optional
- zoom control
  - 1x
  - 2x
  - 4x
  - 10x

### Right side
- display style switcher
- diff toggle where supported
- fit / fill / actual size
- sync pan toggle
- sync playback toggle for video/gif
- back to grid button when relevant

## Main viewport
- renders 1, 2, 3, or 4 selected assets
- asset names shown below each render area
- layout changes without losing selection
- zoom independent from display style
- panning available when zoomed in
- optional synchronized panning for visual compare modes

## 9. Comparison display styles

There are **6 compare display styles** for v1.

### 1. Left / right side by side
Best for:
- 2 visual assets
- 2 text/code docs
- 2 videos

### 2. Top / bottom side by side
Best for:
- portrait images
- mobile screenshots
- long text/code comparisons

### 3. Grid
Supports:
- 3-up
- 4-up

Best for:
- multiple iterations
- generated asset review
- quick pick workflows

### 4. Stacked assets with vertical reveal slider
Two visual assets stacked; draggable vertical divider reveals one over the other.

Best for:
- alignment checks
- subtle image changes
- paintovers / retouches

### 5. Stacked assets with horizontal reveal slider
Same as above, but horizontal reveal.

Best for:
- top/bottom change emphasis
- scans or portrait assets

### 6. Visual diff
Type-specific:
- **images:** pixel-based diff render
- **text/code:** line/word diff render

## 10. Diff feature scope

For image diffs, use **pixelmatch**. It is a JavaScript pixel-level image comparison library that works in Node and browsers, operates on raw image data, and requires matching dimensions between compared images. It supports sensitivity thresholding, anti-alias handling, and configurable diff colors, which fits this app’s image diff mode well. ([github.com](https://github.com/mapbox/pixelmatch))

For text/code diffs, use **@pierre/diffs / diffs.com** as the rendering layer. The library is positioned as a web diff and code rendering system, built on Shiki and designed to be highly customizable, which makes it a strong fit for readable text/code comparison views inside the Electron renderer. ([npmjs.com](https://www.npmjs.com/package/%40pierre/diffs?utm_source=chatgpt.com))

### Image diff requirements
- compare two images only
- normalize to same rendered dimensions before diffing
- expose threshold control later, but not required in v1 UI
- render diff result as its own compare mode
- optionally show mismatch count / changed-pixel summary

### Text/code diff requirements
- compare two text/code files only
- support side-by-side or unified diff rendering
- preserve syntax highlighting for code files
- support long file scrolling
- optionally highlight file stats above diff

### Non-goal for v1
- semantic AI diffing
- OCR-based comparison
- audio diffing
- video motion-diff engine beyond basic frame/poster comparison

## 11. File metadata comparison

The UI should surface simple file facts clearly and consistently.

### Common metadata
- filename
- path
- file type / extension
- file size
- created date
- modified date

### Text/code metadata
- character count
- line count
- word count
- encoding if available

### Image metadata
- pixel dimensions
- aspect ratio
- color profile if available later
- file format
- file size

### Video/GIF metadata
- duration
- dimensions
- frame rate if available
- codec/container if easily accessible
- file size

### Display requirement
Metadata should be:
- visible but secondary
- comparable side by side
- optionally collapsible

## 12. Zoom behavior

Zoom is independent from compare style.

Required zoom options:
- 1x
- 2x
- 4x
- 10x

### Zoom rules
- available for visual assets
- persists while switching layouts where practical
- pan enabled when zoom > 1x
- optional sync-pan toggle for side-by-side or stacked compare
- text/code docs should use text scaling / editor zoom equivalent, not bitmap zoom

## 13. Asset-type behavior by mode

## Images
Supported modes:
- single view
- left/right
- top/bottom
- 3-up / 4-up grid
- vertical reveal
- horizontal reveal
- visual diff

## GIFs
Supported modes:
- single view
- left/right
- top/bottom
- 3-up / 4-up grid
- reveal modes if rendered as synced animation layers is feasible
- fallback: paused frame / poster if layered playback is unstable

## Videos
Supported modes:
- single view
- left/right
- top/bottom
- 3-up / 4-up grid
- synchronized playback / pause / scrub
- reveal modes optional only if implementation is stable
- no true motion diff in v1

## Text docs / code docs
Supported modes:
- single view
- left/right
- top/bottom
- 3-up / 4-up grid for read-only review
- visual diff mode via text/code diff renderer
- reveal modes not applicable

## 14. Technical architecture direction

Because this may later become a reusable library, the product should be split into layers.

### Layer 1: Core compare/render package
A standalone TypeScript package that handles:
- file type detection
- asset model
- metadata extraction
- compare-mode availability rules
- image diff adapter
- text diff adapter
- zoom/pan state model
- selection/session model

### Layer 2: Electron app shell
Handles:
- native file/folder open
- drag and drop
- recent files/sessions
- local storage
- window management
- OS integration

### Layer 3: Renderer UI
Likely React-based.
Handles:
- grid browser
- compare viewer
- top rail controls
- panels
- keyboard shortcuts
- view state

### Layer 4: Asset adapters
Per-type preview pipeline:
- text/code renderer
- image renderer
- video renderer
- gif renderer

This structure keeps the Electron app thin and makes future reuse realistic.

## 15. Functional requirements

### Intake
- open file
- open multiple files
- open folder
- drag/drop support
- recursive folder scan optional, non-recursive acceptable for v1 if documented

### Session state
- retain selected assets in current session
- remember last compare style
- remember background setting
- remember zoom level where sensible

### Grid browser
- preview cards
- multi-select
- sort
- filter
- open compare

### Comparison viewer
- 1/2/3/4-up layouts
- background control
- zoom control
- display style switcher
- metadata comparison
- diff mode where supported
- back to grid

### Diffing
- image diff for image pairs
- text/code diff for text/code pairs
- unsupported combinations clearly disabled

## 16. Non-functional requirements

- local-first, no cloud dependency
- fast initial rendering for medium-size folders
- smooth switching between compare layouts
- responsive zoom/pan on large images where possible
- stable handling of large files with graceful fallback states
- clear empty/loading/error states

## 17. Edge cases / rules

- If only one asset is selected in grid, open single view
- If more than four are selected, either:
  - limit compare to four and prompt user to refine, or
  - support a compare tray but only render four at once  
  **Recommendation:** hard-cap rendered compare set to 4 in v1
- If image dimensions differ, diff mode should normalize before comparison and clearly note that normalization occurred
- If asset types are incompatible, compare CTA should be disabled with an explanation
- If a file cannot preview, still show metadata card and unsupported-preview state

## 18. Out of scope for v1

- annotations / comments
- cloud sync / sharing
- real-time collaboration
- AI summarization of differences
- audio files
- PDF deep support beyond simple fallback preview
- vector-native diffing
- video motion-analysis diff
- batch export of diff reports

## 19. Suggested v1 milestones

### Milestone 1: Foundation
- Electron shell
- file/folder intake
- asset model
- grid browser
- single asset viewer

### Milestone 2: Core compare
- 2-up / 3-up / 4-up layouts
- top rail
- background controls
- zoom controls
- metadata panel

### Milestone 3: Diff
- pixelmatch image diff
- text/code diff rendering
- compare eligibility rules
- unsupported-state messaging

### Milestone 4: Polish
- keyboard shortcuts
- recent sessions
- performance tuning
- empty/loading/error states
- packaging and Mac QA

## 20. Acceptance criteria for v1

The product is successful when a user can:
- drop in a folder of assets and browse them in a grid
- select up to 4 compatible assets and open compare view
- compare images, text/code, videos, and gifs in appropriate layouts
- switch between all 6 display styles where supported
- control viewport background color
- inspect asset names below each render
- view simple metadata side by side
- zoom visual assets at 1x / 2x / 4x / 10x
- generate image diffs and text/code diffs from the UI

## 21. Recommended product stance

This app should position itself as:

**“A fast local comparison workspace for creative and technical assets.”**

Not a DAM, not a code editor, not a full media manager.

Its strength is:
- intake simplicity
- clean compare modes
- strong visual/text diffing
- library-friendly architecture

## 22. Open product questions

- Should folder scan recurse into subfolders in v1?
- Should compare mode allow 3 assets in non-grid layouts, or route 3 assets only to grid/strip layouts?
- Should video compare include frame stepping in v1?
- Should GIFs be treated as animated media or flattened to poster-frame compare where needed?
- Should sessions be savable/reopenable in v1, or current-session only?
