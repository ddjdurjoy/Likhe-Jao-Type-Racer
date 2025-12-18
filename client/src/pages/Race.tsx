import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useGameStore } from "@/lib/stores/gameStore";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { useAIOpponents } from "@/hooks/useAIOpponents";
import { getRandomWords } from "@/lib/data/words";
import { soundManager } from "@/lib/utils/soundManager";
import { apiRequest } from "@/lib/queryClient";
import { RaceTrack } from "@/components/game/RaceTrack";
import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { TypingInput } from "@/components/game/TypingInput";
import { StatsDisplay, RaceResults } from "@/components/game/StatsDisplay";
import { Countdown } from "@/components/game/Countdown";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flag } from "lucide-react";
import type { TypingStats, InsertRaceResult } from "@shared/schema";

const WORD_COUNT = 20;

export default function Race() {
  const [, setLocation] = useLocation();
  const {
    raceState,
    setRaceState,
    players,
    updatePlayer,
    words,
    language,
    difficulty,
    initRace,
    resetRace,
    recordRaceResult,
    soundEnabled,
    volume,
  } = useGameStore();

  const [showResults, setShowResults] = useState(false);
  const [finalStats, setFinalStats] = useState<TypingStats | null>(null);
  const [raceTime, setRaceTime] = useState(0);
  const [playerPosition, setPlayerPosition] = useState(1);
  const startTimeRef = useRef<number>(0);

  const saveRaceResultMutation = useMutation({
    mutationFn: async (raceResult: InsertRaceResult) => {
      return apiRequest("POST", "/api/races", raceResult);
    },
  });

  useAIOpponents(WORD_COUNT);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
    soundManager.setVolume(volume);
  }, [soundEnabled, volume]);

  useEffect(() => {
    const raceWords = getRandomWords(language, difficulty, WORD_COUNT);
    initRace(
      {
        language,
        difficulty,
        wordCount: WORD_COUNT,
        aiOpponents: 3,
      },
      raceWords
    );
  }, [language, difficulty, initRace]);

  const handleWordComplete = useCallback(
    (wordIndex: number) => {
      // No-op because progress is derived in the throttled effect
      // This avoids double updates that can cause loops
    },
    []
  );

  const handleRaceComplete = useCallback(
    (stats: TypingStats) => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setFinalStats(stats);
      setRaceTime(elapsed);

      updatePlayer("player", {
        progress: 100,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        finished: true,
      });

      const finishedPlayers = players.filter((p) => p.finished || p.id === "player");
      const position = finishedPlayers.length;
      setPlayerPosition(position);

      const won = position === 1;
      recordRaceResult(stats.wpm, stats.accuracy, won);

      saveRaceResultMutation.mutate({
        oderId: "guest",
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        position,
        language,
        difficulty,
        wordsTyped: words.length,
        raceTime: elapsed,
      });

      if (won) {
        soundManager.playVictory();
      }

      setRaceState("finished");
      setShowResults(true);
    },
    [players, updatePlayer, recordRaceResult, setRaceState, saveRaceResultMutation, language, difficulty, words.length]
  );

  const {
    currentInput,
    currentWordIndex,
    stats,
    inputRef,
    handleKeyDown,
    handleChange,
    reset: resetTyping,
  } = useTypingEngine({
    words,
    onWordComplete: handleWordComplete,
    onRaceComplete: handleRaceComplete,
    enabled: raceState === "racing",
  });

  // Throttle store updates to avoid render-update loops
  const lastSentRef = useRef<{ progress: number; wpm: number; accuracy: number } | null>(null);
  useEffect(() => {
    if (raceState !== "racing") return;

    const progress = (currentWordIndex / words.length) * 100;
    const next = { progress, wpm: stats.wpm, accuracy: stats.accuracy };
    const prev = lastSentRef.current;

    const changed =
      !prev ||
      Math.abs(prev.progress - next.progress) > 0.0001 ||
      prev.wpm !== next.wpm ||
      prev.accuracy !== next.accuracy;

    if (changed) {
      lastSentRef.current = next;
      updatePlayer("player", next);
    }
  }, [currentWordIndex, stats.wpm, stats.accuracy, words.length, raceState, updatePlayer]);

  const handleCountdownComplete = useCallback(() => {
    setRaceState("racing");
    startTimeRef.current = Date.now();
    inputRef.current?.focus();
  }, [setRaceState, inputRef]);

  const handlePlayAgain = useCallback(() => {
    resetRace();
    resetTyping();
    setShowResults(false);
    setFinalStats(null);

    const raceWords = getRandomWords(language, difficulty, WORD_COUNT);
    initRace(
      {
        language,
        difficulty,
        wordCount: WORD_COUNT,
        aiOpponents: 3,
      },
      raceWords
    );
  }, [resetRace, resetTyping, language, difficulty, initRace]);

  const handleGoHome = useCallback(() => {
    resetRace();
    setLocation("/");
  }, [resetRace, setLocation]);

  const handleExit = useCallback(() => {
    resetRace();
    setLocation("/");
  }, [resetRace, setLocation]);

  const player = players.find((p) => p.id === "player");
  const currentPosition =
    players.filter((p) => p.progress > (player?.progress || 0)).length + 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-card/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          className="gap-2"
          data-testid="button-exit-race"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit
        </Button>

        <div className="flex items-center gap-4">
          {raceState === "racing" && (
            <StatsDisplay stats={stats} position={currentPosition} totalPlayers={players.length} compact />
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Flag className="w-4 h-4" />
          <span>{currentWordIndex}/{words.length}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 p-4 gap-4">
        <div className="flex-1 min-h-0">
          <div className="h-full relative">
            <AnimatedBackground />
            <RaceTrack />
          </div>
        </div>

        <div className="space-y-4">
          <StatsDisplay
            stats={stats}
            position={currentPosition}
            totalPlayers={players.length}
          />

          <TypingInput
            words={words}
            currentWordIndex={currentWordIndex}
            currentInput={currentInput}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            inputRef={inputRef as React.RefObject<HTMLInputElement>}
            disabled={raceState !== "racing"}
          />
        </div>
      </main>

      {raceState === "countdown" && (
        <Countdown onComplete={handleCountdownComplete} />
      )}

      {showResults && finalStats && (
        <RaceResults
          stats={finalStats}
          position={playerPosition}
          totalPlayers={players.length}
          raceTime={raceTime}
          onPlayAgain={handlePlayAgain}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}
