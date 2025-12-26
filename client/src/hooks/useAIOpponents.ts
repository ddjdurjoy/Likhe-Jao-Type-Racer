import { useEffect, useRef, useCallback } from "react";
import { useGameStore } from "@/lib/stores/gameStore";

interface AIConfig {
  baseWpm: number;
  variance: number;
  errorRate: number;
  recoveryTime: number;
}

const AI_CONFIGS: Record<string, AIConfig> = {
  rookie: { baseWpm: 25, variance: 5, errorRate: 0.15, recoveryTime: 2000 },
  steady: { baseWpm: 45, variance: 8, errorRate: 0.08, recoveryTime: 1500 },
  speedy: { baseWpm: 70, variance: 12, errorRate: 0.05, recoveryTime: 1000 },
};

export function useAIOpponents(wordCount: number) {
  const raceState = useGameStore((s) => s.raceState);
  const updatePlayer = useGameStore((s) => s.updatePlayer);
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const progressRef = useRef<Map<string, number>>(new Map());
  const aiSnapshotRef = useRef<Array<{ id: string; aiDifficulty: keyof typeof AI_CONFIGS }>>([]);

  const stopAllAI = useCallback(() => {
    intervalsRef.current.forEach((interval, key) => {
      // Clear both intervals and any timeouts stored
      clearInterval(interval as any);
      clearTimeout(interval as any);
    });
    intervalsRef.current.clear();
    progressRef.current.clear();
  }, []);

  const simulateTyping = useCallback(
    (playerId: string, config: AIConfig) => {
      const state = useGameStore.getState();
      const me = state.players.find((p) => p.id === "player");
      const myWpm = me?.wpm ?? 0;
      const myProgress = me?.progress ?? 0;

      const currentProgress = progressRef.current.get(playerId) || 0;

      // Adaptive AI (rubber-banding): aim slightly above/below the player depending on difficulty
      // and dynamically adjust based on progress gap.
      const difficultyBias =
        config.baseWpm >= 65 ? 1.06 : config.baseWpm >= 40 ? 1.02 : 0.98;

      const gap = myProgress - currentProgress; // +gap => AI behind
      const gapBoost = Math.max(-0.12, Math.min(0.18, gap * 0.01));

      const targetWpmBase = myWpm > 0 ? myWpm * (difficultyBias + gapBoost) : config.baseWpm;
      const jitter = (Math.random() - 0.5) * 2 * config.variance;

      // Clamp AI to a reasonable range so it still feels like a personality.
      const minWpm = Math.max(10, config.baseWpm * 0.7);
      const maxWpm = config.baseWpm * 1.45;
      const targetWpm = Math.max(minWpm, Math.min(maxWpm, targetWpmBase + jitter));

      // Convert WPM -> progress/sec for a words race. Approx: 1 word = 5 chars.
      // progress is % of total words.
      const wordsPerSecond = targetWpm / 60;
      const progressPerSecond = (wordsPerSecond / Math.max(1, wordCount)) * 100;

      // Physics-like smoothing: integrate small dt (tick=0.1s)
      let newProgress = currentProgress + progressPerSecond * 0.1;

      // Occasional "mistake" slows momentarily.
      if (Math.random() < config.errorRate * 0.1) {
        newProgress = Math.max(0, newProgress - 0.25);
      }

      newProgress = Math.min(100, newProgress);
      progressRef.current.set(playerId, newProgress);

      updatePlayer(playerId, {
        progress: newProgress,
        wpm: Math.round(targetWpm),
        finished: newProgress >= 100,
      });

      if (newProgress >= 100) {
        const interval = intervalsRef.current.get(playerId);
        if (interval) {
          clearInterval(interval);
          intervalsRef.current.delete(playerId);
        }
      }
    },
    [updatePlayer, wordCount]
  );

  useEffect(() => {
    // Reset any existing timers when (re)starting
    stopAllAI();
    if (raceState === "racing") {
      const snapshotPlayers = useGameStore.getState().players;
      const aiPlayers = snapshotPlayers.filter((p) => p.isAI);
      aiSnapshotRef.current = aiPlayers.map((p) => ({ id: p.id, aiDifficulty: (p.aiDifficulty || "steady") as keyof typeof AI_CONFIGS }));

      aiSnapshotRef.current.forEach((player) => {
        const config = AI_CONFIGS[player.aiDifficulty];
        progressRef.current.set(player.id, 0);

        const startDelay = Math.random() * 500;
        const timeout = setTimeout(() => {
          const interval = setInterval(() => {
            simulateTyping(player.id, config);
          }, 100);
          intervalsRef.current.set(player.id, interval);
        }, startDelay);
        // Store timeout cleanup as an interval for simplicity
        intervalsRef.current.set(`${player.id}-timeout` as any, timeout as any);
      });
    } else if (raceState === "finished" || raceState === "waiting") {
      stopAllAI();
    }

    return () => {
      stopAllAI();
    };
  }, [raceState, simulateTyping, stopAllAI]);

  useEffect(() => {
    return () => {
      stopAllAI();
    };
  }, [stopAllAI]);

  return { stopAllAI };
}
