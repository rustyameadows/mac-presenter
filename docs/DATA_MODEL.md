# Data Model

## Asset Family
- `image`
- `gif`
- `video`
- `text`
- `unsupported`

## Asset Record
- `id`: stable hash of the source path
- `name`, `path`, `extension`
- `family`
- `supported`, `previewable`
- `metadata`

## Metadata Shapes
### Common
- filename
- path
- extension
- file type label
- size
- created timestamp
- modified timestamp

### Text
- character count
- line count
- word count
- best-effort encoding

### Image / GIF
- width
- height
- aspect ratio
- format

### Video
- width
- height
- aspect ratio
- duration
- frame rate
- codec
- container

## Session Record
- `id`
- `title`
- `createdAt`, `updatedAt`
- `source`: `files`, `folders`, `mixed`, `restore`
- `entryPaths`
- `hadFolderInput`
- `assets`
- `selectedAssetIds`
- `surface`: `empty`, `grid`, `single`, `compare`
- `view`

## View State
- `layout`: `single`, `side-by-side`, `top-bottom`, `grid-3`, `grid-4`, `reveal-vertical`, `reveal-horizontal`, `diff`
- `background`, `backgroundColor`
- `zoom`
- `fitMode`
- `diffEnabled`
- `syncPan`
- `syncPlayback`
- `metadataOpen`
- `textDiffMode`
- `gridSort`
- `gridFilter`

## Persisted State
- `currentSession`: full active session snapshot
- `recentSessions`: last 10 reopenable summaries

Recent entries persist:
- title
- updated timestamp
- asset count
- selected count
- entry paths
- source type
- folder-input flag
