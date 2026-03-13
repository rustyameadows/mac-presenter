import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { dialog, type BrowserWindow } from "electron";
import type { AssetRecord, SessionRecord } from "@presenter/core";
import { readTextAssetContent } from "@presenter/core/node";

export interface ExportResult {
  canceled: boolean;
  outputPath?: string;
}

interface ViewerAsset {
  id: string;
  name: string;
  family: AssetRecord["family"];
  fileTypeLabel: string;
  relativePath: string;
  selected: boolean;
  textContent?: string;
}

function sanitizeFileSegment(input: string): string {
  return input.replace(/[^a-z0-9._-]+/gi, "-");
}

function dedupeFilename(baseName: string, usedNames: Set<string>): string {
  const extension = path.extname(baseName);
  const stem = baseName.slice(0, baseName.length - extension.length) || "asset";
  let candidate = `${sanitizeFileSegment(stem)}${extension}`;
  let index = 1;
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${sanitizeFileSegment(stem)}-${index}${extension}`;
    index += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function runZip(targetZipPath: string, sourceDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const zip = spawn("zip", ["-r", "-q", targetZipPath, "."], {
      cwd: sourceDir,
      stdio: "ignore"
    });

    zip.on("error", (error) => reject(error));
    zip.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`zip exited with code ${code ?? "unknown"}.`));
      }
    });
  });
}

function buildViewerHtml(title: string, assets: ViewerAsset[]): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: "Avenir Next", "SF Pro Display", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; background: #fff; color: #0f172a; }
    .top-rail { display:flex; justify-content:space-between; gap:8px; align-items:center; padding:10px; border-bottom:2px solid rgba(15,23,42,.12); }
    .rail-group { display:flex; align-items:center; gap:6px; }
    .button, .select { border:1px solid rgba(15,23,42,.25); background:rgba(255,255,255,.85); color:inherit; border-radius:6px; padding:6px 10px; font-size:12px; }
    .button.is-active { background:#0f172a; color:#fff; border-color:#0f172a; }
    .shell { flex:1; min-height:0; display:grid; grid-template-columns:260px 1fr; }
    .list { border-right:2px solid rgba(15,23,42,.12); overflow:auto; padding:10px; display:flex; flex-direction:column; gap:6px; }
    .asset-item { width:100%; text-align:left; background:transparent; border:1px solid transparent; border-radius:8px; padding:8px; }
    .asset-item:hover { border-color: rgba(15,23,42,.2); }
    .asset-item.is-active { border-color: rgba(15,23,42,.45); background:rgba(15,23,42,.08); }
    .asset-name { font-size:12px; font-weight:600; margin-bottom:2px; }
    .asset-type { font-size:11px; opacity:.75; }
    .viewer { min-width:0; padding:10px; display:flex; gap:10px; background: var(--viewer-bg, linear-gradient(45deg,#f3f4f6 25%,#e5e7eb 25%,#e5e7eb 50%,#f3f4f6 50%,#f3f4f6 75%,#e5e7eb 75%,#e5e7eb 100%)); background-size:16px 16px; }
    .viewer[data-layout="single"] .pane:nth-child(n+2) { display:none; }
    .viewer[data-layout="side-by-side"] { flex-direction:row; }
    .viewer[data-layout="top-bottom"] { flex-direction:column; }
    .pane { flex:1; min-height:0; border:1px solid rgba(15,23,42,.18); border-radius:8px; background:rgba(255,255,255,.6); overflow:hidden; display:flex; align-items:center; justify-content:center; }
    .pane img, .pane video { max-width:100%; max-height:100%; object-fit:contain; }
    .pane pre { width:100%; height:100%; margin:0; padding:14px; overflow:auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size:12px; background:rgba(255,255,255,.96); }
    .empty { color: rgba(15,23,42,.7); font-size:13px; padding:24px; }
    @media (max-width: 860px) { .shell { grid-template-columns: 1fr; } .list { max-height: 180px; border-right:0; border-bottom:2px solid rgba(15,23,42,.12); } }
  </style>
</head>
<body>
  <header class="top-rail">
    <div class="rail-group">
      <button class="button" data-bg="checker">Checker</button>
      <button class="button" data-bg="black">Black</button>
      <button class="button" data-bg="white">White</button>
      <input type="color" class="select" id="custom-color" value="#cbd5e1" aria-label="Custom background" />
    </div>
    <div class="rail-group">
      <select class="select" id="layout" aria-label="Layout">
        <option value="single">Single</option>
        <option value="side-by-side" selected>Left / Right</option>
        <option value="top-bottom">Top / Bottom</option>
      </select>
    </div>
  </header>
  <div class="shell">
    <aside class="list" id="asset-list"></aside>
    <main class="viewer" id="viewer" data-layout="side-by-side">
      <div class="pane" id="pane-a"></div>
      <div class="pane" id="pane-b"></div>
    </main>
  </div>
  <script>
    const assets = ${JSON.stringify(assets)};
    let activeIndex = Math.max(0, assets.findIndex((asset) => asset.selected));
    const list = document.getElementById("asset-list");
    const paneA = document.getElementById("pane-a");
    const paneB = document.getElementById("pane-b");
    const viewer = document.getElementById("viewer");

    function buildMedia(asset) {
      if (asset.family === "image" || asset.family === "gif") {
        const el = document.createElement("img");
        el.src = asset.relativePath;
        el.alt = asset.name;
        return el;
      }
      if (asset.family === "video") {
        const el = document.createElement("video");
        el.src = asset.relativePath;
        el.controls = true;
        el.preload = "metadata";
        return el;
      }
      if (asset.family === "text") {
        const el = document.createElement("pre");
        el.textContent = asset.textContent ?? "";
        return el;
      }
      const message = document.createElement("div");
      message.className = "empty";
      message.textContent = "This asset type is included in the package but not previewable in the static viewer.";
      return message;
    }

    function renderViewer() {
      const first = assets[activeIndex];
      const second = assets[Math.min(activeIndex + 1, assets.length - 1)] ?? first;
      paneA.replaceChildren(first ? buildMedia(first) : document.createElement("div"));
      paneB.replaceChildren(second ? buildMedia(second) : document.createElement("div"));

      for (const [index, button] of [...list.querySelectorAll("button")].entries()) {
        button.classList.toggle("is-active", index === activeIndex);
      }
    }

    for (const asset of assets) {
      const button = document.createElement("button");
      button.className = "asset-item button";
      button.innerHTML = '<div class="asset-name"></div><div class="asset-type"></div>';
      button.querySelector(".asset-name").textContent = asset.name;
      button.querySelector(".asset-type").textContent = asset.fileTypeLabel;
      button.addEventListener("click", () => {
        activeIndex = assets.indexOf(asset);
        renderViewer();
      });
      list.appendChild(button);
    }

    document.getElementById("layout").addEventListener("change", (event) => {
      viewer.dataset.layout = event.target.value;
    });

    const backgroundModes = {
      checker: "linear-gradient(45deg,#f3f4f6 25%,#e5e7eb 25%,#e5e7eb 50%,#f3f4f6 50%,#f3f4f6 75%,#e5e7eb 75%,#e5e7eb 100%)",
      black: "#050505",
      white: "#ffffff"
    };

    for (const button of document.querySelectorAll("button[data-bg]")) {
      button.addEventListener("click", () => {
        document.querySelectorAll("button[data-bg]").forEach((node) => node.classList.remove("is-active"));
        button.classList.add("is-active");
        viewer.style.setProperty("--viewer-bg", backgroundModes[button.dataset.bg]);
      });
    }

    document.getElementById("custom-color").addEventListener("input", (event) => {
      document.querySelectorAll("button[data-bg]").forEach((node) => node.classList.remove("is-active"));
      viewer.style.setProperty("--viewer-bg", event.target.value);
    });

    renderViewer();
  </script>
</body>
</html>`;
}

