export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.34524, "w"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];
  let val = s;
  let label = "s";
  for (const [div, sym] of units) {
    if (val < div) { label = sym; break; }
    val = Math.floor(val / div);
    label = sym;
  }
  return `${val}${label} ago`;
}
