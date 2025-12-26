import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "@/lib/stores/gameStore";
import { useTypingEngine, type PracticeResultStats } from "@/hooks/useTypingEngine";
import { PracticeResults } from "@/components/game/PracticeResults";
import { useSound } from "@/hooks/useSound";
import { useAIOpponents } from "@/hooks/useAIOpponents";
import { getRandomWords } from "@/lib/data/words";

import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { Countdown } from "@/components/game/Countdown";
import { TypingInput } from "@/components/game/TypingInput";
import { Car } from "@/components/game/Car";
import { RaceTrack } from "@/components/game/RaceTrack";
import { Button } from "@/components/ui/button";

function makeSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
}

export default function BotRace() {
  const [, setLocation] = useLocation();

  const {
    language,
    difficulty,
    username,
    players,
    raceState,
    setRaceState,
    resetRace,
    initRace,
    setWords,
    updatePlayer,
    countdown,
    setCountdown,
  } = useGameStore();

  // Ensure a name exists (should be set from Home), but keep a safe fallback.
  const displayName = username?.trim() ? username.trim() : "Player";

  const [seed, setSeed] = useState(makeSeed());
  const wordCount = 35;
  const sound = useSound();

  const [result, setResult] = useState<PracticeResultStats | null>(null);
  const [localPb, setLocalPb] = useState<number | null>(null);
  const [pbBeforeRun, setPbBeforeRun] = useState<number | null>(null);

  const words = useMemo(() => {
    return getRandomWords(language, difficulty, wordCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, difficulty, seed]);

  const pbKey = useMemo(() => {
    return `race-pb:${JSON.stringify({ mode: "bot", language, difficulty, wordCount })}`;
  }, [language, difficulty, wordCount]);

  const historyKey = useMemo(() => {
    return `race-history10:${JSON.stringify({ mode: "bot", language, difficulty, wordCount })}`;
  }, [language, difficulty, wordCount]);

  useEffect(() => {
    // Load local PB for this bucket
    try {
      const raw = localStorage.getItem(pbKey);
      const n = raw ? Number(raw) : NaN;
      setLocalPb(Number.isFinite(n) ? n : null);
    } catch {
      setLocalPb(null);
    }
  }, [pbKey]);

  // Typing engine drives the player's progress.
  const {
    currentInput,
    currentWordIndex,
    inputHistory,
    stats,
    isFinished,
    inputRef,
    startTime,
    handleKeyDown,
    handleChange,
    focusInput,
    reset: resetTyping,
  } = useTypingEngine({
    words,
    enabled: raceState === "racing",
    mode: "words",
    onWordComplete: () => {
      // Update player progress based on engine progress.
      updatePlayer("player", { progress: stats.progress, wpm: stats.wpm, accuracy: stats.accuracy });
    },
    onRaceComplete: (s) => {
      setResult(s);

      // Update local PB
      try {
        const nextPb = Math.max(localPb ?? 0, s.wpm);
        localStorage.setItem(pbKey, String(nextPb));
        setLocalPb(nextPb);
      } catch {
        // ignore
      }

      // Update local last-10 history
      try {
        const raw = localStorage.getItem(historyKey);
        const prev = raw ? (JSON.parse(raw) as any[]) : [];
        const next = [{ t: Date.now(), wpm: s.wpm, raw: s.rawWpm, acc: s.accuracy }, ...prev].slice(0, 10);
        localStorage.setItem(historyKey, JSON.stringify(next));
      } catch {
        // ignore
      }

      updatePlayer("player", { progress: 100, finished: true });
      setRaceState("finished");
    },
  });

  // Snapshot PB at the start of a run, so results can display NEW PB correctly.
  useEffect(() => {
    if (!startTime || isFinished) {
      setPbBeforeRun(localPb);
    }
  }, [startTime, isFinished, localPb]);

  // AI simulation (reads current players from store)
  // Only one opponent in Bot Race.
  useAIOpponents(wordCount);

  // Play win/lose sound when results appear
  useEffect(() => {
    if (!result) return;
    const won = players.find((p) => p.id === "player")?.position === 1;
    if (won) sound.play.victory();
    else sound.play.finish();
  }, [result]);

  const startNewRace = () => {
    // Clear local result UI and reset typing engine internal state.
    setResult(null);
    resetTyping();

    // Reset any previous race state
    resetRace();

    const raceWords = words;
    setWords(raceWords);

    // Initialize base race (local player only). We'll add exactly one computer opponent.
    initRace(
      {
        language,
        difficulty,
        wordCount: raceWords.length,
        aiOpponents: 0,
      },
      raceWords
    );

    // Ensure player name is applied
    updatePlayer("player", { name: displayName });

    // Add a single AI opponent ("computer") so Bot Race always has exactly 2 cars.
    useGameStore.setState((s) => ({
      players: [
        ...s.players,
        {
          id: "ai-0",
          name: language === "bn" ? "\u0995\u09ae\u09cd\u09aa\u09bf\u0989\u099f\u09be\u09b0" : "Computer",
          carId: 2,
          progress: 0,
          wpm: 0,
          accuracy: 100,
          finished: false,
          position: 0,
          isAI: true,
          aiDifficulty: "steady",
        },
      ],
    }));

    // Restart countdown
    setCountdown(3);
    setRaceState("countdown");

    // focus input after UI updates
    setTimeout(() => focusInput(), 0);
  };

  // Initialize race state and allow restart by regenerating seed
  useEffect(() => {
    startNewRace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, language, difficulty]);

  // When countdown ends, start racing
  const onCountdownComplete = () => {
    setRaceState("racing");
  };

  // In Bot Race, let the player continue typing even if the AI finishes first.
  // We only end the race when the PLAYER finishes (so results always show).
  useEffect(() => {
    if (raceState !== "racing") return;
    const ps = useGameStore.getState().players;
    const me = ps.find((p) => p.id === "player");
    if (!me) return;

    if (me.finished) {
      setRaceState("finished");
    }
  }, [raceState, players, setRaceState]);

  // Determine finishing positions
  useEffect(() => {
    if (raceState !== "finished") return;

    const finishedPlayers = [...useGameStore.getState().players];
    const sorted = finishedPlayers
      .slice()
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));

    sorted.forEach((p, idx) => {
      useGameStore.getState().updatePlayer(p.id, { position: idx + 1 });
    });
  }, [raceState]);

  const handleRestart = () => {
    // Force a fresh race (new words + fully reset engine/store).
    setSeed(makeSeed());
  };

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />

      {/* Top bar */}
      <div className="relative z-10 p-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {language === "bn" ? "কম্পিউটারের সাথে রেস" : "Race vs Computer"}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/")}
          >
            {language === "bn" ? "হোম" : "Home"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRestart}>
            {language === "bn" ? "আবার" : "Restart"}
          </Button>
        </div>
      </div>

      {/* Track + cars */}
      <div className="relative z-10 mx-auto max-w-5xl px-4">
        <RaceTrack laneCount={players.length}>
          {players.map((p, idx) => (
            <Car
              key={p.id}
              carId={p.carId}
              progress={p.progress}
              wpm={p.wpm}
              playerName={p.name}
              isPlayer={p.id === "player"}
              isAI={p.isAI}
              position={p.position}
              lane={idx}
              laneCount={players.length}
              isRacing={raceState === "racing"}
            />
          ))}
        </RaceTrack>
      </div>

      {/* Typing area */}
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-xl border border-card-border bg-background/40 backdrop-blur p-4">
          <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground tabular-nums">
            <div>
              <span className="mr-3">wpm <span className="text-foreground font-semibold">{stats.wpm}</span></span>
              <span>acc <span className="text-foreground font-semibold">{stats.accuracy}%</span></span>
            </div>
            <div>
              <span>{Math.min(currentWordIndex + 1, words.length)} / {words.length}</span>
            </div>
          </div>

          <TypingInput
            words={words}
            currentWordIndex={currentWordIndex}
            currentInput={currentInput}
            inputHistory={inputHistory}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            inputRef={inputRef as React.RefObject<HTMLInputElement>}
            disabled={raceState !== "racing" || isFinished}
          />

          {raceState === "finished" && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm">
                {language === "bn" ? "রেস শেষ!" : "Race finished!"}
              </div>
              <Button size="sm" onClick={handleRestart}>
                {language === "bn" ? "আবার খেলুন" : "Play again"}
              </Button>
            </div>
          )}
        </div>
      </main>

      {raceState === "countdown" && <Countdown onComplete={onCountdownComplete} />}

      {result ? (
        <PracticeResults
          result={result}
          mode="words"
          timeSeconds={0}
          wordCount={words.length}
          language={language}
          isAuthed={false}
          pb={localPb}
          pbBeforeRun={pbBeforeRun}
          historyKey={historyKey}
          headerAddon={
            <div className="text-sm text-muted-foreground">
              {players.find((p) => p.id === "player")?.position === 1
                ? (language === "bn" ? "আপনি জিতেছেন!" : "You won!")
                : (language === "bn" ? "আপনি হেরেছেন" : "You lost")}
            </div>
          }
          extraStats={[
            {
              label: language === "bn" ? "স্থান" : "Place",
              value: players.find((p) => p.id === "player")?.position || "-",
              highlight: players.find((p) => p.id === "player")?.position === 1,
            },
          ]}
          onGoToAuth={() => {}}
          onClose={() => setResult(null)}
          onRestart={handleRestart}
          onContinue={() => {
            setResult(null);
            setTimeout(() => focusInput(), 0);
          }}
        />
      ) : null}
    </div>
  );
}
