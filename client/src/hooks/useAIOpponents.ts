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
  const { raceState, players, updatePlayer } = useGameStore();
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const progressRef = useRef<Map<string, number>>(new Map());

  const stopAllAI = useCallback(() => {
    intervalsRef.current.forEach((interval) => clearInterval(interval));
    intervalsRef.current.clear();
    progressRef.current.clear();
  }, []);

  const simulateTyping = useCallback(
    (playerId: string, config: AIConfig) => {
      const progressPerSecond = config.baseWpm / 60;
      const variance = (Math.random() - 0.5) * 2 * config.variance;
      const adjustedProgress = progressPerSecond + variance / 60;

      const currentProgress = progressRef.current.get(playerId) || 0;
      let newProgress = currentProgress + adjustedProgress / 10;

      if (Math.random() < config.errorRate / 10) {
        newProgress = Math.max(0, newProgress - 0.5);
      }

      newProgress = Math.min(100, newProgress);
      progressRef.current.set(playerId, newProgress);

      const estimatedWpm = config.baseWpm + (Math.random() - 0.5) * config.variance;

      updatePlayer(playerId, {
        progress: newProgress,
        wpm: Math.round(estimatedWpm),
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
    [updatePlayer]
  );

  useEffect(() => {
    if (raceState === "racing") {
      const aiPlayers = players.filter((p) => p.isAI);

      aiPlayers.forEach((player) => {
        const config = AI_CONFIGS[player.aiDifficulty || "steady"];
        progressRef.current.set(player.id, 0);

        const startDelay = Math.random() * 500;
        setTimeout(() => {
          const interval = setInterval(() => {
            simulateTyping(player.id, config);
          }, 100);
          intervalsRef.current.set(player.id, interval);
        }, startDelay);
      });
    } else if (raceState === "finished" || raceState === "waiting") {
      stopAllAI();
    }

    return () => {
      stopAllAI();
    };
  }, [raceState, players, simulateTyping, stopAllAI]);

  useEffect(() => {
    return () => {
      stopAllAI();
    };
  }, [stopAllAI]);

  return { stopAllAI };
}
