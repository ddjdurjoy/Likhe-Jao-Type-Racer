import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import type { P2PConnection } from "@/lib/p2pConnection";
import { useGameStore } from "@/lib/stores/gameStore";
import { useTypingEngine, type PracticeResultStats } from "@/hooks/useTypingEngine";
import { PracticeResults } from "@/components/game/PracticeResults";
import { useSound } from "@/hooks/useSound";

import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { Countdown } from "@/components/game/Countdown";
import { TypingInput } from "@/components/game/TypingInput";
import { Car } from "@/components/game/Car";
import { RaceTrack } from "@/components/game/RaceTrack";
import { Button } from "@/components/ui/button";

function getP2P(): P2PConnection | null {
  return (window as any).__p2pConnection || null;
}

function getRaceData(): any {
  return (window as any).__p2pRaceData || null;
}

export default function Race() {
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
    updatePlayer,
    countdown,
    setCountdown,
  } = useGameStore();

  const [p2p] = useState(() => getP2P());
  const [raceData] = useState(() => getRaceData());

  const myName = username?.trim() ? username.trim() : "Player";

  const words = useMemo(() => {
    const text: string = raceData?.text || "";
    const parts = text.split(/\s+/).map((w: string) => w.trim()).filter(Boolean);
    return parts.length ? parts : ["the", "quick", "brown", "fox"];
  }, [raceData]);

  const opponentId = "opponent";
  const sound = useSound();

  const [result, setResult] = useState<PracticeResultStats | null>(null);
  const [localPb, setLocalPb] = useState<number | null>(null);
  const [pbBeforeRun, setPbBeforeRun] = useState<number | null>(null);

  const pbKey = useMemo(() => {
    return `race-pb:${JSON.stringify({ mode: "p2p", language, difficulty, wordCount: words.length })}`;
  }, [language, difficulty, words.length]);

  const historyKey = useMemo(() => {
    return `race-history10:${JSON.stringify({ mode: "p2p", language, difficulty, wordCount: words.length })}`;
  }, [language, difficulty, words.length]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(pbKey);
      const n = raw ? Number(raw) : NaN;
      setLocalPb(Number.isFinite(n) ? n : null);
    } catch {
      setLocalPb(null);
    }
  }, [pbKey]);

  // Play win/lose sound when results appear
  useEffect(() => {
    if (!result) return;
    const won = players.find((p) => p.id === "player")?.position === 1;
    if (won) sound.play.victory();
    else sound.play.finish();
  }, [result]);

  // Initialize race state
  useEffect(() => {
    resetRace();

    // initRace sets just the local player; we'll add opponent after.
    initRace(
      {
        language,
        difficulty,
        wordCount: words.length,
        aiOpponents: 0,
      },
      words
    );

    // Ensure our name
    updatePlayer("player", { name: myName });

    // Add opponent (placeholder name until join message arrives)
    useGameStore.setState((s) => ({
      players: [
        ...s.players,
        {
          id: opponentId,
          name: raceData?.opponentName || "Opponent",
          carId: 2,
          progress: 0,
          wpm: 0,
          accuracy: 100,
          finished: false,
          position: 0,
          isAI: false,
        },
      ],
    }));

    setCountdown(3);
    setRaceState("countdown");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup P2P listeners
  useEffect(() => {
    if (!p2p) return;

    const onJoin = (data: any) => {
      if (data?.username) {
        updatePlayer(opponentId, { name: data.username });
      }
    };

    const onProgress = (data: any) => {
      // data: { username, progress, wpm, accuracy, finished }
      if (!data) return;
      updatePlayer(opponentId, {
        progress: Number(data.progress) || 0,
        wpm: Number(data.wpm) || 0,
        accuracy: Number(data.accuracy) || 0,
        finished: !!data.finished,
      });

      if (data.finished) {
        maybeFinish();
      }
    };

    const onFinish = (data: any) => {
      updatePlayer(opponentId, { finished: true, progress: 100 });
      maybeFinish();
    };

    p2p.on("join", onJoin);
    p2p.on("typing-progress", onProgress);
    p2p.on("race-finish", onFinish);

    return () => {
      p2p.off("join", onJoin);
      p2p.off("typing-progress", onProgress);
      p2p.off("race-finish", onFinish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2p]);

  const maybeFinish = () => {
    const ps = useGameStore.getState().players;
    const me = ps.find((x) => x.id === "player");
    const opp = ps.find((x) => x.id === opponentId);
    if (!me || !opp) return;

    if (me.finished || opp.finished) {
      useGameStore.setState({ raceState: "finished" as any });
      // positions
      const sorted = [me, opp].slice().sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
      sorted.forEach((p, idx) => useGameStore.getState().updatePlayer(p.id, { position: idx + 1 }));
    }
  };

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
  } = useTypingEngine({
    words,
    enabled: raceState === "racing",
    mode: "words",
    onWordComplete: () => {
      // Update local progress and broadcast to peer
      updatePlayer("player", { progress: stats.progress, wpm: stats.wpm, accuracy: stats.accuracy });
      p2p?.send({
        type: "typing-progress",
        data: { username: myName, progress: stats.progress, wpm: stats.wpm, accuracy: stats.accuracy },
      });
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
      p2p?.send({ type: "race-finish", data: { username: myName } });
      setRaceState("finished");
      maybeFinish();
    },
  });

  useEffect(() => {
    if (!startTime || isFinished) {
      setPbBeforeRun(localPb);
    }
  }, [startTime, isFinished, localPb]);

  const onCountdownComplete = () => {
    setRaceState("racing");
  };

  const exitToHome = () => {
    try {
      p2p?.disconnect();
    } catch {}
    (window as any).__p2pConnection = null;
    (window as any).__p2pRaceData = null;
    setLocation("/");
  };

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />

      <div className="relative z-10 p-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {language === "bn" ? "বন্ধুর সাথে রেস" : "Race with Friend"}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exitToHome}>
            {language === "bn" ? "হোম" : "Home"}
          </Button>
        </div>
      </div>

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
              <Button size="sm" onClick={exitToHome}>
                {language === "bn" ? "শেষ" : "Done"}
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
          onRestart={exitToHome}
          onContinue={() => {
            setResult(null);
            setTimeout(() => focusInput(), 0);
          }}
        />
      ) : null}
    </div>
  );
}
