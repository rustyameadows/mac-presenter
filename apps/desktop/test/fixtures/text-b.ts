export function scoreImage(version: string) {
  return {
    version,
    approved: version.startsWith("beta"),
    notes: ["soft edges", "lower contrast", "safe crop", "new badge"]
  };
}
