import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getSocket } from "@/lib/socket";
import { LobbyPanel } from "@/components/game/LobbyPanel";
import { Countdown } from "@/components/game/Countdown";
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
    setPlayers,
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

  const [roomCode, setRoomCode] = useState<string>("");
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  const lobbyPlayersRef = useRef<any[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const lobbyEnterAtRef = useRef<number>(Date.now());

  const [showResults, setShowResults] = useState(false);
  const [finalStats, setFinalStats] = useState<TypingStats | null>(null);
  const [raceTime, setRaceTime] = useState(0);
  const [playerPosition, setPlayerPosition] = useState(1);
  const startTimeRef = useRef<number>(0);

  // Define startRace early so effects can reference it safely
  const startRace = useCallback(() => {
    soundManager.playRaceStart();
    setRaceState("racing");
    startTimeRef.current = Date.now();
    // Focus input after state change; avoid TDZ by not depending on inputRef in deps
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [setRaceState]);

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
        aiOpponents: 0,
      },
      raceWords
    );

    const socket = getSocket();
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const name = useGameStore.getState().username || "Player";

    if (code) {
      socket.emit("room:join", { code, name });
    } else {
      socket.emit("room:create", { name, isPublic });
    }

    socket.on("room:created", (state: any) => {
      setRoomCode(state.code);
      setHostId(state.hostId);
      setLobbyPlayers(state.players);
      setRaceState("waiting");
    });

    socket.on("room:joined", (state: any) => {
      setRoomCode(state.code);
      setHostId(state.hostId);
      setLobbyPlayers(state.players);
      setRaceState("waiting");
    });

    socket.on("room:update", (state: any) => {
      const list = state.players.map((p: any) => ({...p, isHost: p.id === state.hostId}));
      setLobbyPlayers(list);
      lobbyPlayersRef.current = list;
      setHostId(state.hostId);
      setIsPublic(!!state.isPublic);
      setRoomCode(state.code);
      if (state.players.length >= state.max && state.status === 'countdown') {
        setRaceState('countdown');
      }
    });

    socket.on("race:countdown", ({ from }: any) => {
      setRaceState('countdown');
      try { useGameStore.getState().setCountdown(from ?? 3); } catch {}
    });

    socket.on("race:start", () => {
      // Build AI players from latest lobby state (bots only)
      const list = lobbyPlayersRef.current || [];
      const bots = list.filter((p: any) => String(p.id).startsWith("bot-")).map((p: any, i: number) => ({
        id: p.id,
        name: p.name || `Bot ${i + 1}`,
        carId: (i + 2) % 5,
        progress: 0,
        wpm: 0,
        accuracy: 95 + Math.random() * 5,
        finished: false,
        position: 0,
        isAI: true,
        aiDifficulty: (["rookie", "steady", "speedy"] as const)[i % 3],
      }));
      // Preserve the local player entry
      const current = useGameStore.getState().players;
      const me = current.find((p) => p.id === "player");
      if (me) setPlayers([me, ...bots]);
      else setPlayers(bots);
      startRace();
    });

    socket.on("room:chat", () => {});

    return () => {
      socket.off("room:created");
      socket.off("room:joined");
      socket.off("room:update");
      socket.off("race:countdown");
      socket.off("race:start");
    };
  }, [language, difficulty, initRace, setRaceState, startRace]);

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

  // Lobby logic handled by server via socket events.
  // Auto-fill with bots only occurs when host clicks "Start now with bots".


  const socket = useMemo(() => getSocket(), []);
  const isHost = useMemo(() => hostId === (socket as any).id, [hostId, socket]);

  const startWithBots = useCallback(() => {
    socket.emit("room:startWithBots");
  }, [socket]);

  const togglePrivacy = useCallback((value: boolean) => {
    socket.emit("room:updatePrivacy", { isPublic: value });
  }, [socket]);

  const startAnyway = useCallback(() => {
    socket.emit("room:startAnyway");
  }, [socket]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 pt-safe border-b border-border bg-card/50 sticky top-0">
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

      <main className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 gap-3 sm:gap-4">
        <div className="flex-1 min-h-0">
         <div className="h-full relative">
           <AnimatedBackground wpm={stats.wpm} showCelestial />
           <RaceTrack />
           {raceState === 'waiting' && (
             <LobbyPanel
               roomCode={roomCode}
               players={lobbyPlayers}
               isHost={isHost}
               onStartWithBots={startWithBots}
               onStartAnyway={startAnyway}
               canStartAnyway={(() => {
                 const real = (lobbyPlayers || []).filter((p: any) => !String(p.id).startsWith("bot-")).length;
                 const elapsed = Date.now() - lobbyEnterAtRef.current;
                 return real >= 2 && real < 5 && elapsed >= 8000;
               })()}
               waitingCount={Math.max(0, 5 - lobbyPlayers.length)}
             />
           )}
           {raceState === 'countdown' && (
             <Countdown onComplete={startRace} />
           )}
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
