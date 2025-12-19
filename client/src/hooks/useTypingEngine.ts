import { useState, useCallback, useRef, useEffect } from "react";
import { useGameStore } from "@/lib/stores/gameStore";
import { BijoyProcessor } from "@/lib/utils/BijoyEngine";
import { soundManager } from "@/lib/utils/soundManager";
import type { TypingStats } from "@shared/schema";

interface UseTypingEngineProps {
  words: string[];
  onWordComplete?: (wordIndex: number) => void;
  onRaceComplete?: (stats: TypingStats) => void;
  enabled?: boolean;
}

export function useTypingEngine({
  words,
  onWordComplete,
  onRaceComplete,
  enabled = true,
}: UseTypingEngineProps) {
  const [currentInput, setCurrentInput] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const { language, soundEnabled, volume } = useGameStore();
  const bijoyProcessor = useRef(new BijoyProcessor());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
    soundManager.setVolume(volume);
  }, [soundEnabled, volume]);

  const calculateWPM = useCallback((): number => {
    if (!startTime) return 0;
    const timeElapsed = (Date.now() - startTime) / 1000 / 60;
    if (timeElapsed === 0) return 0;
    const wordsTyped = correctChars / 5;
    return Math.round(wordsTyped / timeElapsed);
  }, [startTime, correctChars]);

  const calculateAccuracy = useCallback((): number => {
    if (totalChars === 0) return 100;
    return Math.round((correctChars / totalChars) * 100);
  }, [correctChars, totalChars]);

  const calculateProgress = useCallback((): number => {
    if (words.length === 0) return 0;
    return Math.round((currentWordIndex / words.length) * 100);
  }, [currentWordIndex, words.length]);

  const getStats = useCallback((): TypingStats => {
    return {
      wpm: calculateWPM(),
      accuracy: calculateAccuracy(),
      correctChars,
      totalChars,
      progress: calculateProgress(),
    };
  }, [calculateWPM, calculateAccuracy, correctChars, totalChars, calculateProgress]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!enabled || isFinished) return;

      if (!startTime) {
        setStartTime(Date.now());
      }

      soundManager.resumeContext();

      // Handle backspace
      if (e.key === "Backspace") {
        soundManager.playBackspace();
        bijoyProcessor.current.reset();
        // Allow default backspace behavior for both Bengali and English
        return;
      }

      // Handle space and enter
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        bijoyProcessor.current.reset();
        const normalize = (s: string) => (s ?? "").normalize("NFC");
        const currentWord = normalize(words[currentWordIndex]);

        if (normalize(currentInput) === currentWord) {
          soundManager.playWordComplete();
          setCorrectChars((prev) => prev + currentWord.length + 1);
          setTotalChars((prev) => prev + currentInput.length + 1);

          const nextIndex = currentWordIndex + 1;
          setCurrentWordIndex(nextIndex);
          setCurrentInput("");
          onWordComplete?.(currentWordIndex);

          if (nextIndex >= words.length) {
            setIsFinished(true);
            soundManager.playFinish();
            const stats = {
              wpm: calculateWPM(),
              accuracy: calculateAccuracy(),
              correctChars: correctChars + currentWord.length + 1,
              totalChars: totalChars + currentInput.length + 1,
              progress: 100,
            };
            onRaceComplete?.(stats);
          }
        } else {
          soundManager.playError();
          setErrors((prev) => prev + 1);
          setTotalChars((prev) => prev + currentInput.length);
        }
        return;
      }

      if (language === "bn") {
        if (e.key.length > 1 || e.ctrlKey || e.altKey || e.metaKey) return;

        const result = bijoyProcessor.current.handleKeystroke(
          e.key,
          currentInput,
          e.currentTarget.selectionStart || currentInput.length
        );

        if (result) {
          e.preventDefault();
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
          soundManager.playKeypress();
        }
      }
    },
    [
      enabled,
      isFinished,
      startTime,
      language,
      currentInput,
      currentWordIndex,
      words,
      onWordComplete,
      onRaceComplete,
      calculateWPM,
      calculateAccuracy,
      correctChars,
      totalChars,
    ]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!enabled || isFinished) return;

      const maybeFinishWithoutSpace = (nextInput: string) => {
        const isLastWord = currentWordIndex === words.length - 1;
        const normalize = (s: string) => (s ?? "").normalize("NFC");
        const currentWord = normalize(words[currentWordIndex] || "");
        if (isLastWord && normalize(nextInput) === currentWord) {
          // Finish without requiring trailing space
          setIsFinished(true);
          soundManager.playFinish();

          const finalStats = {
            wpm: calculateWPM(),
            accuracy: calculateAccuracy(),
            correctChars: correctChars + currentWord.length,
            totalChars: totalChars + nextInput.length,
            progress: 100,
          };

          // Move index to end and clear input for consistency
          setCurrentWordIndex(words.length);
          setCurrentInput("");

          onRaceComplete?.(finalStats);
        }
      };

      // For English, allow natural typing and backspace
      if (language === "en") {
        const value = e.target.value;
        setCurrentInput(value);
        maybeFinishWithoutSpace(value);
      } else {
        // For Bengali, allow backspace to work naturally
        // The value will be less than current when backspace is pressed
        if (e.target.value.length < currentInput.length) {
          setCurrentInput(e.target.value);
          maybeFinishWithoutSpace(e.target.value);
        }
      }
    },
    [
      enabled,
      isFinished,
      language,
      currentInput,
      currentWordIndex,
      words,
      correctChars,
      totalChars,
      calculateWPM,
      calculateAccuracy,
      onRaceComplete,
    ]
  );

  const reset = useCallback(() => {
    setCurrentInput("");
    setCurrentWordIndex(0);
    setCorrectChars(0);
    setTotalChars(0);
    setStartTime(null);
    setErrors(0);
    setIsFinished(false);
    bijoyProcessor.current.reset();
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return {
    currentInput,
    currentWordIndex,
    stats: getStats(),
    isFinished,
    errors,
    inputRef,
    handleKeyDown,
    handleChange,
    reset,
    focusInput,
  };
}
