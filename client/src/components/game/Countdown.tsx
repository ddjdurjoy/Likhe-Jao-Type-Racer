import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/stores/gameStore";
import { soundManager } from "@/lib/utils/soundManager";

interface CountdownProps {
  onComplete: () => void;
}

export function Countdown({ onComplete }: CountdownProps) {
  const { countdown, setCountdown, soundEnabled, volume } = useGameStore();
  const [visible, setVisible] = useState(true);
  const [currentNumber, setCurrentNumber] = useState(countdown);
  const [startValue] = useState(countdown);

  // respect reduced motion
  const prefersReduced = useMemo(() =>
    typeof window !== "undefined" && "matchMedia" in window &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  []);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
    soundManager.setVolume(volume);
  }, [soundEnabled, volume]);

  useEffect(() => {
    if (countdown <= 0) {
      soundManager.playCountdownGo();
      soundManager.playRaceStart();
      const t = setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 500);
      return () => clearTimeout(t);
    }

    soundManager.playCountdownBeep();
    setCurrentNumber(countdown);

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, setCountdown, onComplete]);

  // Derived progress (0..1) for ring
  const progress = Math.max(0, Math.min(1, (startValue - countdown) / Math.max(1, startValue)));

  // Labels for a more professional feel
  const sublabel = countdown <= 0 ? "Go" : countdown === 1 ? "Set" : "Ready";

  if (!visible) return null;

  const circleSize = 220;
  const radius = (circleSize - 16) / 2; // 8px stroke
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (countdown <= 0 ? 1 : (1 - (countdown - Math.floor(countdown)))))
  // Ensure label fits within circle by dynamic sizing
  const baseFontPx = Math.round(circleSize * (countdown === 0 ? 0.36 : 0.42));
  const label = countdown === 0 ? "GO!" : String(currentNumber);

  return (
    <AnimatePresence>
      <motion.div
        key="countdown-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        data-testid="countdown-overlay"
      >
        {/* Soft vignette and blur for focus */}
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

        {/* Subtle grid for polish */}
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative flex flex-col items-center gap-6">
          {/* Circular progress + number */}
          <div className="relative">
            <svg
              width={circleSize}
              height={circleSize}
              viewBox={`0 0 ${circleSize} ${circleSize}`}
              className="drop-shadow-[0_0_40px_rgba(0,0,0,0.35)]"
            >
              <defs>
                <linearGradient id="countdownStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary)/.6)" />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                stroke="hsl(var(--primary)/.15)"
                strokeWidth={8}
                fill="none"
              />
              {/* Progress */}
              <motion.circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                stroke="url(#countdownStroke)"
                strokeWidth={8}
                strokeLinecap="round"
                fill="none"
                style={{ rotate: -90, transformOrigin: "50% 50%" }}
                strokeDasharray={circumference}
                strokeDashoffset={countdown <= 0 ? 0 : circumference}
                animate={prefersReduced ? undefined : { strokeDashoffset: 0 }}
                transition={{ duration: 1, ease: "easeInOut" }}
              />
            </svg>

            {/* Number / GO */}
            <div className="absolute inset-0 flex items-center justify-center">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={countdown}
                  initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 8, filter: "blur(4px)" }}
                  animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8, filter: "blur(3px)" }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="font-display font-extrabold tracking-tight leading-none"
                  style={{
                    WebkitTextStroke: "2px rgba(0,0,0,0.2)",
                    textShadow: "0 6px 30px rgba(0,0,0,0.35)",
                    fontSize: baseFontPx,
                    lineHeight: 1,
                    maxWidth: circleSize,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {countdown === 0 ? (
                    <span className="text-success">{label}</span>
                  ) : (
                    <span className="text-primary">{label}</span>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Sublabel */}
          <motion.div
            key={`label-${sublabel}-${countdown}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-sm sm:text-base uppercase tracking-[0.35em] text-muted-foreground"
          >
            {sublabel}
          </motion.div>
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-8 text-center">
          <p className="text-sm sm:text-base text-muted-foreground/90">
            Get ready to type...
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