export async function exportSessionZip(input: {
  window: BrowserWindow | null;
  session: SessionRecord;
}): Promise<ExportResult> {
  const sessionSlug = sanitizeFileSegment(input.session.title) || "presenter-session";
  const defaultPath = path.join(os.homedir(), "Downloads", `${sessionSlug}.zip`);
  const saveResult = input.window
    ? await dialog.showSaveDialog(input.window, {
        title: "Download package",
        defaultPath,
        filters: [{ name: "Zip Archive", extensions: ["zip"] }]
      })
    : await dialog.showSaveDialog({
        title: "Download package",
        defaultPath,
        filters: [{ name: "Zip Archive", extensions: ["zip"] }]
      });

  if (saveResult.canceled || !saveResult.filePath) {
    return { canceled: true };
  }

  const outputPath = saveResult.filePath.endsWith(".zip")
    ? saveResult.filePath
    : `${saveResult.filePath}.zip`;

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "presenter-export-"));
  const packageRoot = path.join(tempRoot, "payload");
  const assetsDir = path.join(packageRoot, "assets");

  await fs.mkdir(assetsDir, { recursive: true });

  try {
    const usedNames = new Set<string>();
    const viewerAssets: ViewerAsset[] = [];

    for (const asset of input.session.assets) {
      const outputName = dedupeFilename(asset.name, usedNames);
      const outputRelativePath = path.posix.join("assets", outputName);
      await fs.copyFile(asset.path, path.join(assetsDir, outputName));

      const viewerAsset: ViewerAsset = {
        id: asset.id,
        name: asset.name,
        family: asset.family,
        fileTypeLabel: asset.metadata.fileTypeLabel,
        relativePath: outputRelativePath,
        selected: input.session.selectedAssetIds.includes(asset.id)
      };

      if (asset.family === "text") {
        const content = await readTextAssetContent(asset.path);
        viewerAsset.textContent = content.content;
      }

      viewerAssets.push(viewerAsset);
    }

    await fs.writeFile(
      path.join(packageRoot, "index.html"),
      buildViewerHtml(input.session.title, viewerAssets),
      "utf8"
    );

    await fs.rm(outputPath, { force: true });
    await runZip(outputPath, packageRoot);

    return {
      canceled: false,
      outputPath
    };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}
