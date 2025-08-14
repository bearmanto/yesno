export function mcEnabled(): boolean {
  // Treat "1", "true", "TRUE" as enabled
  const v = process.env.NEXT_PUBLIC_FEATURE_MC_ENABLED ?? "";
  return ["1", "true", "TRUE"].includes(v);
}
