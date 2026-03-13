# Presenter

Presenter is a local-first macOS menubar app for reviewing and comparing local assets without bouncing between Finder, Preview, editors, and browser tools.

Drop in a file, a few versions, or a whole folder. Presenter routes you into the right view automatically:

- `1` asset: open it directly
- `2-4` compatible assets: jump straight into compare
- folder or `5+` assets: open the Grid Browser so you can filter, sort, and choose what to compare

## What It Is Good At

- Comparing image iterations side by side
- Reviewing generated batches from AI or creative tools
- Checking text and code revisions without opening an editor
- Scrubbing through local video exports in synced layouts
- Browsing large folders and quickly narrowing down the right assets

## Supported Files

Presenter is currently built for same-family comparison:

- Images: `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.bmp`
- GIFs: animated and static `.gif`
- Videos: `.mp4`, `.mov`, `.webm`, `.m4v` where Chromium playback is supported
- Text and code: `.txt`, `.md`, `.rtf`, `.js`, `.ts`, `.tsx`, `.jsx`, `.json`, `.html`, `.css`, `.rb`, `.py`, `.yml`, `.yaml`, `.xml`, `.toml`, `.ini`, `.sh`, `.c`, `.cc`, `.cpp`, `.go`, `.java`, `.swift`, `.rs`

Mixed folders are fine in the Grid Browser, but compare mode is intentionally same-family first: image with image, video with video, gif with gif, text/code with text/code.

## How It Works

Presenter lives in the macOS menu bar.

1. Drag files or folders onto the menu bar icon.
2. Or use Finder `Open With > Presenter` for supported files.
3. If the set is small and compatible, Presenter opens the Compare Workspace immediately.
4. If the set is larger, Presenter opens the Grid Browser so you can filter, sort, multi-select, and compare only what matters.
5. Close the window when you are done. The app stays resident in the menu bar for the next session.

There is also a manual fallback inside the window for `Open Files` and `Open Folder`.

## Compare Tools

- Single view, left/right, top/bottom, 3-up, and 4-up layouts
- Reveal compare for supported visual pairs
- Image diff with changed-pixel count and percentage
- Text/code diff view
- Zoom levels at `1x`, `2x`, `4x`, and `10x`
- Fit, fill, and actual-size viewing
- Checker, black, white, or custom canvas backgrounds
- Metadata overlay that does not disturb the compare layout
- Sync pan for visual comparisons
- Sync playback and frame-step for video pairs

## Current Boundaries

- macOS app
- Local-first only
- No cloud sync
- No collaboration or annotations
- TIFF files are currently treated as unsupported in the viewer

## Run It Locally

If you want to try the current app from this repo:

1. Install Node `24+` and npm `11+`
2. Run `npm install`
3. Run `npm start`

## More Detail

If you want the deeper product or UX spec, start with:

- [Product brief](docs/PRODUCT_BRIEF.md)
- [Menubar and compare UX](docs/UX_MENUBAR_AND_COMPARE.md)
