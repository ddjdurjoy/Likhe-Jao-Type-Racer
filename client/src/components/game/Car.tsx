import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CARS } from "@/lib/stores/gameStore";

interface CarProps {
  carId: number;
  progress: number;
  wpm?: number;
  playerName: string;
  isPlayer: boolean;
  isAI?: boolean;
  position: number;
  lane: number;
  laneCount: number;
  isRacing?: boolean;
}

export function Car({
  carId,
  progress,
  wpm = 0,
  playerName,
  isPlayer,
  isAI,
  position,
  lane,
  laneCount,
  isRacing,
}: CarProps) {
  const car = CARS[carId] || CARS[0];

 // Smooth car motion (more like acceleration), instead of snapping to progress updates.
 const [displayProgress, setDisplayProgress] = useState(progress);
 const targetRef = useRef(progress);
 targetRef.current = progress;

 const speedFactor = useMemo(() => {
   // Higher WPM -> snappier response.
   return Math.max(0.08, Math.min(0.28, 0.08 + wpm / 400));
 }, [wpm]);

 useEffect(() => {
   let raf = 0;
   const step = () => {
     setDisplayProgress((cur) => {
       const target = targetRef.current;
       const next = cur + (target - cur) * speedFactor;
       // Snap when very close.
       return Math.abs(next - target) < 0.05 ? target : next;
     });
     raf = requestAnimationFrame(step);
   };
   raf = requestAnimationFrame(step);
   return () => cancelAnimationFrame(raf);
 }, [speedFactor]);

 return (
    <div
      className={cn(
        // Use left so % is relative to the track width (translate% was relative to car width).
        "absolute will-change-[left,transform] transition-[left,transform] duration-150 ease-out",
        isRacing && progress > 0 && "animate-car-bounce"
      )}
      style={{
        // Keep the car fully inside the track.
        // We anchor the car by its LEFT edge (no translateX), so 0% truly starts inside.
        // Also reserve space near the finish line so the car doesn't overlap the checkered bar.
        left: `clamp(8px, ${Math.min(displayProgress, 100)}%, calc(100% - 92px))`,
        top: `${((lane + 0.5) / Math.max(1, laneCount)) * 100}%`,
        transform: "translate(0, -50%)",
      }}
      data-testid={`car-${isPlayer ? "player" : `ai-${lane}`}`}
    >
      <div className="relative flex items-center gap-2">
        {position > 0 && (
          <div
            className={cn(
              "absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
              position === 1 && "bg-yellow-400 text-yellow-900",
              position === 2 && "bg-gray-300 text-gray-700",
              position === 3 && "bg-amber-600 text-amber-100",
              position > 3 && "bg-muted text-muted-foreground"
            )}
          >
            {position}
          </div>
        )}

        {isRacing && progress > 5 && (
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-50">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-0.5 bg-muted-foreground/40 animate-speed-lines"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </div>
        )}

         
           <svg
           width="48"
           height="24"
           viewBox="0 0 48 24"
           fill="none"
           className={cn(
             "drop-shadow-md transition-transform",
             isPlayer && "scale-110"
           )}
         >
           <path
             d="M4 16C4 14 6 10 12 10L20 8C24 6 32 6 36 8L44 12C46 13 46 16 44 18H40C40 20 38 22 36 22C34 22 32 20 32 18H16C16 20 14 22 12 22C10 22 8 20 8 18H4V16Z"
             fill={car.color}
             className="drop-shadow-sm"
           />
           <path
             d="M14 10L18 6C20 4 28 4 30 6L34 10"
             stroke={car.color}
             strokeWidth="2"
             fill="none"
             className="opacity-80"
           />
           <rect
             x="16"
             y="6"
             width="16"
             height="6"
             rx="1"
             fill="white"
             fillOpacity="0.3"
           />
           <circle
             cx="12"
             cy="18"
             r="3"
             fill="#1f2937"
             className={cn(isRacing && "animate-wheel-spin")}
           />
           <circle
             cx="36"
             cy="18"
             r="3"
             fill="#1f2937"
             className={cn(isRacing && "animate-wheel-spin")}
           />
           <circle cx="12" cy="18" r="1.5" fill="#6b7280" />
           <circle cx="36" cy="18" r="1.5" fill="#6b7280" />
         </svg>

        {isRacing && progress > 10 && (
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex gap-0.5">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-exhaust"
                style={{
                  backgroundColor: car.color,
                  opacity: 0.6,
                  animationDelay: `${i * 200}ms`,
                }}
              />
            ))}
          </div>
        )}

        <div
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap",
            isPlayer
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {playerName}
          {isAI && (
            <span className="ml-1 opacity-60 text-[10px]">AI</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface CarPreviewProps {
  carId: number;
  selected?: boolean;
  locked?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function CarPreview({
  carId,
  selected,
  locked,
  size = "md",
  onClick,
}: CarPreviewProps) {
  const car = CARS[carId] || CARS[0];

  const sizes = {
    sm: { width: 40, height: 20 },
    md: { width: 64, height: 32 },
    lg: { width: 96, height: 48 },
  };

  const { width, height } = sizes[size];

  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={cn(
        "relative p-4 rounded-lg border-2 transition-all",
        selected
          ? "border-primary bg-primary/10"
          : "border-transparent bg-muted/50 hover-elevate",
        locked && "opacity-50 cursor-not-allowed"
      )}
      data-testid={`car-preview-${carId}`}
    >
      <svg
         width={width}
         height={height}
         viewBox="0 0 48 24"
         fill="none"
         className={cn("transition-transform", selected && "scale-110")}
       >
         <path
           d="M4 16C4 14 6 10 12 10L20 8C24 6 32 6 36 8L44 12C46 13 46 16 44 18H40C40 20 38 22 36 22C34 22 32 20 32 18H16C16 20 14 22 12 22C10 22 8 20 8 18H4V16Z"
           fill={car.color}
         />
         <path
           d="M14 10L18 6C20 4 28 4 30 6L34 10"
           stroke={car.color}
           strokeWidth="2"
           fill="none"
           className="opacity-80"
         />
         <rect
           x="16"
           y="6"
           width="16"
           height="6"
           rx="1"
           fill="white"
           fillOpacity="0.3"
         />
         <circle cx="12" cy="18" r="3" fill="#1f2937" />
         <circle cx="36" cy="18" r="3" fill="#1f2937" />
         <circle cx="12" cy="18" r="1.5" fill="#6b7280" />
         <circle cx="36" cy="18" r="1.5" fill="#6b7280" />
       </svg>

      <div className="mt-2 text-center">
        <p className="text-sm font-medium">{car.name}</p>
        {locked && (
          <p className="text-xs text-muted-foreground mt-1">Locked</p>
        )}
      </div>

      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-primary-foreground"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  );
}
