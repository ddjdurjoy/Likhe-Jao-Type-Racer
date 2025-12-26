import React from "react";
import { cn } from "@/lib/utils";

export function RaceTrack({
  laneCount,
  children,
  className,
}: {
  laneCount: number;
  children: React.ReactNode;
  className?: string;
}) {
  const lanes = Math.max(1, laneCount);

  return (
    <div
      className={cn(
        "relative h-56 sm:h-64 rounded-xl border border-card-border overflow-hidden",
        // asphalt look
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)),radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.25),transparent_45%),linear-gradient(180deg,rgba(0,0,0,0.25),rgba(0,0,0,0.55))]",
        "backdrop-blur",
        className
      )}
    >
      {/* subtle vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(0,0,0,0.55))]" />

      {/* lane separators */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: lanes - 1 }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-white/10"
            style={{ top: `${((i + 1) / lanes) * 100}%` }}
          />
        ))}
      </div>

      {/* moving dashed center markers per lane */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        {Array.from({ length: lanes }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0"
            style={{ top: `${((i + 0.5) / lanes) * 100}%`, transform: "translateY(-50%)" }}
          >
            <div className="race-dashes" />
          </div>
        ))}
      </div>

      {/* finish line */}
      <div className="absolute right-6 top-0 bottom-0 w-[6px] bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.95),rgba(255,255,255,0.95)_8px,rgba(0,0,0,0.9)_8px,rgba(0,0,0,0.9)_16px)] shadow-[0_0_18px_rgba(255,255,255,0.25)]" />

      {children}
    </div>
  );
}
