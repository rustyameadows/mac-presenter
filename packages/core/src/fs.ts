import { promises as fs } from "node:fs";
import path from "node:path";

function isHidden(entryName: string): boolean {
  return entryName.startsWith(".");
}

export async function collectFilesRecursive(inputPath: string): Promise<string[]> {
  const stats = await fs.stat(inputPath);

  if (stats.isFile()) {
    return [inputPath];
  }

  const entries = await fs.readdir(inputPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !isHidden(entry.name))
      .map(async (entry) => {
        const entryPath = path.join(inputPath, entry.name);
        if (entry.isDirectory()) {
          return collectFilesRecursive(entryPath);
        }

        if (entry.isFile()) {
          return [entryPath];
        }

        return [];
      })
  );

  return nested.flat();
}
