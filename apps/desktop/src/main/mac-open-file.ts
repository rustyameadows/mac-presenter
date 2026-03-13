import path from "node:path";

import { supportedAssetExtensionsByFamily } from "@presenter/core";

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}

function uniqueResolved(pathsToFilter: string[]): string[] {
  return uniqueValues(pathsToFilter.map((inputPath) => path.resolve(inputPath)));
}

export function createPresenterDocumentTypes() {
  const extensions = uniqueValues(
    Object.values(supportedAssetExtensionsByFamily)
      .flat()
      .map((extension) => extension.slice(1))
  );

  return [
    {
      CFBundleTypeName: "Presenter Supported Asset",
      CFBundleTypeRole: "Viewer",
      LSHandlerRank: "Alternate",
      CFBundleTypeExtensions: extensions
    }
  ];
}

export function createMacOpenFileIntake(input: {
  batchWindowMs?: number;
  onPaths: (paths: string[]) => Promise<void>;
}) {
  const batchWindowMs = input.batchWindowMs ?? 80;
  let ready = false;
  let pendingPaths: string[] = [];
  let flushTimer: NodeJS.Timeout | null = null;
  let flushChain = Promise.resolve();

  const dispatchBatch = async () => {
    if (!ready || pendingPaths.length === 0) {
      return;
    }

    const batch = uniqueResolved(pendingPaths);
    pendingPaths = [];
    flushChain = flushChain
      .catch(() => undefined)
      .then(async () => {
        try {
          await input.onPaths(batch);
        } catch (error) {
          console.error("Failed to open macOS file selection in Presenter.", error);
        }
      });
    await flushChain;
  };

  const scheduleDispatch = () => {
    if (!ready || flushTimer || pendingPaths.length === 0) {
      return;
    }

    flushTimer = setTimeout(() => {
      flushTimer = null;
      void dispatchBatch();
    }, batchWindowMs);
  };

  return {
    queue(filePath: string) {
      pendingPaths.push(filePath);
      scheduleDispatch();
    },
    async setReady() {
      ready = true;
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }

      await dispatchBatch();
    }
  };
}
