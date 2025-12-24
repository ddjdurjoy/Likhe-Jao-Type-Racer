import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  X 
} from "lucide-react";

export type ReplayEvent = {
  /** milliseconds since test start */
  t: number;
  /** 'input' = character typed, 'delete' = backspace */
  type: "input" | "delete" | "submit";
  /** for input: the character, for submit: the word */
  value?: string;
  /** current text state after this event */
  text: string;
};

export type ReplayData = {
  version: 1;
  promptWords: string[];
  events: ReplayEvent[];
};

interface ReplayViewerProps {
  replay: ReplayData;
  language: "en" | "bn";
  onClose: () => void;
}

export function ReplayViewer({ replay, language, onClose }: ReplayViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [eventIndex, setEventIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const lastTickRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  const events = replay.events;
  const currentEvent = events[eventIndex] || events[0];
  const currentText = currentEvent?.text || "";
  const currentTime = currentEvent?.t || 0;
  const totalTime = events[events.length - 1]?.t || 0;

  // Build the full text display with word highlighting
  const { displayWords, currentWordIndex } = useWordsDisplay(
    replay.promptWords,
    currentText,
    events,
    eventIndex
  );

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying || eventIndex >= events.length - 1) {
      setIsPlaying(false);
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTickRef.current) {
        lastTickRef.current = timestamp;
      }

      const elapsed = timestamp - lastTickRef.current;
      const currentEvt = events[eventIndex];
      const nextEvt = events[eventIndex + 1];

      if (!currentEvt || !nextEvt) {
        setIsPlaying(false);
        return;
      }

      const timeDiff = nextEvt.t - currentEvt.t;
      const adjustedTimeDiff = timeDiff / playbackSpeed;

      if (elapsed >= adjustedTimeDiff) {
        lastTickRef.current = timestamp;
        setEventIndex((i) => {
          const next = i + 1;
          if (next >= events.length - 1) {
            setIsPlaying(false);
            return events.length - 1;
          }
          return next;
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTickRef.current = 0;
    };
  }, [isPlaying, eventIndex, events, playbackSpeed]);

  const handlePlayPause = () => {
    if (eventIndex >= events.length - 1) {
      setEventIndex(0);
      lastTickRef.current = 0;
    }
    setIsPlaying((p) => !p);
  };

  const handleRestart = () => {
    setEventIndex(0);
    setIsPlaying(false);
    lastTickRef.current = 0;
  };

  const handleSeek = (value: number[]) => {
    const newIndex = Math.floor((value[0] / 100) * (events.length - 1));
    setEventIndex(newIndex);
    setIsPlaying(false);
    lastTickRef.current = 0;
  };

  const handleStepBack = () => {
    setEventIndex((i) => Math.max(0, i - 1));
    setIsPlaying(false);
  };

  const handleStepForward = () => {
    setEventIndex((i) => Math.min(events.length - 1, i + 1));
    setIsPlaying(false);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === "ArrowLeft" || e.key === "j") {
        e.preventDefault();
        handleStepBack();
      } else if (e.key === "ArrowRight" || e.key === "l") {
        e.preventDefault();
        handleStepForward();
      } else if (e.key === "r") {
        e.preventDefault();
        handleRestart();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [eventIndex, events.length, isPlaying]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const progress = events.length > 1 ? (eventIndex / (events.length - 1)) * 100 : 0;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-2 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-w-5xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] overflow-y-auto">
        <Card className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
                {language === "bn" ? "রিপ্লে" : "Watch Replay"}
              </h2>
              <div className="text-xs sm:text-sm text-muted-foreground tabular-nums mt-1">
                {formatTime(currentTime)} / {formatTime(totalTime)}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          {/* Text Display Area - Monkeytype Style */}
          <div className="rounded-lg border border-border bg-card/30 p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 min-h-[160px] sm:min-h-[200px] md:min-h-[240px] relative overflow-hidden">
            <div 
              className="text-base sm:text-xl md:text-2xl leading-relaxed font-mono flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-1.5 sm:gap-y-2 transition-transform duration-300 ease-out"
              style={{
                transform: `translateY(${calculateScrollOffset(currentWordIndex, displayWords.length)}px)`
              }}
            >
              {displayWords.map((word, idx) => (
                <WordDisplay
                  key={idx}
                  word={word}
                  isActive={idx === currentWordIndex}
                />
              ))}
            </div>
          </div>

          {/* Progress Slider */}
          <div className="mb-4 sm:mb-6">
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-2">
              <span>{formatTime(currentTime)}</span>
              <span className="hidden sm:inline">
                {language === "bn" ? "ঘটনা" : "Event"} {eventIndex + 1} / {events.length}
              </span>
              <span>{formatTime(totalTime)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleStepBack}
              disabled={eventIndex === 0}
              title={language === "bn" ? "পিছনে (j/←)" : "Step back (j/←)"}
              className="shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              className="flex-1"
              onClick={handlePlayPause}
              disabled={events.length === 0}
              size="sm"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{language === "bn" ? "পজ (space/k)" : "Pause (space/k)"}</span>
                  <span className="sm:hidden">{language === "bn" ? "পজ" : "Pause"}</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{language === "bn" ? "প্লে (space/k)" : "Play (space/k)"}</span>
                  <span className="sm:hidden">{language === "bn" ? "প্লে" : "Play"}</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleStepForward}
              disabled={eventIndex >= events.length - 1}
              title={language === "bn" ? "এগিয়ে (l/→)" : "Step forward (l/→)"}
              className="shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              onClick={handleRestart}
              disabled={events.length === 0}
              title={language === "bn" ? "রিস্টার্ট (r)" : "Restart (r)"}
              size="sm"
              className="hidden sm:flex"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {language === "bn" ? "রিস্টার্ট" : "Restart"}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleRestart}
              disabled={events.length === 0}
              title={language === "bn" ? "রিস্টার্ট (r)" : "Restart (r)"}
              className="sm:hidden shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              {language === "bn" ? "গতি:" : "Speed:"}
            </span>
            <div className="flex gap-1 sm:gap-2 flex-1 overflow-x-auto">
              {[0.25, 0.5, 0.75, 1, 1.5, 2, 3].map((speed) => (
                <Button
                  key={speed}
                  variant={playbackSpeed === speed ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPlaybackSpeed(speed)}
                  className="flex-1 min-w-[44px] text-xs sm:text-sm px-2"
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="mt-4 p-2 sm:p-3 rounded-lg bg-muted/30 text-[10px] sm:text-xs text-muted-foreground">
            <div className="font-semibold mb-1">
              {language === "bn" ? "কীবোর্ড শর্টকাট:" : "Keyboard shortcuts:"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1 sm:gap-2">
              <div><kbd className="px-1 sm:px-1.5 py-0.5 rounded bg-background border text-[9px] sm:text-[10px]">space</kbd> / <kbd className="px-1 sm:px-1.5 py-0.5 rounded bg-background border text-[9px] sm:text-[10px]">k</kbd> play/pause</div>
              <div><kbd className="px-1 sm:px-1.5 py-0.5 rounded bg-background border text-[9px] sm:text-[10px]">←</kbd> / <kbd className="px-1 sm:px-1.5 py-0.5 rounded bg-background border text-[9px] sm:text-[10px]">j</kbd> step back</div>
              <div><kbd className="px-1 sm:px-1.5 py-0.5 rounded bg-background border text-[9px] sm:text-[10px]">→</kbd> / <kbd className="px-1 sm:px-1.5 py-0.5 rounded bg-background border text-[9px] sm:text-[10px]">l</kbd> step forward</div>
              <div><kbd className="px-1 sm:px-1.5 py-0.5 rounded bg-background border text-[9px] sm:text-[10px]">r</kbd> restart</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function useWordsDisplay(
  promptWords: string[],
  currentText: string,
  events: ReplayEvent[],
  eventIndex: number
) {
  const typedWords = currentText.split(" ");
  const currentWordIndex = typedWords.length - 1;

  const displayWords = promptWords.map((expectedWord, idx) => {
    const typedWord = typedWords[idx] || "";
    const chars = expectedWord.split("").map((expectedChar, charIdx) => {
      const typedChar = typedWord[charIdx];
      let status: "correct" | "incorrect" | "pending" = "pending";

      if (typedChar !== undefined) {
        if (typedChar === expectedChar) {
          status = "correct";
        } else {
          status = "incorrect";
        }
      }

      return { char: expectedChar, status, typed: typedChar };
    });

    // Handle extra characters
    const extraChars: Array<{ char: string; status: "correct" | "incorrect" | "pending"; typed: string }> = [];
    if (typedWord.length > expectedWord.length) {
      const extra = typedWord.slice(expectedWord.length);
      extra.split("").forEach((char) => {
        extraChars.push({ char, status: "incorrect", typed: char });
      });
    }

    return { expectedWord, typedWord, chars: [...chars, ...extraChars] };
  });

  return { displayWords, currentWordIndex };
}

function WordDisplay({
  word,
  isActive,
}: {
  word: ReturnType<typeof useWordsDisplay>["displayWords"][0];
  isActive: boolean;
}) {
  return (
    <span className={cn("inline-flex", isActive && "relative")}>
      {word.chars.map((char, idx) => (
        <span
          key={idx}
          className={cn(
            "inline-block",
            char.status === "correct" && "text-foreground",
            char.status === "incorrect" && "text-destructive",
            char.status === "pending" && "text-muted-foreground/40"
          )}
        >
          {char.char}
        </span>
      ))}
      {isActive && (
        <span className="inline-block w-[2px] h-[1.2em] bg-primary animate-pulse ml-[1px]" />
      )}
    </span>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  return `${seconds}.${Math.floor(milliseconds / 100)}s`;
}

function calculateScrollOffset(currentWordIndex: number, totalWords: number): number {
  // Keep the active word in view, scroll smoothly
  // Show ~3 lines at once, scroll by line height
  const wordsPerLine = 8; // approximate
  const lineHeight = 48; // approximate height of one line with leading-relaxed
  const currentLine = Math.floor(currentWordIndex / wordsPerLine);
  const linesToShow = 3;
  
  // Start scrolling when we're past the 2nd line
  if (currentLine <= 1) return 0;
  
  // Scroll up to keep current line in the middle
  const scrolledLines = currentLine - 1;
  return -scrolledLines * lineHeight;
}
