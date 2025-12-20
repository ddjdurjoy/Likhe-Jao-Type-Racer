export type HapticPattern = "tap" | "success" | "warning" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [10, 20, 10],
  warning: [20, 40, 20],
  error: [30, 40, 30, 40, 30],
};

export function haptic(pattern: HapticPattern = "tap") {
  if (typeof navigator === "undefined") return;
  const vibrate = (navigator as any).vibrate as undefined | ((p: number | number[]) => boolean);
  if (!vibrate) return;
  vibrate(PATTERNS[pattern]);
}
