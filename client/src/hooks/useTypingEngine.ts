import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useGameStore } from "@/lib/stores/gameStore";
import { BijoyProcessor } from "@/lib/utils/BijoyEngine";
import { soundManager } from "@/lib/utils/soundManager";
import type { TypingStats } from "@shared/schema";

export type TypingTestMode = "time" | "words" | "quote" | "zen" | "custom";

export type WordResult = {
  expected: string;
  typed: string;
  correct: boolean;

  // Per-word breakdown (grapheme-aware)
  incorrect: number;
  extra: number;
  missed: number;

  // 0 = perfect, 1 = minor, 2 = medium, 3 = major
  severity: 0 | 1 | 2 | 3;
};

export type TypingReplayEvent = {
  /** milliseconds since test start */
  t: number;
  /** event type */
  type: "input" | "delete" | "submit";
  /** for input: the character, for submit: the word */
  value?: string;
  /** current text state after this event */
  text: string;
};

export interface PracticeResultStats extends TypingStats {
  rawWpm: number;
  timeSeconds: number;
  consistency: number; // 0-100

  // Local-only replay events (Monkeytype-like watch replay)
  replay?: {
    version: 1;
    promptWords: string[];
    events: TypingReplayEvent[];
  };

  // Monkeytype-style character buckets
  correctWordChars: number;
  correctSpaces: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  spaces: number;

  // Monkeytype accuracy is based on keypress correctness
  accuracyCorrect: number;
  accuracyIncorrect: number;

  // Per-second charts (Monkeytype-like)
  chart?: {
    wpm: number[];
    raw: number[];
  };

  // Monkeytype-like word history (for heatmap)
  wordResults?: WordResult[];
}

interface UseTypingEngineProps {
  words: string[];
  onWordComplete?: (wordIndex: number) => void;
  onRaceComplete?: (stats: PracticeResultStats) => void;
  enabled?: boolean;

  mode?: TypingTestMode;
  timeLimitSeconds?: number | null;
  stopOnWordEnd?: boolean;

  // Optional: avoid coupling engine to Practice store.
  banglaInputMode?: "unicode" | "bijoy";
}

const normalizeNFC = (s: string) => (s ?? "").normalize("NFC");

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundTo2(n: number) {
  return Math.round(n * 100) / 100;
}

type CharCount = {
  spaces: number;
  correctWordChars: number;
  allCorrectChars: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  correctSpaces: number;
};

