import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

 // Grapheme segmentation for complex scripts (e.g., Bengali)
 const splitGraphemes = useCallback((text: string) => {
   try {
     const locale = language === "bn" ? "bn" : "en";
     // @ts-ignore
     if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
       // @ts-ignore
       const seg = new (Intl as any).Segmenter(locale, { granularity: "grapheme" });
       const out: string[] = [];
       // @ts-ignore
       for (const s of seg.segment(text)) out.push(s.segment);
       return out;
     }
   } catch {}
   // Fallback handles surrogate pairs better than split("")
   return Array.from(text);
 }, [language]);

 const currentInputGraphemes = useMemo(() => splitGraphemes(currentInput), [currentInput, splitGraphemes]);

 const wordVariants = useMemo(() => ({
    initial: { opacity: 0, y: 6 },
    enter: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
  }), []);

  const charVariants = useMemo(() => ({
    typed: {
      scale: [1, 1.26, 1.1, 1],
      color: "hsl(var(--success))",
      transition: { duration: 0.22, times: [0, 0.35, 0.6, 1], ease: "easeOut" },
    },
    error: {
      x: [0, -3, 3, -2, 2, 0],
      color: "hsl(var(--destructive))",
      transition: { duration: 0.22, ease: "easeOut" },
    },
    idle: { scale: 1, color: "hsl(var(--foreground))" },
  }), []);

  return (
    <div
      ref={containerRef}
      className="w-full space-y-4"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="relative bg-card rounded-lg p-6 border border-card-border">
        <div className={cn("flex flex-wrap gap-2 sm:gap-3 justify-center text-lg sm:text-xl md:text-2xl leading-relaxed min-h-[48px] sm:min-h-[60px]") }>
          {words.slice(0, Math.min(currentWordIndex + 10, words.length)).map((word, index) => {
            const globalIndex = index;
            const isCurrentWord = globalIndex === currentWordIndex;
            const isCompleted = globalIndex < currentWordIndex;

            return (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={index}
                  className={cn(
                    "transition-all duration-200",
                    language === "bn" && "font-bengali",
                    isCompleted && "text-success/70",
                    isCurrentWord && "relative",
                    !isCurrentWord && !isCompleted && "text-muted-foreground/60"
                  )}
                  variants={wordVariants}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  layout
                >
                  {isCurrentWord ? (
                    <span className="relative">
                      {splitGraphemes(word).map((char, charIndex) => {
                        const isTyped = charIndex < currentInputGraphemes.length;
                        const typedChar = currentInputGraphemes[charIndex];
                        const isCharCorrect = typedChar === char;

                        return (
                          <motion.span
                            key={charIndex}
                            className={cn(
                              "inline-block transition-colors duration-75",
                              isTyped
                                ? isCharCorrect
                                  ? "text-success"
                                  : "text-destructive underline decoration-2"
                                : "text-foreground"
                            )}
                            variants={charVariants}
                            animate={isTyped ? (isCharCorrect ? "typed" : "error") : "idle"}
                            transition={{ duration: 0.06 }}
                          >
                            {char}
                          </motion.span>
                        );
                      })}
                      <motion.span
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
                        animate={{ scaleX: [1, 1.15, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </span>
                  ) : (
                    word
                  )}
                </motion.span>
              </AnimatePresence>
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
        <motion.input
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
            "w-full px-4 sm:px-6 py-3 sm:py-4 text-lg sm:text-xl md:text-2xl rounded-lg border-3 transition-all",
            "bg-background focus:outline-none focus:ring-0",
            language === "bn" && "font-bengali",
            !isCorrect && currentInput.length > 0
              ? "border-destructive"
              : "border-input focus:border-primary",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          data-testid="typing-input"
          animate={currentInput.length > 0 ? { boxShadow: "0 0 0 2px hsl(var(--ring)/.3)" } : { boxShadow: "0 0 0 0px transparent" }}
          whileFocus={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
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
