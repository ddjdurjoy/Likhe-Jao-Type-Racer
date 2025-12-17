import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/lib/stores/gameStore";

interface TypingInputProps {
  words: string[];
  currentWordIndex: number;
  currentInput: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
}

export function TypingInput({
  words,
  currentWordIndex,
  currentInput,
  onKeyDown,
  onChange,
  inputRef,
  disabled,
}: TypingInputProps) {
  const { language } = useGameStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled, inputRef]);

  const currentWord = words[currentWordIndex] || "";
  const isCorrect = currentWord.startsWith(currentInput);
  const completedPortion = currentInput.length;

  return (
    <div
      ref={containerRef}
      className="w-full space-y-4"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="relative bg-card rounded-lg p-6 border border-card-border">
        <div className="flex flex-wrap gap-2 justify-center text-xl md:text-2xl leading-relaxed min-h-[60px]">
          {words.slice(0, Math.min(currentWordIndex + 10, words.length)).map((word, index) => {
            const globalIndex = index;
            const isCurrentWord = globalIndex === currentWordIndex;
            const isCompleted = globalIndex < currentWordIndex;

            return (
              <span
                key={index}
                className={cn(
                  "transition-all duration-200",
                  language === "bn" && "font-bengali",
                  isCompleted && "text-success opacity-60",
                  isCurrentWord && "relative",
                  !isCurrentWord && !isCompleted && "text-muted-foreground opacity-50"
                )}
              >
                {isCurrentWord ? (
                  <span className="relative">
                    {word.split("").map((char, charIndex) => {
                      const isTyped = charIndex < currentInput.length;
                      const typedChar = currentInput[charIndex];
                      const isCharCorrect = typedChar === char;

                      return (
                        <span
                          key={charIndex}
                          className={cn(
                            "transition-colors duration-75",
                            isTyped
                              ? isCharCorrect
                                ? "text-success"
                                : "text-destructive underline decoration-2"
                              : "text-foreground"
                          )}
                        >
                          {char}
                        </span>
                      );
                    })}
                    <span
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary animate-pulse"
                    />
                  </span>
                ) : (
                  word
                )}
              </span>
            );
          })}

          {currentWordIndex + 10 < words.length && (
            <span className="text-muted-foreground opacity-30">...</span>
          )}
        </div>

        <div className="absolute top-2 right-2 text-xs text-muted-foreground">
          {currentWordIndex + 1} / {words.length}
        </div>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onKeyDown={onKeyDown}
          onChange={onChange}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          lang={language === "bn" ? "bn" : "en"}
          placeholder={language === "bn" ? "এখানে টাইপ করুন..." : "Type here..."}
          className={cn(
            "w-full px-6 py-4 text-xl md:text-2xl rounded-lg border-3 transition-all",
            "bg-background focus:outline-none focus:ring-0",
            language === "bn" && "font-bengali",
            !isCorrect && currentInput.length > 0
              ? "border-destructive animate-shake"
              : "border-input focus:border-primary",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          data-testid="typing-input"
        />

        {currentInput.length > 0 && (
          <div
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-colors",
              isCorrect ? "bg-success" : "bg-destructive"
            )}
          />
        )}
      </div>
    </div>
  );
}
