import { useEffect, useMemo } from "react";
import { useGameStore } from "@/lib/stores/gameStore";
import { soundManager } from "@/lib/utils/soundManager";

export type UseSoundApi = {
  play: {
    keypress: () => void;
    error: () => void;
    wordComplete: () => void;
    countdownBeep: () => void;
    countdownGo: () => void;
    countdownSequence: () => void;
    raceStart: () => void;
    victory: () => void;
    finish: () => void;
    powerUp: () => void;
    engineHum: (duration?: number) => void;
    boost: () => void;
  };
  ambient: {
    start: () => void;
    stop: () => void;
  };
  ensureUnlocked: () => void;
};

export function useSound(): UseSoundApi {
  const { soundEnabled, volume } = useGameStore();

  // Sync store -> sound manager
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    soundManager.setVolume(volume);
  }, [volume]);

  // Ensure user-gesture unlock of AudioContext
  const ensureUnlocked = () => {
    try { soundManager.resumeContext(); } catch {}
  };

  const api = useMemo<UseSoundApi>(() => ({
    play: {
      keypress: () => soundManager.playKeypress(),
      error: () => soundManager.playError(),
      wordComplete: () => soundManager.playWordComplete(),
      countdownBeep: () => soundManager.playCountdownBeep(),
      countdownGo: () => soundManager.playCountdownGo(),
      countdownSequence: () => soundManager.playCountdownSequence(),
      raceStart: () => soundManager.playRaceStart(),
      victory: () => soundManager.playVictory(),
      finish: () => soundManager.playFinish(),
      powerUp: () => soundManager.playPowerUp(),
      engineHum: (d?: number) => soundManager.playEngineHum(d ?? 0.5),
      boost: () => soundManager.playBoost(),
    },
    ambient: {
      start: () => soundManager.startAmbientMusic(),
      stop: () => soundManager.stopAmbientMusic(),
    },
    ensureUnlocked,
  }), []);

  return api;
}
