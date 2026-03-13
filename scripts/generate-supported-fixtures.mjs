import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(repoRoot, "test", "fixtures", "supported");
const tempRoot = path.join(os.tmpdir(), "presenter-supported-fixtures");

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

function ensureDir(relativeDir) {
  mkdirSync(path.join(fixtureRoot, relativeDir), { recursive: true });
}

function writeText(relativePath, content) {
  const absolutePath = path.join(fixtureRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
  return {
    relativePath,
    filename: path.basename(relativePath),
    lineCount: content.length === 0 ? 0 : content.split(/\r?\n/).length,
    wordCount: content.trim().length === 0 ? 0 : content.trim().split(/\s+/).length,
    characterCount: content.length
  };
}

function writeBinary(relativePath, buffer) {
  const absolutePath = path.join(fixtureRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, buffer);
  return {
    relativePath,
    filename: path.basename(relativePath)
  };
}

function copyIntoFolder(sourceRelativePath, folderRelativePath) {
  const destinationPath = path.join(
    fixtureRoot,
    folderRelativePath,
    path.basename(sourceRelativePath)
  );
  mkdirSync(path.dirname(destinationPath), { recursive: true });
  copyFileSync(path.join(fixtureRoot, sourceRelativePath), destinationPath);
  return path.relative(fixtureRoot, destinationPath).replaceAll(path.sep, "/");
}

function textManifest(id, relativePath, output, metadata) {
  return {
    id,
    scenario: "single",
    family: "text",
    path: relativePath,
    entryPaths: [relativePath],
    expectedSurface: "single",
    expectedSelection: [path.basename(relativePath)],
    expectedMetadata: metadata,
    expectedOutput: output,
    expectedViewport: {
      kind: "text"
    },
    compareEligible: false
  };
}

rmSync(fixtureRoot, { recursive: true, force: true });
rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(fixtureRoot, { recursive: true });
mkdirSync(tempRoot, { recursive: true });

ensureDir("text");
ensureDir("images");
ensureDir("gifs");
ensureDir("videos");
ensureDir("unsupported");
ensureDir("folders");

const manifest = [];

const plainPrimary = writeText(
  "text/plain-primary.txt",
  [
    "Presenter plain text fixture.",
    "Second line keeps the viewport honest.",
    "Third line verifies metadata and raw rendering."
  ].join("\n")
);
const plainVariant = writeText(
  "text/plain-variant.txt",
  [
    "Presenter plain text fixture.",
    "Second line changes the diff coverage.",
    "Variant line closes the pair cleanly."
  ].join("\n")
);
const plainLong = writeText(
  "text/plain-long.txt",
  Array.from({ length: 96 }, (_, index) =>
    `Presenter long text fixture line ${String(index + 1).padStart(2, "0")} keeps the scroll container busy.`
  ).join("\n")
);

const textFiles = [
  ["markdown-primary.md", "# Presenter Fixture\n\n- raw markdown stays literal\n- body text stays readable\n\n`inline code` stays source"],
  ["rich-text-primary.rtf", "{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Menlo;}}\\f0\\fs24 Presenter RTF fixture.\\par Raw control words should stay visible.}"],
  ["javascript-primary.js", "export function greet(name) {\n  return `Hello, ${name}`;\n}\nconsole.log(greet(\"Presenter\"));"],
  ["typescript-primary.ts", "type Fixture = { title: string; count: number };\nconst fixture: Fixture = { title: \"Presenter\", count: 2 };\nexport default fixture;"],
  ["tsx-primary.tsx", "export function FixtureCard() {\n  return <section data-kind=\"fixture\">Presenter TSX fixture</section>;\n}"],
  ["jsx-primary.jsx", "export const FixtureCard = () => <section>Presenter JSX fixture</section>;"],
  ["json-primary.json", "{\n  \"title\": \"Presenter\",\n  \"mode\": \"fixture\",\n  \"count\": 2\n}"],
  ["html-primary.html", "<section class=\"callout\">\n  <h1>Literal HTML fixture</h1>\n  <p>Render this as source, not executed markup.</p>\n</section>"],
  ["css-primary.css", ".fixture-shell {\n  display: flex;\n  gap: 12px;\n  color: #f8fafc;\n}"],
  ["ruby-primary.rb", "class PresenterFixture\n  def call\n    \"Presenter fixture\"\n  end\nend"],
  ["python-primary.py", "def presenter_fixture(name: str) -> str:\n    return f\"Presenter fixture for {name}\"\n"],
  ["yml-primary.yml", "title: Presenter\nmode: fixture\nitems:\n  - alpha\n  - beta"],
  ["yaml-primary.yaml", "title: Presenter\nmode: yaml-fixture\nitems:\n  - gamma\n  - delta"],
  ["xml-primary.xml", "<fixture>\n  <title>Presenter</title>\n  <mode>xml</mode>\n</fixture>"],
  ["toml-primary.toml", "title = \"Presenter\"\nmode = \"fixture\"\ncount = 2"],
  ["ini-primary.ini", "[presenter]\nmode=fixture\ncount=2"],
  ["shell-primary.sh", "#!/bin/zsh\necho \"Presenter fixture\"\n"],
  ["c-primary.c", "#include <stdio.h>\n\nint main(void) {\n  puts(\"Presenter C fixture\");\n  return 0;\n}"],
  ["cc-primary.cc", "#include <iostream>\n\nint main() {\n  std::cout << \"Presenter CC fixture\" << std::endl;\n  return 0;\n}"],
  ["cpp-primary.cpp", "#include <iostream>\n\nint main() {\n  std::cout << \"Presenter CPP fixture\" << std::endl;\n  return 0;\n}"],
  ["go-primary.go", "package main\n\nimport \"fmt\"\n\nfunc main() {\n  fmt.Println(\"Presenter Go fixture\")\n}"],
  ["java-primary.java", "class PresenterFixture {\n  public static void main(String[] args) {\n    System.out.println(\"Presenter Java fixture\");\n  }\n}"],
  ["swift-primary.swift", "struct PresenterFixture {\n  let title = \"Presenter\"\n}\nprint(PresenterFixture().title)"],
  ["rust-primary.rs", "fn main() {\n    println!(\"Presenter Rust fixture\");\n}"]
];

const textManifestEntries = [
  textManifest("text-plain-primary", plainPrimary.relativePath, {
    excerpt: "Second line keeps the viewport honest."
  }, {
    fileTypeLabel: "TXT",
    lineCount: plainPrimary.lineCount,
    wordCount: plainPrimary.wordCount,
    characterCountMin: plainPrimary.characterCount,
    encoding: "ascii"
  }),
  {
    ...textManifest("text-plain-long", plainLong.relativePath, {
      excerpt: "line 24 keeps the scroll container busy."
    }, {
      fileTypeLabel: "TXT",
      lineCount: plainLong.lineCount,
      wordCount: plainLong.wordCount,
      characterCountMin: plainLong.characterCount,
      encoding: "ascii"
    }),
    expectedViewport: {
      kind: "text",
      scrollable: true,
      screenshotName: "plain-text-single.png"
    }
  }
];

for (const [filename, content] of textFiles) {
  const written = writeText(`text/${filename}`, content);
  const id = `text-${filename.replaceAll(".", "-")}`;
  textManifestEntries.push(
    textManifest(
      id,
      written.relativePath,
      {
        excerpt: content.split("\n")[0]
      },
      {
        fileTypeLabel: path.extname(filename).slice(1).toUpperCase(),
        lineCount: written.lineCount,
        wordCount: written.wordCount,
        characterCountMin: written.characterCount,
        encoding: "ascii"
      }
    )
  );
}

manifest.push(...textManifestEntries);

manifest.push({
  id: "text-plain-pair",
  scenario: "compare",
  family: "text",
  path: plainPrimary.relativePath,
  variantPath: plainVariant.relativePath,
  entryPaths: [plainPrimary.relativePath, plainVariant.relativePath],
  expectedSurface: "compare",
  expectedSelection: [plainPrimary.filename, plainVariant.filename],
  expectedMetadata: {
    fileTypeLabel: "TXT",
    lineCount: plainPrimary.lineCount,
    wordCount: plainPrimary.wordCount,
    characterCountMin: plainPrimary.characterCount,
    encoding: "ascii"
  },
  expectedOutput: {
    excerpt: "Second line keeps the viewport honest.",
    visibleLabels: [plainPrimary.filename, plainVariant.filename]
  },
  expectedViewport: {
    kind: "text",
    screenshotName: "text-diff.png"
  },
  compareEligible: true
});

const svgPrimaryPath = path.join(fixtureRoot, "images", "svg-primary.svg");
writeFileSync(
  svgPrimaryPath,
  [
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"96\" viewBox=\"0 0 160 96\">",
    "  <rect width=\"160\" height=\"96\" fill=\"#0f172a\" />",
    "  <rect x=\"14\" y=\"14\" width=\"52\" height=\"68\" rx=\"8\" fill=\"#38bdf8\" />",
    "  <circle cx=\"118\" cy=\"48\" r=\"22\" fill=\"#f97316\" />",
    "</svg>"
  ].join("\n"),
  "utf8"
);
const svgVariantPath = path.join(fixtureRoot, "images", "svg-variant.svg");
writeFileSync(
  svgVariantPath,
  [
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"96\" viewBox=\"0 0 160 96\">",
    "  <rect width=\"160\" height=\"96\" fill=\"#1f2937\" />",
    "  <rect x=\"20\" y=\"20\" width=\"44\" height=\"56\" rx=\"8\" fill=\"#f59e0b\" />",
    "  <circle cx=\"110\" cy=\"50\" r=\"18\" fill=\"#34d399\" />",
    "  <rect x=\"88\" y=\"16\" width=\"46\" height=\"16\" rx=\"4\" fill=\"#f8fafc\" />",
    "</svg>"
  ].join("\n"),
  "utf8"
);

const tempPrimaryPng = path.join(tempRoot, "primary.png");
const tempVariantPng = path.join(tempRoot, "variant.png");

run("magick", [
  "-size",
  "160x96",
  "xc:#0f172a",
  "-fill",
  "#38bdf8",
  "-draw",
  "roundrectangle 16,16 72,80 8,8",
  "-fill",
  "#f97316",
  "-draw",
  "circle 120,48 120,22",
  tempPrimaryPng
]);

run("magick", [
  "-size",
  "160x96",
  "xc:#1f2937",
  "-fill",
  "#f59e0b",
  "-draw",
  "roundrectangle 20,20 64,72 8,8",
  "-fill",
  "#34d399",
  "-draw",
  "circle 110,48 110,24",
  "-fill",
  "#f8fafc",
  "-draw",
  "rectangle 84,14 136,34",
  tempVariantPng
]);

run("magick", [tempPrimaryPng, path.join(fixtureRoot, "images", "png-primary.png")]);
run("magick", [tempVariantPng, path.join(fixtureRoot, "images", "png-variant.png")]);
run("magick", [tempPrimaryPng, path.join(fixtureRoot, "images", "jpg-primary.jpg")]);
run("magick", [tempPrimaryPng, path.join(fixtureRoot, "images", "jpeg-primary.jpeg")]);
run("magick", [tempPrimaryPng, path.join(fixtureRoot, "images", "webp-primary.webp")]);
run("magick", [tempPrimaryPng, path.join(fixtureRoot, "images", "bmp-primary.bmp")]);
run("magick", [tempPrimaryPng, path.join(fixtureRoot, "images", "tif-primary.tif")]);
run("magick", [tempPrimaryPng, path.join(fixtureRoot, "images", "tiff-primary.tiff")]);

run("magick", [
  tempPrimaryPng,
  tempVariantPng,
  "-delay",
  "40",
  "-loop",
  "0",
  path.join(fixtureRoot, "gifs", "gif-animated-primary.gif")
]);
run("magick", [
  tempVariantPng,
  tempPrimaryPng,
  "-delay",
  "40",
  "-loop",
  "0",
  path.join(fixtureRoot, "gifs", "gif-animated-variant.gif")
]);

run("ffmpeg", [
  "-y",
  "-loop",
  "1",
  "-t",
  "1.2",
  "-i",
  tempPrimaryPng,
  "-vf",
  "scale=160:96,format=yuv420p",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  path.join(fixtureRoot, "videos", "mp4-primary.mp4")
]);
run("ffmpeg", [
  "-y",
  "-loop",
  "1",
  "-t",
  "1.2",
  "-i",
  tempVariantPng,
  "-vf",
  "scale=160:96,format=yuv420p",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  path.join(fixtureRoot, "videos", "mp4-variant.mp4")
]);
run("ffmpeg", [
  "-y",
  "-loop",
  "1",
  "-t",
  "1.2",
  "-i",
  tempPrimaryPng,
  "-vf",
  "scale=160:96,format=yuv420p",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  path.join(fixtureRoot, "videos", "mov-primary.mov")
]);
run("ffmpeg", [
  "-y",
  "-loop",
  "1",
  "-t",
  "1.2",
  "-i",
  tempPrimaryPng,
  "-vf",
  "scale=160:96,format=yuv420p",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  path.join(fixtureRoot, "videos", "m4v-primary.m4v")
]);
run("ffmpeg", [
  "-y",
  "-loop",
  "1",
  "-t",
  "1.2",
  "-i",
  tempPrimaryPng,
  "-vf",
  "scale=160:96,format=yuv420p",
  "-c:v",
  "libvpx-vp9",
  "-b:v",
  "0",
  "-crf",
  "32",
  path.join(fixtureRoot, "videos", "webm-primary.webm")
]);

writeBinary("unsupported/archive-primary.bin", Buffer.from([0, 1, 2, 3, 255, 0, 170, 85, 9, 8, 7, 6]));
writeText(
  "unsupported/document-primary.pdf",
  [
    "%PDF-1.1",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >> endobj",
    "4 0 obj << /Length 45 >> stream",
    "BT /F1 12 Tf 72 120 Td (Presenter fixture PDF) Tj ET",
    "endstream endobj",
    "xref",
    "0 5",
    "0000000000 65535 f ",
    "trailer << /Root 1 0 R /Size 5 >>",
    "startxref",
    "0",
    "%%EOF"
  ].join("\n")
);

const imageSingles = [
  ["image-png-primary", "images/png-primary.png", "PNG", "png"],
  ["image-jpg-primary", "images/jpg-primary.jpg", "JPG", "jpg"],
  ["image-jpeg-primary", "images/jpeg-primary.jpeg", "JPEG", "jpeg"],
  ["image-webp-primary", "images/webp-primary.webp", "WEBP", "webp"],
  ["image-svg-primary", "images/svg-primary.svg", "SVG", "svg"],
  ["image-bmp-primary", "images/bmp-primary.bmp", "BMP", "bmp"]
];

for (const [id, relativePath, label, format] of imageSingles) {
  manifest.push({
    id,
    scenario: "single",
    family: "image",
    path: relativePath,
    entryPaths: [relativePath],
    expectedSurface: "single",
    expectedSelection: [path.basename(relativePath)],
    expectedMetadata: {
      fileTypeLabel: label,
      width: 160,
      height: 96,
      format
    },
    expectedOutput: {
      visibleLabels: [path.basename(relativePath)]
    },
    expectedViewport: {
      kind: "image"
    },
    compareEligible: false
  });
}

manifest.push({
  id: "image-png-pair",
  scenario: "compare",
  family: "image",
  path: "images/png-primary.png",
  variantPath: "images/png-variant.png",
  entryPaths: ["images/png-primary.png", "images/png-variant.png"],
  expectedSurface: "compare",
  expectedSelection: ["png-primary.png", "png-variant.png"],
  expectedMetadata: {
    fileTypeLabel: "PNG",
    width: 160,
    height: 96,
    format: "png"
  },
  expectedOutput: {
    visibleLabels: ["png-primary.png", "png-variant.png"]
  },
  expectedViewport: {
    kind: "image",
    screenshotName: "image-diff.png"
  },
  compareEligible: true
});

manifest.push({
  id: "image-three-up",
  scenario: "compare",
  family: "image",
  path: "images/png-primary.png",
  entryPaths: [
    "images/png-primary.png",
    "images/jpg-primary.jpg",
    "images/webp-primary.webp"
  ],
  expectedSurface: "compare",
  expectedSelection: ["png-primary.png", "jpg-primary.jpg", "webp-primary.webp"],
  expectedMetadata: {
    width: 160,
    height: 96
  },
  expectedOutput: {
    visibleLabels: ["png-primary.png", "jpg-primary.jpg", "webp-primary.webp"]
  },
  expectedViewport: {
    kind: "image",
    screenshotName: "three-up-compare.png"
  },
  compareEligible: true
});

manifest.push({
  id: "image-four-up",
  scenario: "compare",
  family: "image",
  path: "images/png-primary.png",
  entryPaths: [
    "images/png-primary.png",
    "images/jpg-primary.jpg",
    "images/webp-primary.webp",
    "images/svg-primary.svg"
  ],
  expectedSurface: "compare",
  expectedSelection: [
    "png-primary.png",
    "jpg-primary.jpg",
    "webp-primary.webp",
    "svg-primary.svg"
  ],
  expectedMetadata: {
    width: 160,
    height: 96
  },
  expectedOutput: {
    visibleLabels: [
      "png-primary.png",
      "jpg-primary.jpg",
      "webp-primary.webp",
      "svg-primary.svg"
    ]
  },
  expectedViewport: {
    kind: "image",
    screenshotName: "four-up-compare.png"
  },
  compareEligible: true
});

manifest.push({
  id: "gif-animated-primary",
  scenario: "single",
  family: "gif",
  path: "gifs/gif-animated-primary.gif",
  entryPaths: ["gifs/gif-animated-primary.gif"],
  expectedSurface: "single",
  expectedSelection: ["gif-animated-primary.gif"],
  expectedMetadata: {
    fileTypeLabel: "GIF",
    width: 160,
    height: 96,
    format: "gif"
  },
  expectedOutput: {
    visibleLabels: ["gif-animated-primary.gif"]
  },
  expectedViewport: {
    kind: "gif"
  },
  compareEligible: false
});

manifest.push({
  id: "gif-animated-pair",
  scenario: "compare",
  family: "gif",
  path: "gifs/gif-animated-primary.gif",
  variantPath: "gifs/gif-animated-variant.gif",
  entryPaths: ["gifs/gif-animated-primary.gif", "gifs/gif-animated-variant.gif"],
  expectedSurface: "compare",
  expectedSelection: ["gif-animated-primary.gif", "gif-animated-variant.gif"],
  expectedMetadata: {
    fileTypeLabel: "GIF",
    width: 160,
    height: 96,
    format: "gif"
  },
  expectedOutput: {
    visibleLabels: ["gif-animated-primary.gif", "gif-animated-variant.gif"]
  },
  expectedViewport: {
    kind: "gif"
  },
  compareEligible: true
});

const videoSingles = [
  ["video-mp4-primary", "videos/mp4-primary.mp4", "MP4", "h264", "mp4"],
  ["video-mov-primary", "videos/mov-primary.mov", "MOV", "h264", "mov"],
  ["video-webm-primary", "videos/webm-primary.webm", "WEBM", "vp9", "webm"],
  ["video-m4v-primary", "videos/m4v-primary.m4v", "M4V", "h264", "mp4"]
];

for (const [id, relativePath, label, codec, containerIncludes] of videoSingles) {
  manifest.push({
    id,
    scenario: "single",
    family: "video",
    path: relativePath,
    entryPaths: [relativePath],
    expectedSurface: "single",
    expectedSelection: [path.basename(relativePath)],
    expectedMetadata: {
      fileTypeLabel: label,
      width: 160,
      height: 96,
      codec,
      containerIncludes,
      durationSecondsMin: 1
    },
    expectedOutput: {
      visibleLabels: [path.basename(relativePath)]
    },
    expectedViewport: {
      kind: "video"
    },
    compareEligible: false
  });
}

manifest.push({
  id: "video-mp4-pair",
  scenario: "compare",
  family: "video",
  path: "videos/mp4-primary.mp4",
  variantPath: "videos/mp4-variant.mp4",
  entryPaths: ["videos/mp4-primary.mp4", "videos/mp4-variant.mp4"],
  expectedSurface: "compare",
  expectedSelection: ["mp4-primary.mp4", "mp4-variant.mp4"],
  expectedMetadata: {
    fileTypeLabel: "MP4",
    width: 160,
    height: 96,
    codec: "h264",
    containerIncludes: "mp4",
    durationSecondsMin: 1
  },
  expectedOutput: {
    visibleLabels: ["mp4-primary.mp4", "mp4-variant.mp4"]
  },
  expectedViewport: {
    kind: "video",
    screenshotName: "video-compare.png"
  },
  compareEligible: true
});

manifest.push({
  id: "unsupported-bin-primary",
  scenario: "single",
  family: "unsupported",
  path: "unsupported/archive-primary.bin",
  entryPaths: ["unsupported/archive-primary.bin"],
  expectedSurface: "grid",
  expectedSelection: ["archive-primary.bin"],
  expectedMetadata: {
    fileTypeLabel: "BIN"
  },
  expectedOutput: {
    visibleLabels: ["archive-primary.bin", "Unsupported preview"]
  },
  expectedViewport: {
    kind: "unsupported"
  },
  compareEligible: false
});

manifest.push({
  id: "unsupported-tif-primary",
  scenario: "single",
  family: "unsupported",
  path: "images/tif-primary.tif",
  entryPaths: ["images/tif-primary.tif"],
  expectedSurface: "grid",
  expectedSelection: ["tif-primary.tif"],
  expectedMetadata: {
    fileTypeLabel: "TIF"
  },
  expectedOutput: {
    visibleLabels: ["tif-primary.tif", "Unsupported preview"]
  },
  expectedViewport: {
    kind: "unsupported"
  },
  compareEligible: false
});

manifest.push({
  id: "unsupported-tiff-primary",
  scenario: "single",
  family: "unsupported",
  path: "images/tiff-primary.tiff",
  entryPaths: ["images/tiff-primary.tiff"],
  expectedSurface: "grid",
  expectedSelection: ["tiff-primary.tiff"],
  expectedMetadata: {
    fileTypeLabel: "TIFF"
  },
  expectedOutput: {
    visibleLabels: ["tiff-primary.tiff", "Unsupported preview"]
  },
  expectedViewport: {
    kind: "unsupported"
  },
  compareEligible: false
});

manifest.push({
  id: "unsupported-pdf-primary",
  scenario: "single",
  family: "unsupported",
  path: "unsupported/document-primary.pdf",
  entryPaths: ["unsupported/document-primary.pdf"],
  expectedSurface: "grid",
  expectedSelection: ["document-primary.pdf"],
  expectedMetadata: {
    fileTypeLabel: "PDF"
  },
  expectedOutput: {
    visibleLabels: ["document-primary.pdf", "Unsupported preview"]
  },
  expectedViewport: {
    kind: "unsupported",
    screenshotName: "unsupported-grid.png"
  },
  compareEligible: false
});

const mixedFolderEntries = [
  copyIntoFolder("text/plain-primary.txt", "folders/mixed-grid-set"),
  copyIntoFolder("images/png-primary.png", "folders/mixed-grid-set"),
  copyIntoFolder("gifs/gif-animated-primary.gif", "folders/mixed-grid-set"),
  copyIntoFolder("videos/mp4-primary.mp4", "folders/mixed-grid-set"),
  copyIntoFolder("unsupported/document-primary.pdf", "folders/mixed-grid-set")
];

const visualFolderEntries = [
  copyIntoFolder("images/png-primary.png", "folders/visual-grid-set"),
  copyIntoFolder("images/jpg-primary.jpg", "folders/visual-grid-set"),
  copyIntoFolder("images/webp-primary.webp", "folders/visual-grid-set"),
  copyIntoFolder("images/svg-primary.svg", "folders/visual-grid-set"),
  copyIntoFolder("images/bmp-primary.bmp", "folders/visual-grid-set")
];

const unsupportedFolderEntries = [
  copyIntoFolder("unsupported/archive-primary.bin", "folders/unsupported-grid-set"),
  copyIntoFolder("unsupported/document-primary.pdf", "folders/unsupported-grid-set")
];

manifest.push({
  id: "folder-mixed-grid-set",
  scenario: "folder",
  family: "mixed",
  path: "folders/mixed-grid-set",
  entryPaths: ["folders/mixed-grid-set"],
  expectedSurface: "grid",
  expectedSelection: mixedFolderEntries.map((entry) => path.basename(entry)).sort(),
  expectedMetadata: {},
  expectedOutput: {
    visibleLabels: ["Asset Browser", "plain-primary.txt", "png-primary.png"]
  },
  expectedViewport: {
    kind: "grid",
    screenshotName: "mixed-grid.png"
  },
  compareEligible: false
});

manifest.push({
  id: "folder-visual-grid-set",
  scenario: "folder",
  family: "image",
  path: "folders/visual-grid-set",
  entryPaths: ["folders/visual-grid-set"],
  expectedSurface: "grid",
  expectedSelection: visualFolderEntries.map((entry) => path.basename(entry)).sort(),
  expectedMetadata: {},
  expectedOutput: {
    visibleLabels: ["Asset Browser", "png-primary.png", "svg-primary.svg"]
  },
  expectedViewport: {
    kind: "grid"
  },
  compareEligible: false
});

manifest.push({
  id: "folder-unsupported-grid-set",
  scenario: "folder",
  family: "unsupported",
  path: "folders/unsupported-grid-set",
  entryPaths: ["folders/unsupported-grid-set"],
  expectedSurface: "grid",
  expectedSelection: unsupportedFolderEntries.map((entry) => path.basename(entry)).sort(),
  expectedMetadata: {},
  expectedOutput: {
    visibleLabels: ["Asset Browser", "archive-primary.bin", "document-primary.pdf"]
  },
  expectedViewport: {
    kind: "grid"
  },
  compareEligible: false
});

writeFileSync(
  path.join(fixtureRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

console.log(`Supported fixtures written to ${fixtureRoot}`);
