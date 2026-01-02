import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/lib/stores/gameStore";
import { usePracticeStore } from "@/lib/stores/practiceStore";
import { useTypingEngine, type PracticeResultStats } from "@/hooks/useTypingEngine";
import { getNextText } from "@/lib/data/texts";

import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { PracticeTopBar } from "@/components/game/PracticeTopBar";
import { TypingInput } from "@/components/game/TypingInput";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PracticeResults } from "@/components/game/PracticeResults";
function makeSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
}

export default function Practice() {
  const { language } = useGameStore();
  const me = useQuery<any>({ queryKey: ["/api/auth/me"], retry: false });
  const [, setLocation] = useLocation();
  const {
    mode,
    timeSeconds,
    wordCount,
    customText,
    banglaInputMode,
    stopOnWordEnd,
  } = usePracticeStore();

  const [seed, setSeed] = useState(() => makeSeed());
  const [words, setWords] = useState<string[]>([]);
  const [result, setResult] = useState<PracticeResultStats | null>(null);
  // Time UI
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [localPb, setLocalPb] = useState<number | null>(null);
  const [serverPb, setServerPb] = useState<number | null>(null);
  const [pbBeforeRun, setPbBeforeRun] = useState<number | null>(null);


  // PB bucketing needs difficulty, so it is defined after difficultyForWords below.

  // Server PB currently supports only time buckets. For other modes, use local PB.
  const { data: pbRow } = useQuery<any>({
    queryKey: ["/api/practice/pb", language, timeSeconds, mode, me.data?.id],
    enabled: !!me.data?.id && mode === "time",
    queryFn: async () => {
      const res = await fetch(`/api/practice/pb?timeSeconds=${timeSeconds}&language=${language}`);
      if (!res.ok) throw new Error("Failed to load PB");
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (mode !== "time") {
      setServerPb(null);
      return;
    }
    if (pbRow && typeof pbRow.wpm === "number") setServerPb(Math.round(pbRow.wpm));
    else setServerPb(null);
  }, [pbRow, mode]);


  const formatClock = useCallback((totalSeconds: number, padMinutes = false) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const mm = padMinutes ? String(m).padStart(2, "0") : String(m);
    return `${mm}:${String(sec).padStart(2, "0")}`;
  }, []);


  type PbBucket = {
    language: string;
    mode: string;
    timeSeconds?: number;
    wordCount?: number;
  };

  const pbBucket: PbBucket = useMemo(() => {
    if (mode === "time") return { language, mode, timeSeconds };
    if (mode === "words") return { language, mode, wordCount };
    return { language, mode };
  }, [language, mode, timeSeconds, wordCount]);

  const pbKey = useMemo(() => {
    return `practice-pb:${JSON.stringify(pbBucket)}`;
  }, [pbBucket]);

  const historyKey = useMemo(() => {
    return `practice-history10:${JSON.stringify(pbBucket)}`;
  }, [pbBucket]);

  const generateWords = useCallback(() => {
    const s = makeSeed();
    setSeed(s);

    // Custom text mode: user-provided text.
    if (mode === "custom") {
      const cleaned = (customText || "")
        .replace(/\s+/g, " ")
        .trim();

      // split by spaces but keep punctuation attached (Monkeytype-like)
      const tokens = cleaned.length ? cleaned.split(" ") : [];
      setWords(tokens.length ? tokens : [language === "bn" ? "এখানে" : "paste", language === "bn" ? "টেক্সট" : "text"]);
      return;
    }

    // Always use paragraph/sentence practice for time/words.
    const { text } = getNextText(language);
    const tokens = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);

    // For words mode, respect wordCount.
    setWords(mode === "words" ? tokens.slice(0, wordCount) : tokens);
  }, [mode, language, wordCount, customText]);

  // regenerate when settings change
  useEffect(() => {
    setResult(null);
    generateWords();

    // Load local PB for this bucket
    try {
      const raw = localStorage.getItem(pbKey);
      const n = raw ? Number(raw) : NaN;
      setLocalPb(Number.isFinite(n) ? n : null);
    } catch {
      setLocalPb(null);
    }
  }, [generateWords, pbKey]);

  const {
    currentInput,
    currentWordIndex,
    inputHistory,
    stats,
    isFinished,
    inputRef,
    startTime,
    elapsedSeconds,
    handleKeyDown,
    handleChange,
    reset,
    focusInput,
    finish,
  } = useTypingEngine({
    words,
    enabled: true,
    mode,
    timeLimitSeconds: mode === "time" ? timeSeconds : null,
    stopOnWordEnd: mode === "time" ? stopOnWordEnd : true,
    banglaInputMode: language === "bn" ? banglaInputMode : "unicode",
    onRaceComplete: async (s) => {
      setResult(s);
      setRemainingTime(null);

      // Update local PB (always, bucketed)
      try {
        const nextPb = Math.max(localPb ?? 0, s.wpm);
        localStorage.setItem(pbKey, String(nextPb));
        setLocalPb(nextPb);
      } catch {
        // ignore
      }

      // Update local last-10 history for this bucket
      try {
        const raw = localStorage.getItem(historyKey);
        const prev = raw ? (JSON.parse(raw) as any[]) : [];
        const next = [{
          t: Date.now(),
          wpm: s.wpm,
          raw: s.rawWpm,
          acc: s.accuracy,
        }, ...prev]
          .slice(0, 10);
        localStorage.setItem(historyKey, JSON.stringify(next));
      } catch {
        // ignore
      }

      // If logged in, refetch server PB after posting (best-effort)
      // (query key includes time/language so it stays correct per bucket)
      me.refetch?.();

      // Auto-submit time-test results to leaderboard (auth required).
      try {
        const eligibleBucket = mode === "time" && [15, 30, 60, 120].includes(timeSeconds);
        if (eligibleBucket && s.accuracy >= 95 && me.data?.id) {
          await apiRequest("POST", "/api/practice/results", {
            mode: "time",
            timeSeconds,
            wpm: s.wpm,
            rawWpm: s.rawWpm,
            accuracy: s.accuracy,
            consistency: s.consistency,
            errors: Math.round(s.incorrectChars + s.missedChars + s.extraChars),
            language,
          });
        }
      } catch {
        // best-effort
      }

      // Note: keep Practice minimal like Monkeytype; no local history UI here.
      // Also avoid storing heavy wordResults/chart arrays in localStorage by default.
    },
  });

  // Snapshot PB at the start of a run, so results can display NEW PB correctly.
  useEffect(() => {
    if (!startTime || isFinished) {
      setPbBeforeRun(serverPb ?? localPb);
    }
  }, [startTime, isFinished, serverPb, localPb]);

  // Remaining time display
  useEffect(() => {
    if (mode !== "time") {
      setRemainingTime(null);
      return;
    }
    if (!startTime) {
      setRemainingTime(timeSeconds);
      return;
    }
    if (isFinished) {
      setRemainingTime(0);
      return;
    }

    const id = window.setInterval(() => {
      const spent = (Date.now() - startTime) / 1000;
      const left = Math.max(0, Math.ceil(timeSeconds - spent));
      setRemainingTime(left);
    }, 100);
    return () => window.clearInterval(id);
  }, [mode, timeSeconds, startTime, isFinished]);

  const handleRestart = useCallback(() => {
    setResult(null);
    reset();
    generateWords();
    setTimeout(() => focusInput(), 0);
  }, [reset, generateWords, focusInput]);

  // Keep focus in the typing area (Monkeytype feel)
  // - initial mount
  // - after words are regenerated (mode/time/language changes)
  useEffect(() => {
    setTimeout(() => focusInput(), 0);
  }, [focusInput, mode, timeSeconds, wordCount, language]);

  // Reset typing state when language changes mid-session
  // This prevents validation errors when switching languages during active typing
  useEffect(() => {
    if (startTime && !isFinished) {
      // User is actively typing, reset everything
      setResult(null);
      reset();
      generateWords();
    }
  }, [language]); // Only trigger on language change

  // Monkeytype-like restart shortcut (Tab)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        handleRestart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRestart]);


  return (
    <div className="relative min-h-screen bg-background flex flex-col overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <AnimatedBackground />
      </div>
      <div className="absolute inset-0 bg-background/60" aria-hidden />

      <main className="relative z-10 flex-1 min-h-0 flex flex-col p-3 sm:p-4 overflow-hidden">
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-8 sm:gap-10 pt-4 sm:pt-6 md:pt-10">
          <PracticeTopBar
            language={language}
            timerText={
              mode === "time"
                ? formatClock(remainingTime ?? timeSeconds, true)
                : startTime
                  ? formatClock(elapsedSeconds)
                  : null
            }
            timerTitle={
              mode === "time"
                ? language === "bn"
                  ? "অবশিষ্ট সময়"
                  : "Time remaining"
                : language === "bn"
                  ? "অতিক্রান্ত সময়"
                  : "Elapsed time"
            }
            timerUrgent={mode === "time" && (remainingTime ?? timeSeconds) <= 10 && (remainingTime ?? timeSeconds) >= 4}
            timerCritical={mode === "time" && (remainingTime ?? timeSeconds) <= 3 && (remainingTime ?? timeSeconds) >= 1}
            timerZero={mode === "time" && (remainingTime ?? timeSeconds) === 0}
            onRestart={handleRestart}
          />

          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="shrink-0">
              <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm tabular-nums text-muted-foreground">
                <div>
                  <span className="text-muted-foreground">wpm </span>
                  <span className="font-semibold text-foreground">{stats.wpm}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">acc </span>
                  <span className="font-semibold text-foreground">{stats.accuracy}%</span>
                </div>
                {mode === "time" && (serverPb ?? localPb) !== null && (
                  <div>
                    <span className="text-muted-foreground">pb </span>
                    <span className="font-semibold text-foreground">{serverPb ?? localPb}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {language === "bn" ? "টাইপ শুরু করতে ক্লিক করুন" : "Click to start typing"}
            </div>
          </div>

          <div>
            <TypingInput
              words={words}
              currentWordIndex={currentWordIndex}
              currentInput={currentInput}
              inputHistory={inputHistory}
              onKeyDown={handleKeyDown}
              onChange={handleChange}
              inputRef={inputRef as React.RefObject<HTMLInputElement>}
              disabled={isFinished}
            />
          </div>

          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <div className="tabular-nums">
              {mode === "time"
                ? (language === "bn" ? "টাইম" : "time")
                : (language === "bn" ? "শব্দ" : "words")}
              {" "}
              {mode === "time"
                ? formatClock(timeSeconds)
                : `${Math.min(currentWordIndex + 1, words.length)} / ${words.length}`}
            </div>
            <div className="tabular-nums">
              {language === "bn" ? "Tab = রিস্টার্ট" : "tab = restart"}
            </div>
          </div>
        </div>
      </main>

      {result && (
        <PracticeResults
          result={result}
          mode={mode}
          timeSeconds={timeSeconds}
          wordCount={wordCount}
          language={language}
          isAuthed={true}
          pb={serverPb ?? localPb}
          pbBeforeRun={pbBeforeRun}
          historyKey={historyKey}
          onGoToAuth={() => {}}
          onClose={() => setResult(null)}
          onRestart={handleRestart}
          onContinue={() => {
            setResult(null);
            setTimeout(() => focusInput(), 0);
          }}
        />
      )}
    </div>
  );
}
