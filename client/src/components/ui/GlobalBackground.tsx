import { AnimatedBackground } from "@/components/game/AnimatedBackground";

/**
 * Global animated background + dim overlay.
 * Keeps weather effects consistent across all pages.
 */
export function GlobalBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <AnimatedBackground />
      <div className="absolute inset-0 bg-background/60" aria-hidden />
    </div>
  );
}