export function useTypingEngine({
  words,
  onWordComplete,
  onRaceComplete,
  enabled = true,
  mode = "words",
  timeLimitSeconds = null,
  stopOnWordEnd = true,
  banglaInputMode = "unicode",
}: UseTypingEngineProps) {
  const { language, soundEnabled, volume } = useGameStore();

  const [currentInput, setCurrentInput] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // Trigger periodic re-renders while a test is running so elapsed time/WPM/progress
  // remain accurate even if the user pauses typing.
  const [, forceTick] = useState(0);

  // Monkeytype keeps an input history of words.
  const inputHistoryRef = useRef<string[]>([]);

  // Monkeytype accuracy counters increment on keypress (not recomputed from words).
  const accuracyRef = useRef({ correct: 0, incorrect: 0 });

  // Consistency + charts: sample WPM/RAW each second.
  const wpmHistoryRef = useRef<number[]>([]);

  // Replay: store every keystroke event for accurate replay
  const replayEventsRef = useRef<TypingReplayEvent[]>([]);
  const rawHistoryRef = useRef<number[]>([]);
  const lastSampleAtRef = useRef<number | null>(null);

  const bijoyProcessor = useRef(new BijoyProcessor());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
    soundManager.setVolume(volume);
  }, [soundEnabled, volume]);

  // Keep stats reactive to real time, not just keystrokes.
  useEffect(() => {
    if (!startTime || isFinished) return;
    const id = window.setInterval(() => {
      forceTick((t) => (t + 1) % 1_000_000);
    }, 250);
    return () => window.clearInterval(id);
  }, [startTime, isFinished]);

  const elapsedSeconds = useMemo(() => {
    const st = startTimeRef.current ?? startTime;
    if (!st) return 0;
    const until = endTime ?? Date.now();
    return Math.max(0, (until - st) / 1000);
  }, [startTime, endTime]);

  const getInputWords = useCallback(
    (includeCurrent: boolean) => {
      const base = [...inputHistoryRef.current];
      if (includeCurrent) base.push(normalizeNFC(currentInput));
      return base;
    },
    [currentInput]
  );

  const getTargetWords = useCallback(
    (includeCurrent: boolean) => {
      const base = [...words];
      if (!includeCurrent) return base;
      // Ensure there's a target slot for the current word index.
      if (currentWordIndex < base.length) return base;
      // zen may extend; but if not present, append empty.
      return [...base, ""];
    },
    [words, currentWordIndex]
  );

  const expectedForCurrentWord = useCallback(() => {
    return normalizeNFC(words[currentWordIndex] || "");
  }, [words, currentWordIndex]);

  const splitGraphemes = useCallback(
    (text: string) => {
      if (!text) return [] as string[];
      const locale = language === "bn" ? "bn" : "en";
      try {
        // @ts-ignore
        if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
          // @ts-ignore
          const seg = new (Intl as any).Segmenter(locale, { granularity: "grapheme" });
          const out: string[] = [];
          // @ts-ignore
          for (const s of seg.segment(text)) out.push(s.segment);
          return out;
        }
      } catch {
        // ignore
      }
      return Array.from(text);
    },
    [language]
  );

  const countChars = useCallback(
    (final: boolean): CharCount => {
      // NOTE: All counts are grapheme-aware (important for Bangla).
      // WPM should be based on correct characters, not only fully correct words.
      let correctWordChars = 0;
      let correctChars = 0;
      let incorrectChars = 0;
      let extraChars = 0;
      let missedChars = 0;
      let spaces = 0;
      let correctSpaces = 0;

      const includeCurrent = !isFinished && startTime !== null;
      const inputWords = getInputWords(includeCurrent);
      const targetWords = getTargetWords(includeCurrent);

      for (let i = 0; i < inputWords.length; i++) {
        const inputWord = normalizeNFC(inputWords[i] || "");
        const targetWord = normalizeNFC(targetWords[i] || "");

        const typed = splitGraphemes(inputWord);
        const expected = splitGraphemes(targetWord);

        const minLen = Math.min(typed.length, expected.length);
        for (let c = 0; c < minLen; c++) {
          if (typed[c] === expected[c]) correctChars++;
          else incorrectChars++;
        }

        if (typed.length > expected.length) {
          extraChars += typed.length - expected.length;
        } else if (typed.length < expected.length) {
          // Monkeytype: in timed tests, the unfinished last word doesn't count missed chars.
          const isLast = i === inputWords.length - 1;
          const isTimedTest = mode === "time";
          const allowPartialLastWord = !final || (final && isTimedTest);

          if (!(isLast && allowPartialLastWord)) {
            missedChars += expected.length - typed.length;
          }
        }

        // fully correct word chars
        if (typed.length === expected.length && typed.every((v, idx) => v === expected[idx])) {
          correctWordChars += expected.length;
          if (i < inputWords.length - 1 && !inputWord.endsWith("\n")) {
            correctSpaces++;
          }
        }

        if (i < inputWords.length - 1) {
          spaces++;
        }
      }

      return {
        spaces,
        correctWordChars,
        allCorrectChars: correctChars,
        incorrectChars,
        extraChars,
        missedChars,
        correctSpaces,
      };
    },
    [getInputWords, getTargetWords, isFinished, startTime, mode, splitGraphemes]
  );

  const calculateAccuracy = useCallback(() => {
    // Monkeytype-style accuracy: correct typed characters / total typed characters.
    // We use grapheme-aware counts (important for Bangla).
    const chars = countChars(false);
    const totalTyped = chars.allCorrectChars + chars.incorrectChars + chars.extraChars + chars.spaces;
    // Spaces are user keypresses too; previously we counted them in totalTyped but not in correct,
    // so even perfect runs would show <100%.
    const correctTyped = chars.allCorrectChars + chars.spaces;
    const acc = (correctTyped / totalTyped) * 100;
    return Number.isFinite(acc) ? acc : 100;
  }, [countChars]);

  const calculateWpmAndRaw = useCallback(
    (secs: number, _final: boolean, withDecimalPoints?: boolean) => {
      // Match requested formula:
      //   WPM = completedWords / elapsedMinutes
      // where completedWords = number of submitted words.
      const minSeconds = 0.1;
      const testSeconds = Math.max(minSeconds, secs);
      const chars = countChars(false);

      const minutes = testSeconds / 60;
      const completedWords = inputHistoryRef.current.length;

      const wpm = roundTo2(completedWords / minutes);
      const raw = wpm;

      const wpmOut = clamp(wpm, 0, 500);
      const rawOut = clamp(raw, 0, 1000);

      return {
        wpm: withDecimalPoints ? wpmOut : Math.round(wpmOut),
        raw: withDecimalPoints ? rawOut : Math.round(rawOut),
        chars,
      };
    },
    [countChars]
  );

  const calculateProgress = useCallback((): number => {
    if (mode === "time") {
      if (!timeLimitSeconds || timeLimitSeconds <= 0) return 0;
      return Math.round(clamp((elapsedSeconds / timeLimitSeconds) * 100, 0, 100));
    }
    if (words.length === 0) return 0;
    return Math.round(clamp((currentWordIndex / words.length) * 100, 0, 100));
  }, [mode, timeLimitSeconds, elapsedSeconds, words.length, currentWordIndex]);

  const sampleConsistency = useCallback(() => {
    if (!startTime || isFinished) return;
    const now = Date.now();
    if (!lastSampleAtRef.current) lastSampleAtRef.current = now;
    if (now - lastSampleAtRef.current < 950) return;
    lastSampleAtRef.current = now;

    // Don't sample if less than 1 second has elapsed (prevents unrealistic WPM spikes)
    if (elapsedSeconds < 1) return;

    const { wpm, raw, chars } = calculateWpmAndRaw(elapsedSeconds, false, false);

    // Additional validation: cap at reasonable max values (500 WPM max, 1000 raw max)
    const cappedWpm = Math.min(wpm, 500);
    const cappedRaw = Math.min(raw, 1000);

    if (cappedWpm > 0 && cappedWpm <= 500) wpmHistoryRef.current.push(cappedWpm);
    if (cappedRaw > 0 && cappedRaw <= 1000) rawHistoryRef.current.push(cappedRaw);

  }, [
    startTime,
    isFinished,
    elapsedSeconds,
    calculateWpmAndRaw,
    currentInput,
    expectedForCurrentWord,
    splitGraphemes,
  ]);

  useEffect(() => {
    if (!startTime || isFinished) return;
    const id = window.setInterval(sampleConsistency, 250);
    return () => window.clearInterval(id);
  }, [startTime, isFinished, sampleConsistency]);

  const recordReplayEvent = useCallback(
    (type: "input" | "delete" | "submit", value?: string, textOverride?: string) => {
      if (!startTime) return;
      const now = Date.now();

      const current = normalizeNFC(textOverride ?? currentInput);
      const wordsSoFar = inputHistoryRef.current;
      const text = [...wordsSoFar, current].join(" ").trimEnd();

      replayEventsRef.current.push({
        t: now - startTime,
        type,
        value,
        text,
      });
    },
    [startTime, currentInput]
  );

  const computeConsistency = useCallback(() => {
    const samples = wpmHistoryRef.current;
    if (!samples.length) return 0;
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    if (mean <= 0) return 0;
    const variance = samples.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / samples.length;
    const stdev = Math.sqrt(variance);
    const score = 100 - (stdev / mean) * 100;
    return Math.round(clamp(score, 0, 100));
  }, []);

  const getStats = useCallback((): TypingStats => {
    // Match requested live formula: WPM = completedWords / elapsedMinutes
    const { chars } = calculateWpmAndRaw(elapsedSeconds, false, false);
    const acc = calculateAccuracy();

    const minutes = Math.max(1 / 60, elapsedSeconds / 60); // prevent division by 0
    const completedWords = inputHistoryRef.current.length;
    const liveWpm = Math.round(clamp(completedWords / minutes, 0, 500));

    // Keep TypingStats compatible: use Monkeytype effective correct chars and total typed chars.
    const correctChars = chars.correctWordChars + chars.correctSpaces;
    const totalChars = chars.allCorrectChars + chars.incorrectChars + chars.extraChars + chars.spaces;

    return {
      wpm: liveWpm,
      accuracy: Math.round(acc),
      correctChars,
      totalChars,
      progress: calculateProgress(),
    };
  }, [elapsedSeconds, calculateWpmAndRaw, calculateAccuracy, calculateProgress]);

  const computeWordResults = useCallback(
    (final: boolean) => {
      // Include current word in time tests (partial last word), similar to Monkeytype.
      const includeCurrent = (mode === "time" || mode === "zen") && !!currentInput;
      const typedWords = [...inputHistoryRef.current];
      if (includeCurrent) typedWords.push(normalizeNFC(currentInput));

      const results: WordResult[] = [];
      for (let i = 0; i < typedWords.length; i++) {
        const typed = normalizeNFC(typedWords[i] ?? "");
        const expected = normalizeNFC(words[i] ?? "");

        const t = splitGraphemes(typed);
        const e = splitGraphemes(expected);

        let incorrect = 0;
        let extra = 0;
        let missed = 0;

        const max = Math.max(t.length, e.length);
        for (let c = 0; c < max; c++) {
          const tc = t[c];
          const ec = e[c];
          if (ec === undefined && tc !== undefined) {
            extra++;
          } else if (tc === undefined && ec !== undefined) {
            // In time mode, Monkeytype doesn't penalize missed chars for the unfinished last word.
            if (final || mode !== "time") missed++;
          } else if (tc !== ec) {
            incorrect++;
          }
        }

        const mistakes = incorrect + extra + missed;
        const len = Math.max(1, e.length);
        const ratio = mistakes / len;

        // Severity buckets similar to Monkeytype heatmap feel.
        const severity: 0 | 1 | 2 | 3 =
          mistakes === 0
            ? 0
            : ratio <= 0.2 && mistakes <= 1
              ? 1
              : ratio <= 0.45 && mistakes <= 3
                ? 2
                : 3;

        results.push({
          expected,
          typed,
          correct: typed === expected,
          incorrect,
          extra,
          missed,
          severity,
        });
      }
      return results;
    },
    [mode, currentInput, words, splitGraphemes]
  );

  const finish = useCallback(
    (reason: "time" | "words" = "words") => {
      if (isFinished) return;
      const end = Date.now();
      setEndTime(end);
      setIsFinished(true);
      soundManager.playFinish();

      const st = startTimeRef.current ?? startTime;
      const secs = st ? Math.max(0.001, (end - st) / 1000) : 0;
      const finalElapsed = reason === "time" && timeLimitSeconds ? timeLimitSeconds : secs;

      // Ensure at least one sample for chart
      if (startTime && !wpmHistoryRef.current.length) {
        const { wpm, raw } = calculateWpmAndRaw(finalElapsed, false, false);
        if (wpm > 0) wpmHistoryRef.current.push(wpm);
        if (raw > 0) rawHistoryRef.current.push(raw);
      }

      const { wpm, raw, chars } = calculateWpmAndRaw(finalElapsed, true, true);

      // Safety cap: prevents pathological values (e.g., if a device reports weird timing).
      const cappedWpm = clamp(wpm, 0, 350);
      const cappedRaw = clamp(raw, 0, 450);
      const acc = roundTo2(calculateAccuracy());

      const final: PracticeResultStats = {
        wpm: cappedWpm,
        rawWpm: cappedRaw,
        accuracy: acc,
        progress: 100,

        // compatibility fields
        correctChars: chars.correctWordChars + chars.correctSpaces,
        totalChars: chars.allCorrectChars + chars.incorrectChars + chars.extraChars + chars.spaces,

        timeSeconds: roundTo2(finalElapsed),
        consistency: computeConsistency(),

        correctWordChars: chars.correctWordChars,
        correctSpaces: chars.correctSpaces,
        incorrectChars: chars.incorrectChars,
        extraChars: chars.extraChars,
        missedChars: chars.missedChars,
        spaces: chars.spaces,

        accuracyCorrect: accuracyRef.current.correct,
        accuracyIncorrect: accuracyRef.current.incorrect,

        chart: {
          wpm: [...wpmHistoryRef.current],
          raw: [...rawHistoryRef.current],
        },

        wordResults: computeWordResults(true),

        replay: {
          version: 1,
          promptWords: [...words],
          events: [...replayEventsRef.current],
        },
      };

      onRaceComplete?.(final);
    },
    [
      isFinished,
      startTime,
      timeLimitSeconds,
      calculateWpmAndRaw,
      calculateAccuracy,
      computeConsistency,
      computeWordResults,
      onRaceComplete,
      words,
    ]
  );

  // Time mode: auto-finish when time limit is reached.
  // If stopOnWordEnd=true, we wait until the user completes the current word.
  useEffect(() => {
    if (mode !== "time") return;
    if (!timeLimitSeconds || timeLimitSeconds <= 0) return;
    if (!startTime || isFinished) return;

    const checkTimeLimit = () => {
      const secs = (Date.now() - startTime) / 1000;
      if (secs >= timeLimitSeconds) {
        if (stopOnWordEnd) {
          // mark end time but don't finish until space submits the word
          setEndTime(startTime + timeLimitSeconds * 1000);
        } else {
          // Finish immediately when time runs out
          clearInterval(id);
          finish("time");
        }
      }
    };

    const id = window.setInterval(checkTimeLimit, 50); // Check more frequently for accuracy

    return () => window.clearInterval(id);
  }, [mode, timeLimitSeconds, startTime, isFinished, finish, stopOnWordEnd]);

  const recordAccuracyForAppend = useCallback(
    (prevText: string, nextText: string) => {
      if (!nextText.startsWith(prevText)) return;
      const expected = expectedForCurrentWord();
      const start = prevText.length;
      const added = nextText.slice(start);
      for (let i = 0; i < added.length; i++) {
        const typedChar = added[i];
        const expectedChar = expected[start + i];
        if (expectedChar !== undefined && typedChar === expectedChar) accuracyRef.current.correct++;
        else accuracyRef.current.incorrect++;
      }
    },
    [expectedForCurrentWord]
  );

  const startIfNeeded = () => {
    const st = startTimeRef.current ?? startTime;
    if (!st) {
      const now = Date.now();
      startTimeRef.current = now;
      setStartTime(now);
      // store an initial replay event at t=0
      replayEventsRef.current = [{ t: 0, type: "input", text: "" }];
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!enabled || isFinished) return;

      soundManager.resumeContext();

      // In time mode with stopOnWordEnd=false, prevent any input after time is up
      if (mode === "time" && !stopOnWordEnd && timeLimitSeconds && elapsedSeconds >= timeLimitSeconds) {
        e.preventDefault();
        return;
      }

      if (e.key === "Backspace") {
        soundManager.playBackspace();
        bijoyProcessor.current.reset();

        // Record backspace event for replay
        if (currentInput.length > 0) {
          recordReplayEvent("delete");
        }

        // After submitting a word, previous words are locked (Monkeytype default).
        // So we do NOT allow backspace to jump back to the previous word.
        return;
      }

      // Submit word on space ONLY (Monkeytype style)
      if (e.key === " ") {
        // Do not start the timer if user is just pressing space before typing.
        if (currentInput.length > 0) startIfNeeded();

        e.preventDefault();
        bijoyProcessor.current.reset();

        const typed = normalizeNFC(currentInput);
        inputHistoryRef.current.push(typed);

        const expected = expectedForCurrentWord();
        const isWordCorrect = typed === expected;
        if (isWordCorrect) soundManager.playWordComplete();
        else soundManager.playError();

        // Record word submit event for replay
        recordReplayEvent("submit", typed, "");

        const nextIndex = currentWordIndex + 1;
        setCurrentWordIndex(nextIndex);
        setCurrentInput("");
        onWordComplete?.(currentWordIndex);

        if (mode === "time") {
          // If time already ran out and we're configured to stop at word boundary, finish now.
          if (stopOnWordEnd && timeLimitSeconds && elapsedSeconds >= timeLimitSeconds) {
            finish("time");
            return;
          }

          // If the user finished all provided words before the timer ends, auto-finish now.
          if (nextIndex >= words.length) {
            finish("words");
            return;
          }
        }

        if (mode !== "time" && mode !== "zen" && nextIndex >= words.length) {
          finish("words");
        }
        return;
      }

      // Bijoy transliteration
      if (language === "bn" && banglaInputMode === "bijoy") {
        if (e.key.length > 1 || e.ctrlKey || e.altKey || e.metaKey) return;

        const result = bijoyProcessor.current.handleKeystroke(
          e.key,
          currentInput,
          e.currentTarget.selectionStart || currentInput.length
        );

        if (result) {
          // Only start timer when actual text is produced.
          if (result.updatedText.length > currentInput.length) startIfNeeded();

          e.preventDefault();
          recordAccuracyForAppend(currentInput, result.updatedText);
          
          // Record input event for replay
          if (result.updatedText.length > currentInput.length) {
            const addedText = result.updatedText.slice(currentInput.length);
            recordReplayEvent("input", addedText, result.updatedText);
          } else if (result.updatedText.length < currentInput.length) {
            recordReplayEvent("delete", undefined, result.updatedText);
          }
          
          setCurrentInput(result.updatedText);
          soundManager.playKeypress();

          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.selectionStart = result.updatedCursor;
              inputRef.current.selectionEnd = result.updatedCursor;
            }
          }, 0);
        }
      } else {
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          // Start timer on first actual character key press.
          startIfNeeded();
          // Record input event for replay (handled by onChange for non-bijoy)
          soundManager.playKeypress();
        }
      }
    },
    [
      enabled,
      isFinished,
      startTime,
      language,
      banglaInputMode,
      currentInput,
      currentWordIndex,
      words.length,
      mode,
      finish,
      expectedForCurrentWord,
      onWordComplete,
      recordAccuracyForAppend,
      stopOnWordEnd,
      timeLimitSeconds,
      elapsedSeconds,
      recordReplayEvent,
    ]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!enabled || isFinished) return;

      // In time mode with stopOnWordEnd=false, prevent any input after time is up
      if (mode === "time" && !stopOnWordEnd && timeLimitSeconds && elapsedSeconds >= timeLimitSeconds) {
        return;
      }

      const value = e.target.value;

      // Start timer only when user actually types something.
      if (!startTime && value.length > 0) {
        startIfNeeded();
      }

      if (value.length > currentInput.length) {
        recordAccuracyForAppend(currentInput, value);
        // Record input event for replay (character typed)
        const addedText = value.slice(currentInput.length);
        recordReplayEvent("input", addedText, value);
      } else if (value.length < currentInput.length) {
        // Record delete event for replay (backspace)
        recordReplayEvent("delete", undefined, value);
      }

      setCurrentInput(value);

      // If the user exactly matches the last word without pressing space, finish immediately.
      // (Works for time mode too; we don't want the user to wait for the timer.)
      if (mode !== "zen") {
        const isLastWord = currentWordIndex === words.length - 1;
        const expected = expectedForCurrentWord();
        const typed = normalizeNFC(value);
        if (isLastWord && typed === expected) {
          inputHistoryRef.current.push(typed);
          setCurrentWordIndex(words.length);
          setCurrentInput("");
          finish("words");
        }
      }
    },
    [
      enabled,
      isFinished,
      startTime,
      currentInput,
      recordAccuracyForAppend,
      mode,
      currentWordIndex,
      words.length,
      expectedForCurrentWord,
      finish,
      recordReplayEvent,
    ]
  );

  const reset = useCallback(() => {
    setCurrentInput("");
    setCurrentWordIndex(0);
    setStartTime(null);
    startTimeRef.current = null;
    setEndTime(null);
    setIsFinished(false);

    inputHistoryRef.current = [];
    accuracyRef.current = { correct: 0, incorrect: 0 };
    wpmHistoryRef.current = [];
    rawHistoryRef.current = [];
    lastSampleAtRef.current = null;

    replayEventsRef.current = [];

    bijoyProcessor.current.reset();
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return {
    currentInput,
    currentWordIndex,
    inputHistory: inputHistoryRef.current,
    stats: getStats(),
    isFinished,
    inputRef,
    startTime,
    elapsedSeconds,
    handleKeyDown,
    handleChange,
    reset,
    finish,
    focusInput,
  };
}
