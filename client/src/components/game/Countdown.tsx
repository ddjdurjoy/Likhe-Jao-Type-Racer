import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/stores/gameStore";
import { soundManager } from "@/lib/utils/soundManager";
import { cn } from "@/lib/utils";

interface CountdownProps {
  onComplete: () => void;
}

export function Countdown({ onComplete }: CountdownProps) {
  const { countdown, setCountdown, soundEnabled, volume } = useGameStore();
  const [visible, setVisible] = useState(true);
  const [currentNumber, setCurrentNumber] = useState(countdown);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
    soundManager.setVolume(volume);
  }, [soundEnabled, volume]);

  useEffect(() => {
    if (countdown <= 0) {
      soundManager.playCountdownGo();
      soundManager.playRaceStart();
      setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 500);
      return;
    }

    soundManager.playCountdownBeep();
    setCurrentNumber(countdown);

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, setCountdown, onComplete]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      data-testid="countdown-overlay"
    >
      <div className="relative">
        <div
          key={currentNumber}
          className={cn(
            "text-[150px] md:text-[200px] font-display font-bold text-primary animate-countdown",
            countdown === 0 && "text-success"
          )}
        >
          {countdown === 0 ? "GO!" : currentNumber}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-primary/30",
              countdown === 0 && "border-success/30"
            )}
            style={{
              animation: `ping 1s cubic-bezier(0, 0, 0.2, 1) infinite`,
            }}
          />
        </div>
      </div>

      <div className="absolute bottom-8 text-center">
        <p className="text-lg text-muted-foreground animate-pulse">
          Get ready to type...
        </p>
      </div>
    </div>
  );
}
