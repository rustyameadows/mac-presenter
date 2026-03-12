export function scoreImage(version: string) {
  return {
    version,
    approved: version.startsWith("alpha"),
    notes: ["sharp edges", "high contrast", "safe crop"]
  };
}
